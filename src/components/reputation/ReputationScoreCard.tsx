import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Briefcase, GraduationCap, MessageSquare, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReputationBreakdown {
  internship_score: number;
  skill_score: number;
  feedback_score: number;
  profile_score: number;
}

interface ReputationScoreCardProps {
  score: number;
  breakdown?: ReputationBreakdown;
  compact?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Very Good";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Building";
}

function getProgressColor(score: number) {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 60) return "[&>div]:bg-amber-500";
  if (score >= 40) return "[&>div]:bg-orange-500";
  return "[&>div]:bg-red-500";
}

export const ReputationScoreCard = ({ score, breakdown, compact = false }: ReputationScoreCardProps) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Trophy className={cn("h-4 w-4", getScoreColor(score))} />
        <span className={cn("text-sm font-bold", getScoreColor(score))}>{Math.round(score)}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-primary" />
          Reputation Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 mb-2">
          <span className={cn("text-4xl font-bold font-display", getScoreColor(score))}>
            {Math.round(score)}
          </span>
          <span className="text-lg text-muted-foreground mb-1">/ 100</span>
        </div>
        <p className={cn("text-sm font-medium mb-4", getScoreColor(score))}>
          {getScoreLabel(score)}
        </p>
        <Progress value={score} className={cn("h-2 mb-6", getProgressColor(score))} />

        {breakdown && <ScoreBreakdown breakdown={breakdown} />}
      </CardContent>
    </Card>
  );
};

export const ScoreBreakdown = ({ breakdown }: { breakdown: ReputationBreakdown }) => {
  const items = [
    { label: "Internship Completion", value: breakdown.internship_score, max: 40, icon: Briefcase },
    { label: "Skill Tests", value: breakdown.skill_score, max: 25, icon: GraduationCap },
    { label: "Company Feedback", value: breakdown.feedback_score, max: 25, icon: MessageSquare },
    { label: "Profile Strength", value: breakdown.profile_score, max: 10, icon: UserCheck },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score Breakdown</p>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{Math.round(item.value)}/{item.max}</span>
            </div>
            <Progress value={(item.value / item.max) * 100} className="h-1.5" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const CandidateScoreBadge = ({ score, className }: { score: number; className?: string }) => {
  const percentile = score >= 90 ? "Top 5%" : score >= 80 ? "Top 10%" : score >= 70 ? "Top 25%" : score >= 60 ? "Top 40%" : null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        score >= 80 ? "bg-emerald-500/10 text-emerald-600" :
        score >= 60 ? "bg-amber-500/10 text-amber-600" :
        score >= 40 ? "bg-orange-500/10 text-orange-600" :
        "bg-muted text-muted-foreground"
      )}>
        <Trophy className="h-3 w-3" />
        {Math.round(score)}
      </div>
      {percentile && (
        <span className="text-[10px] font-medium text-muted-foreground">{percentile}</span>
      )}
    </div>
  );
};
