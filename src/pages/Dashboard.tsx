import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLoadingSkeleton } from "@/components/skeletons";
// FIX (MEDIUM-3): Removed duplicate "/onboarding/culture" at index 2.
// A student with onboarding_step=3 now correctly lands on /onboarding/resume.
const STUDENT_STEP_ROUTES = [
  "/onboarding/profile",   // step 1 → index 0
  "/onboarding/culture",   // step 2 → index 1
  "/onboarding/resume",    // step 3 → index 2
  "/onboarding/done",      // step 4 → index 3
];

// FIX (MEDIUM-6): Added missing manager and legal steps so all 7 onboarding
// steps are reachable. Previous array skipped steps 3 and 4 entirely.
const EMPLOYER_STEP_ROUTES = [
  "/employer/onboarding/company",   // step 1 → index 0
  "/employer/onboarding/location",  // step 2 → index 1
  "/employer/onboarding/manager",   // step 3 → index 2
  "/employer/onboarding/legal",     // step 4 → index 3
  "/employer/onboarding/verify",    // step 5 → index 4
  "/employer/onboarding/team",      // step 6 → index 5
  "/employer/onboarding/done",      // step 7 → index 6
];

const Dashboard = () => {
  const { user, role, loading } = useAuth();
  const [onboardingCheck, setOnboardingCheck] = useState<"loading" | "needs" | "done">("loading");
  const [onboardingRoute, setOnboardingRoute] = useState("");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setOnboardingCheck("done");
      return;
    }

    const resolveOnboarding = async () => {
      if (role === "student") {
        const { data } = await supabase
          .from("student_profiles")
          .select("onboarding_status, onboarding_step")
          .eq("user_id", user.id)
          .maybeSingle();

        const d = data as any;
        if (d && d.onboarding_status !== "completed") {
          const step = Math.min(Math.max((d.onboarding_step || 1) - 1, 0), STUDENT_STEP_ROUTES.length - 1);
          setOnboardingRoute(STUDENT_STEP_ROUTES[step]);
          setOnboardingCheck("needs");
          return;
        }

        setOnboardingCheck("done");
        return;
      }

      if (role === "employer") {
        const { data } = await supabase
          .from("employer_profiles")
          .select("onboarding_status, onboarding_step")
          .eq("user_id", user.id)
          .maybeSingle();

        const d = data as any;
        if (d && d.onboarding_status !== "completed") {
          const step = Math.min(Math.max((d.onboarding_step || 1) - 1, 0), EMPLOYER_STEP_ROUTES.length - 1);
          setOnboardingRoute(EMPLOYER_STEP_ROUTES[step]);
          setOnboardingCheck("needs");
          return;
        }

        setOnboardingCheck("done");
        return;
      }

      if (!role) {
        setOnboardingRoute("/select-role");
        setOnboardingCheck("needs");
        return;
      }

      setOnboardingCheck("done");
    };

    void resolveOnboarding();
  }, [user, role, loading]);

  if (loading || onboardingCheck === "loading") {
    return <PageLoadingSkeleton />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (onboardingCheck === "needs") return <Navigate to={onboardingRoute} replace />;
  if (role === "student") return <Navigate to="/internships" replace />;
  if (role === "employer") return <Navigate to="/my-internships" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;

  return <Navigate to="/" replace />;
};

export default Dashboard;