import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // Show warning 5 min before expiry
const CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

export function SessionTimeoutWarning() {
  const { session, user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track whether the warning/countdown has already been started for the
  // current session so we don't kill the interval on a React re-render.
  const warningStartedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timerRef.current = null;
    countdownRef.current = null;
  }, []);

  useEffect(() => {
    warningStartedRef.current = false;

    if (!session?.expires_at || !user) {
      setShowWarning(false);
      clearTimers();
      return;
    }

    const checkExpiry = () => {
      const expiresAt = session.expires_at! * 1000; // Convert to ms
      const now = Date.now();
      const timeLeft = expiresAt - now;

      if (timeLeft <= 0) {
        // Already expired — sign out handled by Supabase
        setShowWarning(false);
        warningStartedRef.current = false;
        return;
      }

      if (timeLeft <= WARNING_BEFORE_EXPIRY_MS && !warningStartedRef.current) {
        setRemainingSeconds(Math.floor(timeLeft / 1000));
        setShowWarning(true);
        warningStartedRef.current = true;

        // Start countdown
        countdownRef.current = setInterval(() => {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              setShowWarning(false);
              warningStartedRef.current = false;
              clearTimers();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };

    checkExpiry();
    timerRef.current = setInterval(checkExpiry, CHECK_INTERVAL_MS);

    return clearTimers;
  }, [session, user, clearTimers]);

  const handleExtendSession = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        setShowWarning(false);
        warningStartedRef.current = false;
        clearTimers();
      }
    } catch (e) {
      console.error("Failed to refresh session:", e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDismiss = () => {
    setShowWarning(false);
    warningStartedRef.current = false;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!showWarning) return null;

  return (
    <AlertDialog open={showWarning} onOpenChange={(open) => !open && handleDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your session will expire in{" "}
              <span className="font-semibold text-foreground">{formatTime(remainingSeconds)}</span>.
              You'll be signed out automatically.
            </p>
            <p>Would you like to extend your session?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>Dismiss</AlertDialogCancel>
          <AlertDialogAction onClick={handleExtendSession} disabled={refreshing}>
            {refreshing ? "Extending..." : "Extend Session"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

