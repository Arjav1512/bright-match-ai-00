import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("student" | "employer" | "admin")[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading, signOut, refreshRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [recheckingRole, setRecheckingRole] = useState(false);
  const [recheckedRole, setRecheckedRole] = useState<"student" | "employer" | "admin" | null | "unknown">("unknown");

  // If AuthContext says role is null but a user is signed in, double-check
  // the DB before bouncing to /select-role. The cached null can be stale
  // right after signup (trigger race) or after set_initial_role.
  useEffect(() => {
    let cancelled = false;
    if (user && !loading && !role && location.pathname !== "/select-role") {
      setRecheckingRole(true);
      refreshRole().then((r) => {
        if (cancelled) return;
        setRecheckedRole(r ?? null);
        setRecheckingRole(false);
      });
    } else {
      setRecheckedRole("unknown");
    }
    return () => {
      cancelled = true;
    };
  }, [user, loading, role, location.pathname, refreshRole]);

  if (loading || recheckingRole) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Preserve the current path so login can redirect back after auth.
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;

  if (location.pathname === "/select-role") return <>{children}</>;

  // Only redirect to /select-role if BOTH the context AND a fresh DB lookup
  // confirm there's no role assigned.
  if (!role && recheckedRole === null) return <Navigate to="/select-role" replace />;

  // Use whichever role is available (context takes precedence; fall back to recheck).
  const effectiveRole = role ?? (recheckedRole !== "unknown" ? recheckedRole : null);

  if (!effectiveRole) {
    // Still resolving — show spinner instead of redirecting.
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    if (allowedRoles.includes("admin")) {
      return (
        <div className="flex min-h-[70vh] items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-5 rounded-2xl border bg-card p-8 shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Admin access required</h1>
              <p className="text-sm text-muted-foreground">
                You're signed in as a <span className="font-medium capitalize">{effectiveRole}</span>. The admin panel is only available to admin accounts.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Go to dashboard
              </Button>
              <Button
                onClick={async () => {
                  await signOut();
                  navigate(`/login?redirect=${encodeURIComponent("/admin")}`);
                }}
              >
                Sign in as admin
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
