import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const GREETINGS = [
  (name: string) => `Welcome back, ${name} 👋`,
  (name: string) => `Good to see you again, ${name}!`,
  (name: string) => `Hey ${name}! Ready to explore? 🚀`,
  (name: string) => `Welcome back, ${name}! Let's go 💪`,
];

const LoginGreeting = () => {
  const { user, role, profile, loading } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState<string | null>(null);

  // P0-1: For employers, prefer company_name over email-prefix as the greeting.
  useEffect(() => {
    if (!user || role !== "employer") { setCompanyName(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("employer_profiles")
        .select("company_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setCompanyName((data as any)?.company_name ?? null);
    })();
    return () => { cancelled = true; };
  }, [user, role]);

  useEffect(() => {
    if (loading || !user) return;

    const flag = sessionStorage.getItem("wroob_just_logged_in");
    if (!flag) return;

    sessionStorage.removeItem("wroob_just_logged_in");

    // Resolution order: profile full_name → company_name (employers) →
    // email-prefix → "there". Email is only ever a last-resort fallback.
    const name =
      profile?.full_name?.split(" ")[0] ||
      (role === "employer" ? companyName : null) ||
      user.email?.split("@")[0] ||
      "there";
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

    toast({
      title: greeting(name),
      duration: 3000,
    });
  }, [loading, user, role, profile, companyName, toast]);

  return null;
};

export default LoginGreeting;
