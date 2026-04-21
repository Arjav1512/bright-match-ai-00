import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shield, Globe, Bell, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sending, setSending] = useState(false);
  // ISSUE-09: Cooldown to prevent accidental double-sends.
  const [recentlySent, setRecentlySent] = useState(false);

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast({ title: "Both title and message are required", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-broadcast", {
        body: { title: broadcastTitle.trim(), message: broadcastMessage.trim() },
      });

      if (error) throw error;

      toast({ title: "Broadcast sent!", description: `Notified ${data?.notified || 0} users.` });

      // ISSUE-08: Non-blocking audit log.
      if (currentUser) {
        supabase.from("audit_log").insert({
          action: "broadcast_sent",
          admin_id: currentUser.id,
          target_id: currentUser.id,
          target_type: "platform",
          details: { title: broadcastTitle.trim(), recipient_count: data?.notified || 0 } as any,
        }).then(({ error: auditErr }) => {
          if (auditErr) console.warn("audit_log write failed:", auditErr.message);
        });
      }

      setBroadcastTitle("");
      setBroadcastMessage("");

      // ISSUE-09: 5s cooldown after a successful send.
      setRecentlySent(true);
      setTimeout(() => setRecentlySent(false), 5000);
    } catch (err: any) {
      toast({ title: "Failed to send broadcast", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  // ISSUE-12: Derive environment from Vite's build mode instead of hardcoding.
  const envLabel = import.meta.env.MODE === "production" ? "Production" : import.meta.env.MODE === "staging" ? "Staging" : "Development";
  const envVariant = import.meta.env.MODE === "production" ? "destructive" as const : "secondary" as const;

  return (
    <AdminLayout title="Settings">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Security</CardTitle>
            <CardDescription>Authentication and access control settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Role-based access</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">RLS policies</span>
              <Badge variant="default">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Email verification</span>
              <Badge variant="default">Required</Badge>
            </div>
          </CardContent>
        </Card>

        {/* ISSUE-11: Removed the Database stat card — the counts were hardcoded
            and would silently drift out of date with schema changes. */}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Platform</CardTitle>
            <CardDescription>General platform settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              <Badge variant="default">Live</Badge>
            </div>
            {/* ISSUE-12: Use import.meta.env.MODE instead of hardcoded "Development". */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Environment</span>
              <Badge variant={envVariant}>{envLabel}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Broadcast Message</CardTitle>
            <CardDescription>Send a notification to all users on the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g., Platform Update"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Write your message to all users..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                maxLength={2000}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{broadcastMessage.length}/2000</p>
            </div>
            {/* ISSUE-09: Disable for 5s after send to prevent double-sends. */}
            <Button
              onClick={handleBroadcast}
              disabled={sending || recentlySent || !broadcastTitle.trim() || !broadcastMessage.trim()}
              className="w-full gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : recentlySent ? "Sent — please wait…" : "Send to All Users"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
