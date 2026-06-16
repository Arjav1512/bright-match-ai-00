import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import wroobeLogo from "@/assets/wroob-logo.webp";
import SEO from "@/components/SEO";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  // Only accept relative paths — prevents open redirect to external sites
  const rawRedirect = searchParams.get("redirect") || "";
  const redirectTo = rawRedirect.startsWith("/") ? rawRedirect : "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    sessionStorage.setItem("wroob_just_logged_in", "true");

    // Resolve role + onboarding status immediately so returning users land on
    // their dashboard directly — never on /select-role, even on race conditions.
    try {
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (signedInUser) {
        // Honour an explicit redirect target first (e.g. came from /internships/:id).
        if (rawRedirect.startsWith("/") && rawRedirect !== "/dashboard") {
          setLoading(false);
          navigate(redirectTo);
          return;
        }

        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", signedInUser.id)
          .maybeSingle();
        const userRole = (roleRow as any)?.role as "student" | "employer" | "admin" | undefined;

        if (userRole === "admin") {
          setLoading(false);
          navigate("/admin");
          return;
        }
        if (userRole === "student") {
          const { data: sp } = await supabase
            .from("student_profiles")
            .select("onboarding_status, onboarding_step")
            .eq("user_id", signedInUser.id)
            .maybeSingle();
          setLoading(false);
          if (sp && (sp as any).onboarding_status !== "completed") {
            navigate("/dashboard");
          } else {
            navigate("/internships");
          }
          return;
        }
        if (userRole === "employer") {
          const { data: ep } = await supabase
            .from("employer_profiles")
            .select("onboarding_status, onboarding_step")
            .eq("user_id", signedInUser.id)
            .maybeSingle();
          setLoading(false);
          if (ep && (ep as any).onboarding_status !== "completed") {
            navigate("/dashboard");
          } else {
            navigate("/my-internships");
          }
          return;
        }
        // No role yet (e.g. social signup mid-flow) — Dashboard will route.
      }
    } catch {
      // fall through to default redirect
    }
    setLoading(false);
    navigate(redirectTo);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SEO title="Log in to Wroob" description="Sign in to your Wroob account to access internships, applications, and your student or employer dashboard." path="/login" noIndex />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/">
            <img src={wroobeLogo} alt="Wroob" width="139" height="56" decoding="async" className="h-14 mx-auto" />
          </Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
            <CardDescription>
              {redirectTo !== "/dashboard" ? "Sign in to continue" : "Sign in to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" className="w-full rounded-full brand-gradient border-0 text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
            </div>
            <GoogleSignInButton />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
