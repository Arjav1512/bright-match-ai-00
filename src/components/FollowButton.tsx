import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2, Check, X, Clock } from "lucide-react";
import { useFollows, type FollowTargetRole } from "@/hooks/useFollows";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatShortDate } from "@/lib/formatDate";

interface FollowButtonProps {
  targetUserId: string;
  targetRole?: FollowTargetRole;
  className?: string;
}

/**
 * Connection workflow (target-role driven):
 * - Student → Student: requires approval (Connect → Requested → Connected).
 * - Anything else (student → employer, employer → student, employer → employer):
 *   one-tap follow (Follow → Following). Auto-accepted by the DB trigger.
 */
const FollowButton = ({ targetUserId, targetRole, className }: FollowButtonProps) => {
  const { user } = useAuth();
  const {
    state,
    sendRequest,
    cancelOrUnfollow,
    acceptIncoming,
    rejectIncoming,
    requestSentAt,
    requestReceivedAt,
    connectedAt,
    targetRole: resolvedTargetRole,
    requireApproval,
  } = useFollows(targetUserId, targetRole ? { targetRole } : undefined);

  if (!user || user.id === targetUserId) return null;

  // Use the explicit prop, falling back to the resolved role from the hook.
  const effectiveTargetRole = targetRole ?? resolvedTargetRole;
  // "Peer" = student↔student, the only relation that uses Connect/Connected copy.
  const isPeer = requireApproval || effectiveTargetRole === null ? requireApproval : false;
  // Copy table
  const connectLabel = isPeer ? "Connect" : "Follow";
  const connectedLabel = isPeer ? "Connected" : "Following";
  const sinceLabel = isPeer ? "Connected since" : "Following since";
  const disconnectToast = isPeer ? "Disconnected" : "Unfollowed";
  const sendToast = isPeer ? "Request sent" : "Following";

  const loading =
    sendRequest.isPending ||
    cancelOrUnfollow.isPending ||
    acceptIncoming.isPending ||
    rejectIncoming.isPending;

  // Incoming pending request — only possible student↔student.
  if (state === "pending_incoming") {
    const received = formatShortDate(requestReceivedAt);
    return (
      <div className={`flex flex-col items-end gap-1 ${className ?? ""}`}>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={loading}
            onClick={() =>
              acceptIncoming.mutate(undefined, {
                onSuccess: () => toast.success("Connection accepted"),
                onError: (e: any) => toast.error(e.message || "Could not accept"),
              })
            }
            className="gap-2"
            title={received ? `Received ${received}` : undefined}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() =>
              rejectIncoming.mutate(undefined, {
                onSuccess: () => toast("Request rejected"),
                onError: (e: any) => toast.error(e.message || "Could not reject"),
              })
            }
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
        {received && (
          <span className="text-[10px] text-muted-foreground">Received {received}</span>
        )}
      </div>
    );
  }

  // Outgoing pending — only possible student↔student.
  if (state === "pending_outgoing") {
    const sent = formatShortDate(requestSentAt);
    return (
      <div className={`flex flex-col items-end gap-1 ${className ?? ""}`}>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-2"
          title={sent ? `Sent ${sent}` : undefined}
          onClick={() =>
            cancelOrUnfollow.mutate(undefined, {
              onSuccess: () => toast("Request cancelled"),
              onError: (e: any) => toast.error(e.message || "Could not cancel"),
            })
          }
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
          Requested
        </Button>
        {sent && (
          <span className="text-[10px] text-muted-foreground">Sent {sent}</span>
        )}
      </div>
    );
  }

  // Accepted — Connected/Following depending on target role.
  if (state === "accepted") {
    const since = formatShortDate(connectedAt);
    return (
      <div className={`flex flex-col items-end gap-1 ${className ?? ""}`}>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-2"
          title={since ? `${sinceLabel} ${since}` : undefined}
          onClick={() =>
            cancelOrUnfollow.mutate(undefined, {
              onSuccess: () => toast(disconnectToast),
              onError: (e: any) => toast.error(e.message || "Could not update"),
            })
          }
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
          {connectedLabel}
        </Button>
        {since && (
          <span className="text-[10px] text-muted-foreground">{sinceLabel} {since}</span>
        )}
      </div>
    );
  }

  // None — Connect (peer) or Follow (everything else).
  return (
    <Button
      size="sm"
      disabled={loading}
      className={`gap-2 ${className ?? ""}`}
      onClick={() =>
        sendRequest.mutate(undefined, {
          onSuccess: () => toast.success(sendToast),
          onError: (e: any) => toast.error(e.message || "Could not send request"),
        })
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      {connectLabel}
    </Button>
  );
};

export default FollowButton;
