import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2, Check, X, Clock } from "lucide-react";
import { useFollows } from "@/hooks/useFollows";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatShortDate } from "@/lib/formatDate";

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
}

/**
 * Connection workflow:
 * - Student → Student: requires approval (pending → accepted on accept).
 * - Employer → Student (or any non-student follower): one-tap follow (instant accepted).
 *   Approval flow only applies between two students.
 */
const FollowButton = ({ targetUserId, className }: FollowButtonProps) => {
  const { user, role } = useAuth();
  const {
    state,
    sendRequest,
    cancelOrUnfollow,
    acceptIncoming,
    rejectIncoming,
    requestSentAt,
    requestReceivedAt,
    connectedAt,
  } = useFollows(targetUserId);

  if (!user || user.id === targetUserId) return null;

  const isStudent = role === "student";
  const requireApproval = isStudent; // student-initiated → needs approval
  const loading =
    sendRequest.isPending ||
    cancelOrUnfollow.isPending ||
    acceptIncoming.isPending ||
    rejectIncoming.isPending;

  // Incoming pending request — show Accept / Reject
  if (state === "pending_incoming") {
    return (
      <div className={`flex gap-2 ${className ?? ""}`}>
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
    );
  }

  // Outgoing pending — show "Request Sent" with cancel
  if (state === "pending_outgoing") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        className={`gap-2 ${className ?? ""}`}
        onClick={() =>
          cancelOrUnfollow.mutate(undefined, {
            onSuccess: () => toast("Request cancelled"),
            onError: (e: any) => toast.error(e.message || "Could not cancel"),
          })
        }
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
        Request Sent
      </Button>
    );
  }

  // Accepted — show Connected / Unfollow
  if (state === "accepted") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        className={`gap-2 ${className ?? ""}`}
        onClick={() =>
          cancelOrUnfollow.mutate(undefined, {
            onSuccess: () => toast(isStudent ? "Disconnected" : "Unfollowed"),
            onError: (e: any) => toast.error(e.message || "Could not update"),
          })
        }
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
        {isStudent ? "Connected" : "Unfollow"}
      </Button>
    );
  }

  // None — Connect (student) or Follow (other)
  return (
    <Button
      size="sm"
      disabled={loading}
      className={`gap-2 ${className ?? ""}`}
      onClick={() =>
        sendRequest.mutate(
          { requireApproval },
          {
            onSuccess: () =>
              toast.success(requireApproval ? "Request sent" : "Following"),
            onError: (e: any) => toast.error(e.message || "Could not send request"),
          }
        )
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      {isStudent ? "Connect" : "Follow"}
    </Button>
  );
};

export default FollowButton;
