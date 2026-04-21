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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppRole = "student" | "employer" | "admin";

interface UserRow {
  user_id: string;
  full_name: string | null;
  created_at: string;
  role: AppRole | "unknown";
}

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
  const [pendingChange, setPendingChange] = useState<PendingRoleChange | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // ISSUE-07: Limit rows to prevent OOM on large user bases.
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_roles").select("user_id, role").limit(500),
    ]);

    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
    const mapped: UserRow[] = (profiles || []).map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      created_at: p.created_at,
      role: (roleMap.get(p.user_id) as AppRole) || "unknown",
    }));
    setUsers(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ISSUE-05: Confirm role change before applying.
  const confirmRoleChange = async () => {
    if (!pendingChange || !currentUser) return;
    setSaving(true);
    const { user: target, newRole } = pendingChange;

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", target.user_id);

    if (error) {
      toast({ title: "Role update failed", description: error.message, variant: "destructive" });
    } else {
      setUsers((prev) =>
        prev.map((u) => u.user_id === target.user_id ? { ...u, role: newRole } : u)
      );
      toast({ title: "Role updated", description: `${target.full_name || target.user_id.slice(0, 8)} → ${newRole}` });

      // ISSUE-08: Non-blocking audit log.
      supabase.from("audit_log").insert({
        action: "role_change",
        admin_id: currentUser.id,
        target_id: target.user_id,
        target_type: "user",
        details: { from: target.role, to: newRole } as any,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn("audit_log write failed:", auditErr.message);
      });
    }

    setSaving(false);
    setPendingChange(null);
  };

  const filtered = users.filter(
    (u) =>
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      u.user_id.toLowerCase().includes(search.toLowerCase())
  );

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
      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left font-medium">Name</th>
                  {/* ISSUE-06: Show truncated user_id — email not accessible via anon key. */}
                  <th className="p-4 text-left font-medium">User ID</th>
                  <th className="p-4 text-left font-medium">Role</th>
                  <th className="p-4 text-left font-medium">Joined</th>
                  <th className="p-4 text-left font-medium">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                ) : (
                  filtered.map((u) => {
                    const isSelf = u.user_id === currentUser?.id;
                    return (
                      <tr key={u.user_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{u.full_name || "—"}</td>
                        <td className="p-4">
                          <span
                            className="font-mono text-xs text-muted-foreground"
                            title={u.user_id}
                          >
                            {u.user_id.slice(0, 8)}…
                          </span>
                        </td>
                        <td className="p-4"><Badge variant={roleBadgeVariant(u.role)}>{u.role}</Badge></td>
                        <td className="p-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          {/* ISSUE-05: Admin cannot change their own role. */}
                          {isSelf ? (
                            <span className="text-xs text-muted-foreground italic">Your account</span>
                          ) : (
                            <Select
                              value={u.role === "unknown" ? undefined : u.role}
                              onValueChange={(v) => setPendingChange({ user: u, newRole: v as AppRole })}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs">
                                <SelectValue placeholder="Set role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="employer">Employer</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
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

      {/* ISSUE-05: Confirmation dialog for role change. */}
      <Dialog open={!!pendingChange} onOpenChange={() => setPendingChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change <strong>{pendingChange?.user.full_name || pendingChange?.user.user_id.slice(0, 8)}</strong>'s
              role from <strong>{pendingChange?.user.role}</strong> to <strong>{pendingChange?.newRole}</strong>?
              This affects what they can access on the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingChange(null)}>Cancel</Button>
            <Button onClick={confirmRoleChange} disabled={saving}>
              {saving ? "Saving…" : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
