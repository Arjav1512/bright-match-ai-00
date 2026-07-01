import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { safeExternalUrl } from "@/lib/utils";
import { CheckCircle2, ExternalLink } from "lucide-react";

interface Props {
  employerId: string | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Resolves the display name for an employer using the fallback chain:
 *   company_name → legal_company_name → organization_name → business_name → "Unnamed Company"
 * Never falls back to an email address or generic "User".
 */
export function resolveCompanyName(p: Record<string, any> | null | undefined): string {
  if (!p) return "Unnamed Company";
  return (
    p.company_name ||
    p.legal_company_name ||
    p.organization_name ||
    p.business_name ||
    "Unnamed Company"
  );
}

const NA = <span className="text-muted-foreground italic">Not Provided</span>;

const Field = ({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) => {
  const empty =
    value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
  const display = empty
    ? NA
    : Array.isArray(value)
    ? value.join(", ")
    : typeof value === "boolean"
    ? value ? "Yes" : "No"
    : String(value);
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`break-words ${mono && !empty ? "font-mono" : ""}`}>{display}</span>
    </div>
  );
};

const LinkField = ({ label, url }: { label: string; url: string | null | undefined }) => {
  const safe = safeExternalUrl(url);
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm py-1.5">
      <span className="text-muted-foreground">{label}</span>
      {safe ? (
        <a
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1 break-all"
        >
          {url} <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : NA}
    </div>
  );
};

const DocRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="flex items-center justify-between text-sm py-1.5">
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-14">{label}</span>
      <span className={value ? "font-mono" : "italic text-muted-foreground"}>{value || "Not Provided"}</span>
    </div>
    <Badge variant={value ? "default" : "secondary"} className={value ? "bg-green-100 text-green-800 border-green-200" : ""}>
      {value ? "Submitted" : "Missing"}
    </Badge>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground pb-1 border-b">{title}</h3>
    <div className="pt-2">{children}</div>
  </div>
);

const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;

const CompanyDetailDrawer = ({ employerId, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ profile: any; email: string | null; stats: any } | null>(null);

  useEffect(() => {
    if (!employerId) { setData(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: res, error } = await (supabase as any).rpc("admin_get_employer_detail", {
        p_employer_id: employerId,
      });
      if (cancelled) return;
      if (error) {
        toast({ title: "Failed to load company", description: error.message, variant: "destructive" });
        setData(null);
      } else {
        setData(res as any);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [employerId, toast]);

  const p = data?.profile ?? {};
  const stats = data?.stats ?? {};

  return (
    <Sheet open={!!employerId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 pr-8">
            {resolveCompanyName(p)}
            {p?.is_verified && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>Full employer profile and verification data.</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-6">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : !data ? (
          <div className="mt-8 text-center text-muted-foreground text-sm">No data</div>
        ) : (
          <div className="space-y-6 mt-6">
            <Section title="Account Information">
              <Field label="Company Name" value={resolveCompanyName(p)} />
              <Field label="Registered Email" value={data.email} />
              <Field label="User ID" value={p.user_id} mono />
              <Field label="Employer ID" value={p.id} mono />
              <Field label="Account Created" value={fmtDate(p.created_at)} />
              <Field label="Last Updated" value={fmtDate(p.updated_at)} />
              <Field label="Verification Status" value={p.is_verified ? "Verified" : "Not Verified"} />
              <Field label="Onboarding" value={p.onboarding_status} />
            </Section>

            <Section title="Company Information">
              <Field label="Industry" value={p.industry} />
              <Field label="Company Size" value={p.company_size} />
              <Field label="Year Established" value={p.year_established} />
              <Field label="Funding Stage" value={p.funding_stage} />
              <LinkField label="Website" url={p.website} />
              <LinkField label="LinkedIn" url={p.linkedin_profile} />
              <Field label="Description" value={p.company_description} />
              <Field label="Hiring Roles" value={p.hiring_roles} />
            </Section>

            <Section title="Location Information">
              <Field label="City" value={p.city} />
              <Field label="State" value={p.state} />
              <Field label="Pincode" value={p.pincode} />
              <Field label="Head Office" value={p.head_office_address} />
              <Field label="Office Landline" value={p.head_office_landline} />
              <Field label="Office Mobile" value={p.head_office_mobile} />
            </Section>

            <Section title="Verification Documents">
              <DocRow label="GSTIN" value={p.gstin || p.gst_number} />
              <DocRow label="PAN" value={p.pan_number} />
              <DocRow label="CIN" value={p.cin} />
              <Field label="Verified Domain" value={p.verified_domain} />
              <Field label="Method" value={p.verification_method} />
              <Field label="Work Email Verified" value={p.work_email_verified} />
            </Section>

            <Section title="Manager / HR Contact">
              <Field label="Manager Name" value={p.manager_contact_name} />
              <Field label="Manager Title" value={p.manager_designation} />
              <Field label="Manager Email" value={p.manager_email} />
              <Field label="Manager Phone" value={p.manager_phone} />
              <div className="h-2" />
              <Field label="HR Name" value={p.hr_contact_name} />
              <Field label="HR Title" value={p.hr_designation} />
              <Field label="HR Email" value={p.hr_email} />
              <Field label="HR Phone" value={p.hr_phone} />
            </Section>

            <Section title="Platform Activity">
              <Field label="Total Internships" value={stats.total_internships ?? 0} />
              <Field label="Active" value={stats.active_internships ?? 0} />
              <Field label="Closed" value={stats.closed_internships ?? 0} />
              <Field label="Total Applicants" value={stats.total_applicants ?? 0} />
            </Section>

            <Section title="Verification History">
              <Field label="Current Status" value={p.is_verified ? "Verified" : "Not Verified"} />
              <Field label="Verified At" value={fmtDate(p.verified_at)} />
              <Field label="Onboarding Completed" value={fmtDate(p.onboarding_completed_at)} />
              <Field label="Last Updated" value={fmtDate(p.updated_at)} />
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CompanyDetailDrawer;
