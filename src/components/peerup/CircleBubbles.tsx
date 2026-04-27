import { PeerUpCircle } from "@/hooks/usePeerUpCircles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CircleBubblesProps {
  circles: PeerUpCircle[];
  onSelect: (circle: PeerUpCircle) => void;
  onCreateNew: () => void;
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "W";

const getColor = (index: number) => {
  const colors = [
    "border-orange-500 text-orange-500",
    "border-emerald-500 text-emerald-500",
    "border-indigo-400 text-indigo-400",
    "border-amber-500 text-amber-500",
    "border-pink-500 text-pink-500",
    "border-cyan-500 text-cyan-500",
  ];
  return colors[index % colors.length];
};

const CircleBubble = ({ circle, index, onSelect }: { circle: PeerUpCircle; index: number; onSelect: (c: PeerUpCircle) => void }) => (
  <button
    onClick={() => onSelect(circle)}
    className="flex flex-col items-center gap-1.5 min-w-[72px] group"
  >
    <div className={`relative rounded-full p-[2px] bg-gradient-to-br ${
      circle.is_participant
        ? "from-emerald-400 to-emerald-600"
        : circle.my_request_status === "pending"
        ? "from-amber-400 to-amber-600"
        : "from-primary/60 to-primary"
    }`}>
      <Avatar className="h-16 w-16 border-2 border-background transition-transform group-hover:scale-105">
        <AvatarImage src={circle.creator_avatar || undefined} />
        <AvatarFallback className={`bg-transparent font-semibold text-sm ${getColor(index)}`}>
          {getInitials(circle.creator_name || circle.spot_name)}
        </AvatarFallback>
      </Avatar>
    </div>
    <span className="text-[11px] text-muted-foreground truncate max-w-[72px] font-medium">
      {circle.creator_name?.split(" ")[0] || circle.spot_name}
    </span>
    <span className="text-[9px] text-muted-foreground/60">
      {formatDistanceToNow(new Date(circle.created_at), { addSuffix: true })}
    </span>
  </button>
);

const CircleBubbles = ({ circles, onSelect, onCreateNew }: CircleBubblesProps) => {
  const { user } = useAuth();

  const myCircles = circles.filter((c) => c.creator_id === user?.id);
  const otherCircles = circles.filter((c) => c.creator_id !== user?.id);

  return (
    <div className="space-y-6">
      {/* Prominent Create Community CTA */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full brand-gradient flex items-center justify-center shrink-0">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Create a Community</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Start a Wroob Circle and invite peers to join.
              </p>
            </div>
          </div>
          <button
            onClick={onCreateNew}
            className="brand-gradient text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-sm hover:opacity-90 transition-opacity"
          >
            + New Community
          </button>
        </div>

        {/* Your circles inline */}
        {myCircles.length > 0 && (
          <div className="mt-5 pt-4 border-t border-primary/10">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Circles</p>
            <div className="flex items-center gap-5 overflow-x-auto pb-1 scrollbar-hide">
              {myCircles.map((circle, i) => (
                <CircleBubble key={circle.id} circle={circle} index={i} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Communities by other users */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-semibold text-base">Explore Communities</h3>
          <span className="text-xs text-muted-foreground">
            {otherCircles.length} {otherCircles.length === 1 ? "circle" : "circles"}
          </span>
        </div>
        {otherCircles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-muted-foreground/20 py-10 text-center">
            <p className="text-sm text-muted-foreground">No communities from others yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Be the first — create one above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
            {otherCircles.map((circle, i) => (
              <CircleBubble key={circle.id} circle={circle} index={i + myCircles.length} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CircleBubbles;
