import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import InternshipForm, { InternshipFormData, defaultFormData } from "@/components/internship/InternshipForm";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const EditInternship = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [initialData, setInitialData] = useState<InternshipFormData | null>(null);

  useEffect(() => {
    if (!id || !user) return;

    const fetch = async () => {
      const { data, error } = await supabase
        .from("internships")
        .select("*")
        .eq("id", id)
        .eq("employer_id", user.id)
        .maybeSingle();

      if (error || !data) {
        toast({ title: "Not found", description: "Internship not found or you don't have access.", variant: "destructive" });
        navigate("/my-internships");
        return;
      }

      const d = data as any;
      setInitialData({
        title: d.title || "",
        department: d.department || "",
        slots: d.slots ?? 5,
        internship_category: d.internship_category === "part-time" ? "part-time" : "full-time",
        industry: d.industry || "",
        type: d.type || "remote",
        location: d.location || "",
        duration_months: d.duration_months ?? 3,
        start_date: d.start_date || "",
        working_days: d.working_days || "Mon–Fri",
        working_hours: d.working_hours || "9 AM – 5 PM",
        stipend_type: d.stipend_type || "unpaid",
        stipend_amount: d.stipend_amount != null ? String(d.stipend_amount) : "",
        benefits: d.benefits || [],
        skills_required: d.skills_required || [],
        eligibility: d.eligibility || [],
        description: d.description || "",
        roles_responsibilities: d.roles_responsibilities || "",
        day_to_day_tasks: d.day_to_day_tasks || "",
        projects: d.projects || "",
        requirements: d.requirements || "",
        resume_screening: d.resume_screening ?? true,
        interview_required: d.interview_required ?? false,
        test_assignment: d.test_assignment || "",
        deadline: d.deadline ? d.deadline.split("T")[0] : "",
        joining_process: d.joining_process || "",
      });
      setFetching(false);
    };
    fetch();
  }, [id, user]);

  const handleSubmit = async (form: InternshipFormData, status: "draft" | "published") => {
    if (!user || !id) return;
    setLoading(true);

    const appCap = form.slots * 2;
    const { error } = await supabase
      .from("internships")
      .update({
        title: form.title,
        department: form.department,
        slots: form.slots,
        internship_category: form.internship_category,
        industry: form.industry,
        type: form.type,
        location: form.location || null,
        duration_months: form.duration_months,
        start_date: form.start_date || null,
        working_days: form.working_days,
        working_hours: form.working_hours,
        stipend_type: form.stipend_type,
        stipend_amount: form.stipend_amount ? parseFloat(form.stipend_amount) : null,
        benefits: form.benefits,
        skills_required: form.skills_required,
        eligibility: form.eligibility.length > 0 ? form.eligibility : null,
        description: form.description,
        roles_responsibilities: form.roles_responsibilities,
        day_to_day_tasks: form.day_to_day_tasks || null,
        projects: form.projects || null,
        requirements: form.requirements || null,
        resume_screening: form.resume_screening,
        interview_required: form.interview_required,
        test_assignment: form.test_assignment || null,
        deadline: form.deadline || null,
        joining_process: form.joining_process || null,
        status,
        app_cap: appCap,
      } as any)
      .eq("id", id)
      .eq("employer_id", user.id);

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "published" ? "Internship updated & published!" : "Draft saved!" });
      navigate("/my-internships");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl py-10">
        <h1 className="font-display text-3xl font-bold mb-8">Edit Internship</h1>
        {fetching ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : initialData ? (
          <InternshipForm
            initialData={initialData}
            onSubmit={handleSubmit}
            loading={loading}
            submitLabel="Update & Publish"
          />
        ) : null}
      </div>
    </div>
  );
};

export default EditInternship;
