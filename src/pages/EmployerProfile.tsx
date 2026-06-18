import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Globe, Linkedin, ArrowLeft, MapPin, MessageCircle, BadgeCheck, Shield, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import FollowButton from "@/components/FollowButton";
import FollowListDialog from "@/components/FollowListDialog";
import { useFollows } from "@/hooks/useFollows";
import AdminField from "@/components/admin/AdminField";
import { ProfileSkeleton } from "@/components/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { safeExternalUrl } from "@/lib/utils";

const hasDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const EmployerProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = role === "admin";
  const isOwner = !!user && user.id === userId;

  // Smart back: prefer the previous route in history. If there is no history
  // (deep-link), fall back by role — admins land on /admin/users, others on
  // /internships. This stops admins being dumped on the student internships
  // page after viewing a company.
  const backLabel = isAdmin ? "Back to Users" : "Back to Internships";
  const backFallback = isAdmin ? "/admin/users" : "/internships";
  const handleBack = () => {
    if ((location.key && location.key !== "default") || window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(backFallback);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["public-employer-profile", userId, role, user?.id],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID");

      // Always try the full table first. RLS allows:
      //  - the owner ("Employer can read own profile")
      //  - admins ("Admins can read employer profiles")
      //  - any authenticated user ("Discovery: read public columns of employer profiles")
      // Fall back to the public view if RLS denies for any reason.
      let { data: employer } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!employer) {
        const { data: pub } = await (supabase as any)
          .from("employer_profiles_public")
          .select(
            "user_id, company_name, logo_url, is_verified, industry, city, state, company_description, company_size, year_established, funding_stage, website, linkedin_profile"
          )
          .eq("user_id", userId)
          .maybeSingle();
        employer = pub;
      }

      const { data: internships } = await supabase
        .from("internships")
        .select("id, title, type, location, status, created_at")
        .eq("employer_id", userId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(10);

      return { employer, internships: internships || [] };
    },
    enabled: !!userId && !authLoading,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const ep = data?.employer;
  const internships = data?.internships || [];

  const companyDetailFields = ep
    ? [
        { label: "Company Name", value: ep.company_name },
        { label: "Industry", value: ep.industry },
        { label: "Description", value: ep.company_description },
        { label: "Company Size", value: ep.company_size },
        { label: "Year Established", value: ep.year_established },
        { label: "Funding Stage", value: ep.funding_stage },
        { label: "City", value: ep.city },
        { label: "State", value: ep.state },
        { label: "Website", value: ep.website },
        { label: "LinkedIn", value: ep.linkedin_profile },
        { label: "Hiring Roles", value: (ep as any).hiring_roles?.length ? (ep as any).hiring_roles.join(", ") : null },
        { label: "Verified", value: ep.is_verified },
        ...((isOwner || isAdmin)
          ? [
              { label: "Company Domain", value: (ep as any).company_domain },
              { label: "Head Office Address", value: (ep as any).head_office_address },
              { label: "Pincode", value: (ep as any).pincode },
              { label: "Head Office Mobile", value: (ep as any).head_office_mobile },
              { label: "Head Office Landline", value: (ep as any).head_office_landline },
              { label: "HR Name", value: (ep as any).hr_contact_name },
              { label: "HR Designation", value: (ep as any).hr_designation },
              { label: "HR Email", value: (ep as any).hr_email },
              { label: "HR Phone", value: (ep as any).hr_phone },
              { label: "Manager Name", value: (ep as any).manager_contact_name },
              { label: "Manager Designation", value: (ep as any).manager_designation },
              { label: "Manager Email", value: (ep as any).manager_email },
              { label: "Manager Phone", value: (ep as any).manager_phone },
              { label: "GSTIN", value: (ep as any).gstin },
              { label: "GST Number", value: (ep as any).gst_number },
              { label: "PAN", value: (ep as any).pan_number },
              { label: "CIN", value: (ep as any).cin },
              { label: "Onboarding Status", value: (ep as any).onboarding_status },
            ]
          : []),
      ]
    : [];

  const hasCompanyDetails = companyDetailFields.some((field) => hasDisplayValue(field.value));

  const getInitials = () => {
    const name = ep?.company_name || "";
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "C";
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
        ) : !ep ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Company profile not found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={ep.logo_url ?? undefined} />
                    <AvatarFallback className="brand-gradient text-white text-xl">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 className="font-display text-2xl font-bold truncate">{ep.company_name || "Company"}</h1>
                      {ep.is_verified && (
                        <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 shrink-0">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </Badge>
                      )}
                    </div>
                    {ep.industry && (
                      <p className="text-sm text-muted-foreground mt-1">{ep.industry}</p>
                    )}
                    {(ep.city || ep.state) && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5" /> {[ep.city, ep.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {ep.company_description && (
                      <p className="text-sm mt-2 line-clamp-3">{ep.company_description}</p>
                    )}
                    {userId && <EmployerFollowStats userId={userId} />}
                    {user && user.id !== userId && !isAdmin && (
                      <div className="mt-3 flex items-center gap-2">
                        <FollowButton targetUserId={userId!} targetRole="employer" />
                        {/* FIX (HIGH-student-employer-dm): Students can now initiate DMs
                            from the employer profile page — previously there was no
                            Message button here, making student→employer DM impossible. */}
                        {role === "student" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.dispatchEvent(
                                new CustomEvent("open-dm", {
                                  detail: {
                                    partnerId: userId,
                                    partnerName: ep?.company_name || "Employer",
                                    partnerAvatar: ep?.logo_url ?? null,
                                    partnerRole: "employer",
                                  },
                                })
                              )
                            }
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Message
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Details */}
            {hasCompanyDetails && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Company Details</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {companyDetailFields.map((field) => (
                    <AdminField key={field.label} label={field.label} value={field.value} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Links */}
            {(ep.website || ep.linkedin_profile) && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Links</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {/* FIX (HIGH-6): safeExternalUrl rejects javascript:/data: schemes */}
                  {safeExternalUrl(ep.website) && (
                    <a href={safeExternalUrl(ep.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Globe className="h-4 w-4" /> Website
                    </a>
                  )}
                  {safeExternalUrl(ep.linkedin_profile) && (
                    <a href={safeExternalUrl(ep.linkedin_profile)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Published Internships */}
            {internships.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Active Internships</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {internships.map((intern: any) => (
                    <Link
                      key={intern.id}
                      to={`/internships/${intern.id}`}
                      className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium text-sm">{intern.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {intern.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{intern.location}</span>}
                        <span className="capitalize">{intern.type}</span>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Admin-only: complete submitted data */}
            {isAdmin && ep && (
              <Card className="border-primary/40">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> Admin View — All Submitted Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <AdminField label="Onboarding Status" value={(ep as any).onboarding_status}  showEmpty />
                  <AdminField label="Onboarding Step" value={(ep as any).onboarding_step}  showEmpty />
                  <AdminField label="Onboarding Completed" value={(ep as any).onboarding_completed_at}  showEmpty />
                  <AdminField label="Verified" value={ep.is_verified}  showEmpty />
                  <AdminField label="Verification Method" value={(ep as any).verification_method}  showEmpty />
                  <AdminField label="Verified At" value={(ep as any).verified_at}  showEmpty />
                  <AdminField label="Verified Domain" value={(ep as any).verified_domain}  showEmpty />
                  <AdminField label="Work Email Verified" value={(ep as any).work_email_verified}  showEmpty />
                  <AdminField label="Company Name" value={ep.company_name}  showEmpty />
                  <AdminField label="Company Domain" value={(ep as any).company_domain}  showEmpty />
                  <AdminField label="Industry" value={ep.industry}  showEmpty />
                  <AdminField label="Description" value={ep.company_description}  showEmpty />
                  <AdminField label="Company Size" value={ep.company_size}  showEmpty />
                  <AdminField label="Year Established" value={ep.year_established}  showEmpty />
                  <AdminField label="Funding Stage" value={ep.funding_stage}  showEmpty />
                  <AdminField label="Website" value={ep.website}  showEmpty />
                  <AdminField label="LinkedIn" value={ep.linkedin_profile}  showEmpty />
                  <AdminField label="Hiring Roles" value={(ep as any).hiring_roles?.length ? (ep as any).hiring_roles.join(", ") : null}  showEmpty />
                  <AdminField label="GSTIN" value={(ep as any).gstin}  showEmpty />
                  <AdminField label="GST Number" value={(ep as any).gst_number}  showEmpty />
                  <AdminField label="PAN" value={(ep as any).pan_number}  showEmpty />
                  <AdminField label="CIN" value={(ep as any).cin}  showEmpty />
                  <AdminField label="Head Office Address" value={(ep as any).head_office_address}  showEmpty />
                  <AdminField label="City" value={ep.city}  showEmpty />
                  <AdminField label="State" value={ep.state}  showEmpty />
                  <AdminField label="Pincode" value={(ep as any).pincode}  showEmpty />
                  <AdminField label="Head Office Mobile" value={(ep as any).head_office_mobile} icon={<Phone className="h-3.5 w-3.5"  />}  showEmpty />
                  <AdminField label="Head Office Landline" value={(ep as any).head_office_landline} icon={<Phone className="h-3.5 w-3.5"  />}  showEmpty />
                  <AdminField label="HR Name" value={(ep as any).hr_contact_name}  showEmpty />
                  <AdminField label="HR Designation" value={(ep as any).hr_designation}  showEmpty />
                  <AdminField label="HR Email" value={(ep as any).hr_email} icon={<Mail className="h-3.5 w-3.5"  />}  showEmpty />
                  <AdminField label="HR Phone" value={(ep as any).hr_phone} icon={<Phone className="h-3.5 w-3.5"  />}  showEmpty />
                  <AdminField label="Manager Name" value={(ep as any).manager_contact_name}  showEmpty />
                  <AdminField label="Manager Designation" value={(ep as any).manager_designation}  showEmpty />
                  <AdminField label="Manager Email" value={(ep as any).manager_email} icon={<Mail className="h-3.5 w-3.5"  />}  showEmpty />
                  <AdminField label="Manager Phone" value={(ep as any).manager_phone} icon={<Phone className="h-3.5 w-3.5"  />}  showEmpty />
                  <AdminField label="Created" value={(ep as any).created_at}  showEmpty />
                  <AdminField label="Updated" value={(ep as any).updated_at}  showEmpty />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Renders follower / following counts for a company. Visible to all visitors.
const EmployerFollowStats = ({ userId }: { userId: string }) => {
  const { followerCount, followingCount } = useFollows(userId, { targetRole: "employer" });
  if (!followerCount && !followingCount) return null;
  return (
    <div className="mt-2">
      <FollowListDialog
        userId={userId}
        followerCount={followerCount}
        followingCount={followingCount}
        targetRole="employer"
      />
    </div>
  );
};


export default EmployerProfile;