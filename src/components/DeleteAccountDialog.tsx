import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertTriangle, Check, Loader2, Trash2 } from "lucide-react";

type Step = "confirm" | "otp" | "deleting" | "done";

const ERROR_TEXT: Record<string, string> = {
  invalid_code: "That code isn't correct. Please check your email and try again.",
  expired: "This code has expired. Request a new one.",
  no_code: "This code is no longer valid. Request a new one.",
  too_many_attempts: "Too many incorrect attempts. Request a new code.",
  deletion_failed:
    "We couldn't complete the deletion. Nothing has been removed — please try again or contact support.",
};

const DeleteAccountDialog = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("confirm");
  const [acknowledged, setAcknowledged] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const reset = () => {
    setStep("confirm");
    setAcknowledged(false);
    setCode("");
    setError(null);
    setBusy(false);
    setCooldown(0);
    inFlight.current = false;
  };

  const handleOpenChange = (next: boolean) => {
    // Never allow closing mid-deletion.
    if (!next && (step === "deleting" || step === "done")) return;
    setOpen(next);
    if (!next) reset();
  };

  const callFunction = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error: fnError } = await supabase.functions.invoke("delete-account", {
      body: payload,
    });
    if (fnError) {
      // Edge function returned a non-2xx — try to read the structured body.
      let parsed: any = null;
      try {
        const ctx: any = (fnError as any).context;
        if (ctx && typeof ctx.json === "function") parsed = await ctx.json();
      } catch {
        /* ignore */
      }
      return { data: parsed, failed: true as const };
    }
    return { data, failed: false as const };
  }, []);

  const requestCode = async (isResend = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);

    const { data, failed } = await callFunction({ action: "request" });
    inFlight.current = false;
    setBusy(false);

    if (failed || !data?.success) {
      if (data?.error === "cooldown") {
        setCooldown(Number(data.retryAfter) || 60);
        setStep("otp");
        return;
      }
      setError(
        data?.error && typeof data.error === "string" && data.error !== "cooldown"
          ? data.error
          : "We couldn't send the verification email. Please try again.",
      );
      if (isResend) return;
      return;
    }

    setMaskedEmail(data.maskedEmail ?? null);
    setCooldown(Number(data.cooldownSeconds) || 60);
    setCode("");
    setStep("otp");
  };

  const verifyAndDelete = async () => {
    if (inFlight.current || code.length !== 6) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setStep("deleting");

    const { data, failed } = await callFunction({ action: "verify", code });
    inFlight.current = false;
    setBusy(false);

    if (failed || !data?.success) {
      const key = typeof data?.error === "string" ? data.error : "";
      setError(
        ERROR_TEXT[key] ??
          "Something went wrong. Your account has not been deleted. Please try again.",
      );
      setStep("otp");
      setCode("");
      return;
    }

    setStep("done");

    // Clear local caches and session, then leave the authenticated area.
    setTimeout(async () => {
      try {
        sessionStorage.clear();
        Object.keys(localStorage)
          .filter((k) => k.startsWith("wroob_"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* ignore */
      }
      try {
        await signOut();
      } catch {
        /* ignore */
      }
      navigate("/", { replace: true });
    }, 2200);
  };

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Permanently delete your Wroob account and all associated data. This action cannot be
            undone.
          </p>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
          {step === "confirm" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-destructive">
                  Are you sure you want to delete?
                </DialogTitle>
                <DialogDescription>
                  Deleting your Wroob account is permanent. Your profile, uploads and activity will
                  be removed and cannot be restored.
                </DialogDescription>
              </DialogHeader>

              <label className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 cursor-pointer">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  I understand that all my data will be permanently deleted and cannot be recovered.
                </span>
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!acknowledged || busy}
                  onClick={() => requestCode()}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending code…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "otp" && (
            <>
              <DialogHeader>
                <DialogTitle>Enter the verification code sent to your email.</DialogTitle>
                <DialogDescription>
                  We sent a 6-digit code{maskedEmail ? ` to ${maskedEmail}` : ""}. It expires in 10
                  minutes and can be used only once.
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-center py-2">
                <InputOTP maxLength={6} value={code} onChange={setCode} disabled={busy}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <div className="text-center text-sm text-muted-foreground">
                {cooldown > 0 ? (
                  <span>Resend available in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => requestCode(true)}
                    disabled={busy}
                  >
                    Resend code
                  </button>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy || code.length !== 6}
                  onClick={verifyAndDelete}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…
                    </>
                  ) : (
                    "Delete permanently"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "deleting" && (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-destructive" />
              <p className="font-medium">Deleting your account…</p>
              <p className="text-sm text-muted-foreground">
                Please don't close this window.
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center animate-in zoom-in-50 duration-500">
                <Check
                  className="h-9 w-9 text-emerald-600 animate-in fade-in zoom-in-75 duration-700"
                  strokeWidth={3}
                />
              </div>
              <p className="font-semibold text-lg">Account deleted successfully.</p>
              <p className="text-sm text-muted-foreground">
                Your Wroob account and data have been permanently removed. Signing you out…
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteAccountDialog;
