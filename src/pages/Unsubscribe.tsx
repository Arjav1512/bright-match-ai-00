import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "confirming" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState({ kind: "invalid" });
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setState({ kind: "already" });
          return;
        }
        if (data.valid) {
          setState({ kind: "valid" });
          return;
        }
        setState({ kind: "invalid" });
      } catch {
        setState({ kind: "invalid" });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "confirming" });
    try {
      const { data, error } = await supabase.functions.invoke(
        "handle-email-unsubscribe",
        { body: { token } }
      );
      if (error) {
        setState({ kind: "error", message: "Something went wrong. Please try again." });
        return;
      }
      if ((data as any)?.success) {
        setState({ kind: "success" });
      } else if ((data as any)?.reason === "already_unsubscribed") {
        setState({ kind: "already" });
      } else {
        setState({ kind: "error", message: "Unable to unsubscribe." });
      }
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SEO title="Unsubscribe — Wroob" description="Manage your email preferences on Wroob." />
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold mb-3">Email preferences</h1>

        {state.kind === "loading" && (
          <p className="text-muted-foreground">Checking your link…</p>
        )}

        {state.kind === "valid" && (
          <>
            <p className="text-muted-foreground mb-6">
              Click below to unsubscribe from these emails.
            </p>
            <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
          </>
        )}

        {state.kind === "confirming" && (
          <p className="text-muted-foreground">Processing…</p>
        )}

        {state.kind === "success" && (
          <>
            <p className="text-foreground mb-6">You have been unsubscribed successfully.</p>
            <Link to="/" className="text-primary underline">Back to Wroob</Link>
          </>
        )}

        {state.kind === "already" && (
          <>
            <p className="text-foreground mb-6">You are already unsubscribed.</p>
            <Link to="/" className="text-primary underline">Back to Wroob</Link>
          </>
        )}

        {state.kind === "invalid" && (
          <>
            <p className="text-foreground mb-6">This unsubscribe link is invalid or has expired.</p>
            <Link to="/" className="text-primary underline">Back to Wroob</Link>
          </>
        )}

        {state.kind === "error" && (
          <>
            <p className="text-destructive mb-6">{state.message}</p>
            <Button onClick={confirm} variant="outline" className="w-full">Try again</Button>
          </>
        )}
      </div>
    </div>
  );
}
