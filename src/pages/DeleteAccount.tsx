import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import wroobLogo from "@/assets/wroob-logo.webp";
import { AlertTriangle, Loader2, LogIn, ShieldCheck } from "lucide-react";

const POINTS = [
  "Deleting your Wroob account is permanent and cannot be undone.",
  "Your profile, uploaded files (resume, photo, company logo), applications, messages, connections, Wroob Circle activity and notifications are permanently deleted.",
  "A small amount of information may be retained only where required by law or for security and fraud prevention, as described in our Privacy Policy.",
  "Deletion requires email verification — we send a 6-digit code to the email address on your Wroob account.",
  "The code expires in 10 minutes, can be used only once, and your account is deleted only after the code is verified.",
];

const DeleteAccount = () => {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Delete Your Wroob Account"
        description="Request permanent deletion of your Wroob account and associated data. Sign in to verify ownership, confirm with an emailed verification code, and your account and data are permanently removed."
        path="/delete-account"
      />
      <Navbar />

      <section className="py-14 md:py-20">
        <div className="container">
          <div className="mx-auto w-full max-w-xl">
            <div className="flex flex-col items-center text-center">
              <img src={wroobLogo} alt="Wroob" className="h-10 w-auto" />
              <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                Delete Your Wroob Account
              </h1>
              <p className="mt-3 text-muted-foreground">
                Request permanent deletion of your Wroob account and associated data.
              </p>
            </div>

            <Card className="mt-8 border-destructive/40">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Before you continue</span>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {POINTS.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground">
                  See our{" "}
                  <Link to="/privacy" className="underline hover:text-foreground">
                    Privacy Policy
                  </Link>{" "}
                  for details on what we retain and why.
                </p>
              </CardContent>
            </Card>

            <div className="mt-8">
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : user ? (
                <div className="space-y-3">
                  <p className="text-center text-sm text-muted-foreground">
                    Signed in as <span className="font-medium text-foreground">{user.email}</span>
                  </p>
                  <DeleteAccountDialog variant="inline" />
                </div>
              ) : (
                <Card>
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Sign in to continue</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      To securely delete your Wroob account, sign in to verify ownership. We only
                      ever delete the account you are signed in to.
                    </p>
                    <Button asChild size="lg" className="w-full">
                      <Link to="/login?redirect=/delete-account">
                        <LogIn className="mr-2 h-4 w-4" /> Sign in with email
                      </Link>
                    </Button>
                    <GoogleSignInButton
                      label="Continue with Google"
                      redirectPath="/delete-account"
                    />
                    <p className="text-center text-xs text-muted-foreground">
                      Works for both student and employer accounts. You'll come back to this page
                      after signing in.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Need help? Contact us at{" "}
              <a href="mailto:yourwroob@gmail.com" className="underline hover:text-foreground">
                yourwroob@gmail.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DeleteAccount;
