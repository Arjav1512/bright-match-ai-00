import { Progress } from "@/components/ui/progress";

interface Props {
  applicationCount: number;
  appCap: number;
  slots: number;
}

export function InternshipCapBar({ applicationCount, appCap, slots }: Props) {
  const pct = Math.min((applicationCount / appCap) * 100, 100);
  const isFull = applicationCount >= appCap;
  const isWarning = pct >= 75;
  const spotsLeft = appCap - applicationCount;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{slots} slots × 2 = {appCap} max applications</span>
        <span className={isFull ? "text-destructive font-bold" : ""}>
          {applicationCount} / {appCap}
        </span>
      </div>
      <Progress
        value={pct}
        className={`h-2 ${isFull ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-yellow-500" : ""}`}
      />
      {isFull ? (
        <p className="text-xs text-destructive font-medium">
          ⚠️ Application cap reached — role is now closed to new applicants.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          🟢 {spotsLeft} application {spotsLeft === 1 ? "spot" : "spots"} remaining
        </p>
      )}
    </div>
  );
}
