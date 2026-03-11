import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const OnboardingDone = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/dashboard"), 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <OnboardingLayout
      currentStep={4}
      title="You're all set!"
      subtitle="Your profile is complete. Start exploring internships now."
    >
      <div className="flex flex-col items-center py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle className="h-24 w-24 text-success mb-6" />
        </motion.div>
        <motion.p
          className="text-muted-foreground text-center mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Your profile is now visible to employers. You'll be redirected to your dashboard shortly.
        </motion.p>
        <Button
          onClick={() => navigate("/dashboard")}
          size="lg"
          className="gap-2 rounded-full h-12 px-10 brand-gradient border-0 text-white shadow-lg shadow-primary/20"
        >
          Go to Dashboard <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </OnboardingLayout>
  );
};

export default OnboardingDone;
