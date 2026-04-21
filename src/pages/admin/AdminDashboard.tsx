import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["hsl(243, 75%, 59%)", "hsl(160, 60%, 45%)", "hsl(30, 90%, 55%)", "hsl(0, 70%, 55%)"];

const AdminDashboard = () => {
  const [stats, setStats] = useState({ students: 0, employers: 0, admins: 0, totalInternships: 0, totalApplications: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // ISSUE-07: Use count-only queries — avoids loading all user_roles rows into the browser.
  // ISSUE-04: Check each query for errors and surface them rather than silently showing zeros.
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [studentsRes, employersRes, adminsRes, internsRes, appsRes] = await Promise.all([
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "employer"),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin"),
      supabase.from("internships").select("*", { count: "exact", head: true }),
      supabase.from("applications").select("*", { count: "exact", head: true }),
    ]);

    const failed = [studentsRes, employersRes, adminsRes, internsRes, appsRes].find((r) => r.error);
    if (failed?.error) {
      const msg = failed.error.message;
      setError(msg);
      toast({ title: "Failed to load dashboard data", description: msg, variant: "destructive" });
      setLoading(false);
      return;
    }

    setStats({
      students: studentsRes.count ?? 0,
      employers: employersRes.count ?? 0,
      admins: adminsRes.count ?? 0,
      totalInternships: internsRes.count ?? 0,
      totalApplications: appsRes.count ?? 0,
    });
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const barData = [
    { name: "Students", count: stats.students },
    { name: "Employers", count: stats.employers },
    { name: "Internships", count: stats.totalInternships },
    { name: "Applications", count: stats.totalApplications },
  ];

  const pieData = [
    { name: "Students", value: stats.students },
    { name: "Employers", value: stats.employers },
    { name: "Admins", value: stats.admins },
  ].filter((d) => d.value > 0);

  if (loading) return <AdminLayout title="Dashboard"><Skeleton className="h-96" /></AdminLayout>;

  // ISSUE-04: Show error state with retry instead of silently showing zeros.
  if (error) return (
    <AdminLayout title="Dashboard">
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive/60" />
        <p className="text-lg font-semibold">Failed to load dashboard data</p>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <Button onClick={fetchStats} variant="outline">Retry</Button>
      </div>
    </AdminLayout>
  );

  const statCards = [
    { label: "Students", value: stats.students, icon: Users, color: "text-blue-500" },
    { label: "Employers", value: stats.employers, icon: Briefcase, color: "text-emerald-500" },
    { label: "Internships", value: stats.totalInternships, icon: TrendingUp, color: "text-orange-500" },
    { label: "Applications", value: stats.totalApplications, icon: FileText, color: "text-rose-500" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Platform Overview</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>User Distribution</CardTitle></CardHeader>
          <CardContent>
            {/* ISSUE-13: Show empty state instead of a blank chart when no users exist. */}
            {pieData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No users yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
