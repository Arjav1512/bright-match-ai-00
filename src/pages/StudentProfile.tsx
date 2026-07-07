import { Component, ErrorInfo, ReactNode } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, Globe, Linkedin, ArrowLeft, MessageCircle, Shield, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import FollowButton from "@/components/FollowButton";
import { ProfileSkeleton } from "@/components/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { safeExternalUrl } from "@/lib/utils";
import AdminField from "@/components/admin/AdminField";
import { useFollows } from "@/hooks/useFollows";
import ResumeLink from "@/components/ResumeLink";


const hasDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const StudentProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = role === "admin";
  const isOwner = !!user && user.id === userId;

  // Smart back: prefer the previous route. On deep-link, admins fall back to
  // /admin/users; everyone else to /students (LinkUp).
  const backLabel = isAdmin ? "Back to Users" : "Back to LinkUp";
  const backFallback = isAdmin ? "/admin/users" : "/students";
  const handleBack = () => {
    if ((location.key && location.key !== "default") || window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(backFallback);
    }
  };


  const { data, isLoading } = useQuery({
    queryKey: ["public-student-profile", userId, role, user?.id],
    queryFn: async () => {
      // Never throw — a thrown queryFn bubbles up to the top-level ErrorBoundary
      // and shows "Something went wrong". Return an empty payload instead so the
      // page can render its own "Profile not found" state.
      if (!userId) return { profile: null, studentProfile: null };

      let profile: any = null;
      let studentProfile: any = null;

      // Full profile (includes bio) is only readable by owner, admin, or
      // connected users under the tightened RLS. Fall back to the public view
      // (name/avatar only) so LinkUp/browsing users still see the profile.
      try {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, bio")
          .eq("user_id", userId)
          .maybeSingle();
        profile = p ?? null;
      } catch (err) {
        console.error("[StudentProfile] profiles fetch failed", err);
      }
      if (!profile) {
        try {
          const { data: pub } = await (supabase as any)
            .from("profiles_public")
            .select("user_id, full_name, avatar_url")
            .eq("user_id", userId)
            .maybeSingle();
          profile = pub ? { ...pub, bio: null } : null;
        } catch (err) {
          console.error("[StudentProfile] profiles_public fetch failed", err);
        }
      }

      // Always try the full table first — RLS allows owners, admins, and
      // employers-with-applications. Fall through to the safe public view
      // (which only exposes onboarding-completed rows) when RLS denies.
      try {
        const { data: full } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        studentProfile = full ?? null;
      } catch (err) {
        console.error("[StudentProfile] student_profiles fetch failed", err);
      }

      if (!studentProfile) {
        try {
          const { data: pub } = await (supabase as any)
            .from("student_profiles_public")
            .select(
              "user_id, university, profile_role, preferred_course, skills, location, experience_years, current_job_title, current_company, linkedin_url, website_url, not_employed"
            )
            .eq("user_id", userId)
            .maybeSingle();
          studentProfile = pub ?? null;
        } catch (err) {
          console.error("[StudentProfile] public student view fetch failed", err);
        }
      }

      return { profile, studentProfile };
    },
    // Wait for auth to resolve so admin/owner detection is accurate.
    enabled: !!userId && !authLoading,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const profile = data?.profile;
  const sp = data?.studentProfile as any;

  const studentDetailFields: { label: string; value: any; render?: () => JSX.Element }[] = sp
    ? [
        { label: "University", value: sp.university },
        { label: "Major", value: sp.major },
        { label: "Course", value: sp.profile_role },
        { label: "Preferred Course", value: sp.preferred_course },
        { label: "Graduation Year", value: sp.graduation_year },
        { label: "Experience (months)", value: sp.experience_years },
        { label: "Location", value: sp.location },
        { label: "Skills", value: Array.isArray(sp.skills) && sp.skills.length ? sp.skills.join(", ") : null },
        { label: "Current Job Title", value: sp.current_job_title },
        { label: "Current Company", value: sp.current_company },
        { label: "Not Employed", value: sp.not_employed },
        { label: "LinkedIn", value: sp.linkedin_url },
        { label: "Website", value: sp.website_url },
        ...((isOwner || isAdmin)
          ? [
              { label: "Phone", value: sp.phone_number },
              {
                label: "Resume",
                value: sp.resume_url,
                // Render a signed-URL button instead of the raw storage path,
                // so admins/owners can actually open the file. The resumes
                // bucket is private — printing the path as text or linking it
                // directly produces a 404 on the app domain.
                render: sp.resume_url
                  ? () => <ResumeLink stored={sp.resume_url} studentId={sp.user_id} />
                  : undefined,
              },
              { label: "Onboarding Status", value: sp.onboarding_status },
            ]
          : []),
      ]
    : [];

  const hasStudentDetails = studentDetailFields.some((field) => hasDisplayValue(field.value));

  const getInitials = () => {
    try {
      const name = (profile?.full_name ?? "").toString();
      const initials = name
        .split(" ")
        .filter(Boolean)
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      return initials || "?";
    } catch {
      return "?";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl py-10">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </button>


        {isLoading ? (
          <ProfileSkeleton />
        ) : !profile ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Profile not found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback className="brand-gradient text-white text-xl">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h1 className="font-display text-2xl font-bold truncate">{profile.full_name || "Student"}</h1>
                    {sp?.location && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5" /> {sp.location}
                      </p>
                    )}
                    {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
                    {user && user.id !== userId && !isAdmin && (
                      <div className="mt-3 flex items-center gap-2">
                        <SafeInteractionZone>
                          <FollowButton targetUserId={userId!} targetRole="student" />
                          {(role === "student" || role === "employer") && (
                            <MessageActionButton
                              targetUserId={userId!}
                              viewerRole={role}
                              partnerName={profile.full_name || "Student"}
                              partnerAvatar={profile.avatar_url}
                            />
                          )}
                        </SafeInteractionZone>
                      </div>
                    )}

                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student details */}
            {sp && hasStudentDetails && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Student Details</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {studentDetailFields.map((field) =>
                    field.render ? (
                      <div key={field.label} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground min-w-[140px]">{field.label}:</span>
                        {field.render()}
                      </div>
                    ) : (
                      <AdminField key={field.label} label={field.label} value={field.value} />
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {Array.isArray(sp?.skills) && sp.skills.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Skills</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {sp.skills.filter((s: unknown): s is string => typeof s === "string" && s.length > 0).map((skill: string, idx: number) => (
                      <Badge key={`${skill}-${idx}`} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current work */}
            {sp && !sp.not_employed && sp.current_job_title && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Current Work</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{sp.current_job_title}{sp.current_company ? ` at ${sp.current_company}` : ""}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Links */}
            {(sp?.linkedin_url || sp?.website_url) && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Links</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {/* FIX (HIGH-6): safeExternalUrl rejects javascript:/data: schemes */}
                  {safeExternalUrl(sp.linkedin_url) && (
                    <a href={safeExternalUrl(sp.linkedin_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Linkedin className="h-4 w-4" /> LinkedIn Profile
                    </a>
                  )}
                  {safeExternalUrl(sp.website_url) && (
                    <a href={safeExternalUrl(sp.website_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Globe className="h-4 w-4" /> Personal Website
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Admin-only: complete submitted data */}
            {isAdmin && sp && (
              <Card className="border-primary/40">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> Admin View — All Submitted Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <AdminField label="Onboarding Status" value={sp.onboarding_status} />
                  <AdminField label="Onboarding Step" value={sp.onboarding_step} />
                  <AdminField label="Onboarding Completed" value={sp.onboarding_completed_at} />
                  <AdminField label="Phone" value={sp.phone_number} icon={<Phone className="h-3.5 w-3.5" />} />
                  <AdminField label="University" value={sp.university} />
                  <AdminField label="Major" value={sp.major} />
                  <AdminField label="Graduation Year" value={sp.graduation_year} />
                  <AdminField label="Course Role" value={sp.profile_role} />
                  <AdminField label="Preferred Course" value={sp.preferred_course} />
                  <AdminField label="Is Student" value={sp.is_student} />
                  <AdminField label="Not Employed" value={sp.not_employed} />
                  <AdminField label="Current Job Title" value={sp.current_job_title} />
                  <AdminField label="Current Company" value={sp.current_company} />
                  <AdminField label="Experience (months)" value={sp.experience_years} />
                  <AdminField label="Location" value={sp.location} />
                  <AdminField label="Latitude" value={sp.lat} />
                  <AdminField label="Longitude" value={sp.lng} />
                  <AdminField label="LinkedIn" value={sp.linkedin_url} />
                  <AdminField label="Website" value={sp.website_url} />
                  <AdminField label="Skills" value={sp.skills?.length ? sp.skills.join(", ") : null} />
                  {sp.resume_url && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Resume:</span>
                      <ResumeLink stored={sp.resume_url} studentId={sp.user_id} />
                    </div>
                  )}
                  <AdminField label="Created" value={sp.created_at} />
                  <AdminField label="Updated" value={sp.updated_at} />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MessageActionButton = ({
  targetUserId,
  viewerRole,
  partnerName,
  partnerAvatar,
}: {
  targetUserId: string;
  viewerRole: string | null;
  partnerName: string;
  partnerAvatar: string | null;
}) => {
  // Employers can always DM students. Students can only DM connected peers.
  const { state } = useFollows(targetUserId, { targetRole: "student" });
  const isStudentViewer = viewerRole === "student";
  const connected = state === "accepted";
  const disabled = isStudentViewer && !connected;

  const label = !isStudentViewer
    ? "Message"
    : connected
      ? "Message"
      : state === "pending_outgoing"
        ? "Request sent"
        : state === "pending_incoming"
          ? "Accept to message"
          : "Connect to message";

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      title={disabled ? "You must be connected to message this student" : undefined}
      onClick={() => {
        if (disabled) return;
        window.dispatchEvent(
          new CustomEvent("open-dm", {
            detail: {
              partnerId: targetUserId,
              partnerName,
              partnerAvatar,
              partnerRole: "student",
            },
          })
        );
      }}
    >
      <MessageCircle className="h-4 w-4 mr-1" />
      {label}
    </Button>
  );
};

// Micro-boundary for connect/message controls — if useFollows or a downstream
// query throws (realtime subscription, transient network, RLS quirk), the
// profile still renders. The buttons just quietly disappear.
class SafeInteractionZone extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) {
    console.error("[StudentProfile] interaction zone error", err);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// Scoped error boundary — if something inside StudentProfile throws at render

// time (unexpected data shape, downstream hook failure), we show an inline
// recoverable message instead of blanking the whole app with the top-level
// "Something went wrong" screen. The error message is surfaced so we can
// diagnose live reports without needing a repro.
class StudentProfileBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string | null }
> {
  state = { hasError: false, message: null as string | null };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err?.message ?? String(err) };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    // Full details in the console for support/debugging.
    console.error("[StudentProfile] render error", err, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container max-w-2xl py-10">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground space-y-3">
                <p>We couldn't display this profile right now.</p>
                {this.state.message && (
                  <p className="text-xs opacity-70 break-all">{this.state.message}</p>
                )}
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Reload
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                    Go back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const StudentProfileWithBoundary = () => (
  <StudentProfileBoundary>
    <StudentProfile />
  </StudentProfileBoundary>
);

export default StudentProfileWithBoundary;

