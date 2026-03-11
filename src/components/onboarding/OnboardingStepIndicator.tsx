import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "profile", label: "Profile" },
  { key: "culture", label: "Culture" },
  { key: "resume", label: "Resume/CV" },
  { key: "done", label: "Done" },
];

interface OnboardingStepIndicatorProps {
  currentStep: number; // 1-4
}

const OnboardingStepIndicator = ({ currentStep }: OnboardingStepIndicatorProps) => {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-center rounded-full border bg-card px-6 py-3 shadow-sm">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={step.key} className="flex items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "mx-2 h-px w-6 sm:w-10",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              <span
                className={cn(
                  "flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap transition-colors",
                  isActive && "font-semibold text-primary",
                  isCompleted && "text-primary",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.key === "done" && (
                  <Check className="h-3.5 w-3.5 text-success" />
                )}
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingStepIndicator;
