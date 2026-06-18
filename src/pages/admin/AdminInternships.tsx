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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Factory, ShieldOff, RotateCcw } from "lucide-react";

type InternshipStatus = "draft" | "published" | "closed" | "removed";

interface PendingStatusChange {
  id: string;
  title: string;
  currentStatus: InternshipStatus;
  newStatus: InternshipStatus;
}

interface PendingRemoval {
  id: string;
  title: string;
  currentStatus: InternshipStatus;
}

interface PendingRestore {
  id: string;
  title: string;
  previousStatus: InternshipStatus | null;
}

const AdminInternships = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
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

  const writeAudit = (action: string, id: string, details: Record<string, any>) => {
    if (!currentUser) return;
    supabase.from("audit_log").insert({
      action,
      admin_id: currentUser.id,
      target_id: id,
      target_type: "internship",
      details: details as any,
    }).then(({ error }) => {
      if (error) console.warn("audit_log write failed:", error.message);
    });
  };

  const applyStatusChange = async () => {
    if (!pendingStatusChange) return;
    const { id, newStatus, currentStatus } = pendingStatusChange;
    setSaving(true);
    const { error } = await supabase.from("internships").update({ status: newStatus } as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setInternships((prev) => prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)));
      toast({ title: `Status updated to ${newStatus}` });
      writeAudit("internship_status_change", id, { from: currentStatus, to: newStatus });
    }
    setSaving(false);
    setPendingStatusChange(null);
  };

  const applyRemoval = async () => {
    if (!pendingRemoval) return;
    const reason = removalReason.trim();
    if (reason.length < 3) {
      toast({ title: "Reason required", description: "Please provide a brief reason (3+ chars).", variant: "destructive" });
      return;
    }
    const { id, currentStatus } = pendingRemoval;
    setSaving(true);
    const { error } = await supabase
      .from("internships")
      .update({
        status: "removed" as any,
        removed_at: new Date().toISOString(),
        removed_by: currentUser?.id ?? null,
        removal_reason: reason,
        previous_status: currentStatus,
      } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setInternships((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: "removed", removed_at: new Date().toISOString(), removed_by: currentUser?.id, removal_reason: reason, previous_status: currentStatus }
            : i
        )
      );
      toast({ title: "Internship removed" });
      writeAudit("internship_removed", id, { from: currentStatus, reason });
    }
    setSaving(false);
    setPendingRemoval(null);
    setRemovalReason("");
  };

  const applyRestore = async () => {
    if (!pendingRestore) return;
    const restoreTo = (pendingRestore.previousStatus ?? "draft") as InternshipStatus;
    setSaving(true);
    const { error } = await supabase
      .from("internships")
      .update({
        status: restoreTo,
        removed_at: null,
        removed_by: null,
        removal_reason: null,
        previous_status: null,
      } as any)
      .eq("id", pendingRestore.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setInternships((prev) =>
        prev.map((i) =>
          i.id === pendingRestore.id
            ? { ...i, status: restoreTo, removed_at: null, removed_by: null, removal_reason: null, previous_status: null }
            : i
        )
      );
      toast({ title: `Internship restored to ${restoreTo}` });
      writeAudit("internship_restored", pendingRestore.id, { to: restoreTo });
    }
    setSaving(false);
    setPendingRestore(null);
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
      case "removed": return "destructive" as const;
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
          filtered.map((i) => {
            const isRemoved = i.status === "removed";
            return (
              <Card key={i.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{i.title}</h4>
                      <Badge variant={statusColor(i.status)}>{i.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {i.company_name} • {i.application_count ?? 0} applications
                      {i.location && <span> • {i.location}</span>}
                      {i.industry && <span> • {i.industry}</span>}
                    </p>
                    {isRemoved && (
                      <p className="mt-1 text-xs text-destructive">
                        Removed{i.removal_reason ? `: ${i.removal_reason}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isRemoved && (
                      <Select
                        value={i.status}
                        onValueChange={(v: InternshipStatus) =>
                          setPendingStatusChange({ id: i.id, title: i.title, currentStatus: i.status, newStatus: v })
                        }
                      >
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {!isRemoved ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setRemovalReason("");
                          setPendingRemoval({ id: i.id, title: i.title, currentStatus: i.status });
                        }}
                      >
                        <ShieldOff className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPendingRestore({ id: i.id, title: i.title, previousStatus: i.previous_status ?? null })
                        }
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{filtered.length} internship{filtered.length !== 1 ? "s" : ""}</p>

      {/* Status change confirmation */}
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
            <Button onClick={applyStatusChange} disabled={saving}>{saving ? "Saving…" : "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Removal dialog */}
      <Dialog
        open={!!pendingRemoval}
        onOpenChange={(open) => {
          if (!open) { setPendingRemoval(null); setRemovalReason(""); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Internship</DialogTitle>
            <DialogDescription>
              <strong>{pendingRemoval?.title}</strong> will be hidden from students, discovery,
              and recommendations. Applications and feedback are preserved. The employer will be
              notified. You can restore it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Removal reason</label>
            <Textarea
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="Why is this internship being removed? (visible to the employer)"
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingRemoval(null); setRemovalReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={applyRemoval} disabled={saving}>
              {saving ? "Removing…" : "Remove Internship"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirmation */}
      <Dialog open={!!pendingRestore} onOpenChange={() => setPendingRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Internship</DialogTitle>
            <DialogDescription>
              Restore <strong>{pendingRestore?.title}</strong> to{" "}
              <strong>{pendingRestore?.previousStatus ?? "draft"}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRestore(null)}>Cancel</Button>
            <Button onClick={applyRestore} disabled={saving}>{saving ? "Restoring…" : "Restore"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminInternships;
