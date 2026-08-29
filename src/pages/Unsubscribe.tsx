import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

export default function Unsubscribe() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SEO title="Unsubscribe — Wroob" description="Manage your email preferences on Wroob." />
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold mb-3">Email preferences</h1>
        <p className="text-muted-foreground mb-4">
          Unsubscribing is now handled directly from the unsubscribe link in the footer of any
          Wroob email. Open your most recent Wroob email and click “Unsubscribe” there to opt out
          instantly.
        </p>
        <p className="text-muted-foreground mb-6">
          Need help? Email us at{" "}
          <a className="text-primary underline" href="mailto:yourwroob@gmail.com">
            yourwroob@gmail.com
          </a>
          .
        </p>
        <Link to="/" className="text-primary underline">Back to Wroob</Link>
      </div>
    </div>
  );
}
