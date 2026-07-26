import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProfileLink from "@/components/ProfileLink";

type AppRole = "student" | "employer" | "admin";
type RoleFilter = "all" | AppRole | "unknown";
type StatusFilter = "all" | "completed" | "in_progress" | "not_started" | "unknown";
type ActiveFilter = "all" | "24h" | "7d" | "30d" | "never";

interface UserRow {
  user_id: string;
  full_name: string | null;
  created_at: string;
  role: AppRole | "unknown";
  email: string | null;
  phone: string | null;
  onboarding_status: string | null;
  onboarding_step: number | null;
  has_profile_row?: boolean;
  last_sign_in_at: string | null;
}

// P1-6: Derive admin-facing onboarding label from raw (status, step, role).
// DB values are unchanged; this is presentation only.
type OnboardingDisplay = {
  label: string;
  variant: "default" | "outline" | "secondary";
};

const ONBOARDING_TOTAL_STEPS: Record<AppRole | "unknown", number> = {
  student: 4,
  employer: 6,
  admin: 0,
  unknown: 0,
};

const getOnboardingDisplay = (u: UserRow): OnboardingDisplay => {
  // No role-specific profile row (admins, users mid-role-selection)
  if (!u.onboarding_status && u.has_profile_row !== true) {
    return { label: "No Profile", variant: "outline" };
  }
  if (u.onboarding_status === "completed") {
    return { label: "Completed", variant: "default" };
  }
  if (u.onboarding_status === "pending") {
    const step = u.onboarding_step ?? 1;
    if (step <= 1) return { label: "Not Started", variant: "outline" };
    const total = ONBOARDING_TOTAL_STEPS[u.role] || 0;
    return {
      label: total ? `In Progress (Step ${step}/${total})` : `In Progress (Step ${step})`,
      variant: "secondary",
    };
  }
  return { label: u.onboarding_status || "—", variant: "outline" };
};


interface PendingRoleChange {
  user: UserRow;
  newRole: AppRole;
}

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [pendingChange, setPendingChange] = useState<PendingRoleChange | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-list-users");
    if (error || !data?.users) {
      toast({ title: "Failed to load users", description: error?.message, variant: "destructive" });
      setUsers([]);
    } else {
      setUsers(data.users as UserRow[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);


  // Role changes intentionally not available in the admin UI: no backing
  // authorization policy exists on user_roles. Removed to eliminate dead
  // code that would silently accumulate risk if a permissive policy were
  // ever added. Reassign roles via a dedicated SECURITY DEFINER RPC.


  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (u.full_name || "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (roleFilter !== "all" && u.role !== roleFilter) return false;

    if (statusFilter !== "all") {
      // Filter on raw (status, step) — no DB values changed.
      const hasRow = u.has_profile_row === true || !!u.onboarding_status;
      const step = u.onboarding_step ?? 1;
      if (statusFilter === "unknown") {
        if (hasRow) return false;
      } else if (statusFilter === "completed") {
        if (u.onboarding_status !== "completed") return false;
      } else if (statusFilter === "not_started") {
        if (!(u.onboarding_status === "pending" && step <= 1)) return false;
      } else if (statusFilter === "in_progress") {
        if (!(u.onboarding_status === "pending" && step > 1)) return false;
      }
    }


    if (activeFilter !== "all") {
      if (activeFilter === "never") {
        if (u.last_sign_in_at) return false;
      } else {
        if (!u.last_sign_in_at) return false;
        const ms = Date.now() - new Date(u.last_sign_in_at).getTime();
        const limit =
          activeFilter === "24h" ? 86400000 :
          activeFilter === "7d" ? 7 * 86400000 :
          30 * 86400000;
        if (ms > limit) return false;
      }
    }
    return true;
  });

  const formatLastActive = (iso: string | null) => {
    if (!iso) return "Never";
    const ms = Date.now() - new Date(iso).getTime();
    const days = Math.floor(ms / 86400000);
    if (days === 0) {
      const hrs = Math.floor(ms / 3600000);
      if (hrs === 0) return "Just now";
      return `${hrs}h ago`;
    }
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  };


  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "employer": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  if (loading) return <AdminLayout title="Users"><Skeleton className="h-96" /></AdminLayout>;

  return (
    <AdminLayout title="Users">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="employer">Employer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Onboarding" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All onboarding states</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="unknown">No Profile</SelectItem>
          </SelectContent>
        </Select>


        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as ActiveFilter)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Last active" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="never">Never signed in</SelectItem>
          </SelectContent>
        </Select>

        {(roleFilter !== "all" || statusFilter !== "all" || activeFilter !== "all" || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); setActiveFilter("all"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left font-medium">Name</th>
                  <th className="p-4 text-left font-medium">Email</th>
                  <th className="p-4 text-left font-medium">Phone</th>
                  <th className="p-4 text-left font-medium">Role</th>
                  <th className="p-4 text-left font-medium">Status</th>
                  <th className="p-4 text-left font-medium">Last Active</th>
                  <th className="p-4 text-left font-medium">Joined</th>
                  <th className="p-4 text-left font-medium">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                ) : (
                  filtered.map((u) => {
                    const isSelf = u.user_id === currentUser?.id;
                    return (
                      <tr key={u.user_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">
                          {u.role === "student" || u.role === "employer" ? (
                            <ProfileLink userId={u.user_id} type={u.role}>
                              {u.full_name || "—"}
                            </ProfileLink>
                          ) : (
                            u.full_name || "—"
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground text-xs break-all">{u.email || "—"}</td>
                        <td className="p-4 text-muted-foreground text-xs">{u.phone || "—"}</td>

                        <td className="p-4"><Badge variant={roleBadgeVariant(u.role)}>{u.role}</Badge></td>
                        <td className="p-4">
                          {(() => {
                            const d = getOnboardingDisplay(u);
                            return (
                              <Badge variant={d.variant} className="text-xs whitespace-nowrap">
                                {d.label}
                              </Badge>
                            );
                          })()}
                        </td>

                        <td className="p-4 text-muted-foreground text-xs">{formatLastActive(u.last_sign_in_at)}</td>
                        <td className="p-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className="text-xs text-muted-foreground italic">
                            {isSelf ? "Your account" : "—"}
                          </span>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>

    </AdminLayout>
  );
};

export default AdminUsers;
