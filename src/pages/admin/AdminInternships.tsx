import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Factory } from "lucide-react";

type InternshipStatus = "draft" | "published" | "closed";

interface PendingStatusChange {
  id: string;
  title: string;
  currentStatus: InternshipStatus;
  newStatus: InternshipStatus;
}

const AdminInternships = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  // ISSUE-03: Stage status changes here; only apply after confirmation.
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: internData } = await supabase
        .from("internships")
        .select("*")
        .order("created_at", { ascending: false });

      if (!internData) {
        setLoading(false);
        return;
      }

      const employerIds = [...new Set(internData.map((i) => i.employer_id))];
      const { data: employers } = await supabase
        .from("employer_profiles")
        .select("user_id, company_name")
        .in("user_id", employerIds);

      const employerMap = new Map((employers || []).map((e) => [e.user_id, e.company_name]));

      setInternships(internData.map((i) => ({
        ...i,
        company_name: employerMap.get(i.employer_id) || "Unknown",
      })));
      setLoading(false);
    };
    fetchData();
  }, []);

  const { industries, locations } = useMemo(() => {
    const indSet = new Set<string>();
    const locSet = new Set<string>();
    internships.forEach((i) => {
      if (i.industry) indSet.add(i.industry);
      if (i.location) locSet.add(i.location);
    });
    return { industries: [...indSet].sort(), locations: [...locSet].sort() };
  }, [internships]);

  const applyStatusChange = async () => {
    if (!pendingStatusChange) return;
    const { id, newStatus, currentStatus } = pendingStatusChange;
    setSaving(true);

    const { error } = await supabase.from("internships").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setInternships((prev) => prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)));
      toast({ title: `Status updated to ${newStatus}` });

      // ISSUE-08: Non-blocking audit log.
      if (currentUser) {
        supabase.from("audit_log").insert({
          action: "internship_status_change",
          admin_id: currentUser.id,
          target_id: id,
          target_type: "internship",
          details: { from: currentStatus, to: newStatus } as any,
        }).then(({ error: auditErr }) => {
          if (auditErr) console.warn("audit_log write failed:", auditErr.message);
        });
      }
    }

    setSaving(false);
    setPendingStatusChange(null);
  };

  const filtered = internships.filter((i) => {
    const matchesSearch =
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.company_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesIndustry = industryFilter === "all" || i.industry === industryFilter;
    const matchesLocation = locationFilter === "all" || i.location === locationFilter;
    return matchesSearch && matchesIndustry && matchesLocation;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "published": return "default" as const;
      case "closed": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  if (loading) return <AdminLayout title="Internships"><Skeleton className="h-96" /></AdminLayout>;

  return (
    <AdminLayout title="Internships">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search internships..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-44">
            <Factory className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-44">
            <MapPin className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((loc) => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No internships found</CardContent></Card>
        ) : (
          filtered.map((i) => (
            <Card key={i.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{i.title}</h4>
                    <Badge variant={statusColor(i.status)}>{i.status}</Badge>
                  </div>
                  {/* ISSUE-10: Use ?? 0 — application_count may be null. */}
                  <p className="text-sm text-muted-foreground">
                    {i.company_name} • {i.application_count ?? 0} applications
                    {i.location && <span> • {i.location}</span>}
                    {i.industry && <span> • {i.industry}</span>}
                  </p>
                </div>
                {/* ISSUE-03: Stage change, don't fire immediately. */}
                <Select
                  value={i.status}
                  onValueChange={(v: InternshipStatus) =>
                    setPendingStatusChange({ id: i.id, title: i.title, currentStatus: i.status, newStatus: v })
                  }
                >
                  <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{filtered.length} internship{filtered.length !== 1 ? "s" : ""}</p>

      {/* ISSUE-03: Confirmation dialog before applying status change. */}
      <Dialog open={!!pendingStatusChange} onOpenChange={() => setPendingStatusChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Internship Status</DialogTitle>
            <DialogDescription>
              Change <strong>{pendingStatusChange?.title}</strong> from{" "}
              <strong>{pendingStatusChange?.currentStatus}</strong> to{" "}
              <strong>{pendingStatusChange?.newStatus}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatusChange(null)}>Cancel</Button>
            <Button onClick={applyStatusChange} disabled={saving}>
              {saving ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminInternships;
