import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Building2, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 12;

interface StudentCard {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  university: string | null;
  preferred_course: string | null;
  skills: string[] | null;
}

interface CompanyCard {
  user_id: string;
  company_name: string | null;
  logo_url: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
}

const DiscoverySection = () => {
  const [tab, setTab] = useState("students");
  const [studentPage, setStudentPage] = useState(0);
  const [companyPage, setCompanyPage] = useState(0);

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["discovery-students", studentPage],
    queryFn: async () => {
      const from = studentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: profiles } = await supabase
        .from("student_profiles")
        .select("user_id, university, preferred_course, skills")
        .eq("onboarding_status", "completed")
        .range(from, to)
        .order("created_at", { ascending: false });

      if (!profiles || profiles.length === 0) return [];

      const userIds = profiles.map((p) => p.user_id);
      const { data: generalProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (generalProfiles || []).map((p) => [p.user_id, p])
      );

      return profiles.map((sp) => {
        const gp = profileMap.get(sp.user_id);
        return {
          user_id: sp.user_id,
          full_name: gp?.full_name || "Student",
          avatar_url: gp?.avatar_url || null,
          university: sp.university,
          preferred_course: sp.preferred_course,
          skills: sp.skills,
        } as StudentCard;
      });
    },
  });

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ["discovery-companies", companyPage],
    queryFn: async () => {
      const from = companyPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data } = await supabase
        .from("employer_profiles")
        .select("user_id, company_name, logo_url, industry, city, state")
        .eq("onboarding_status", "completed")
        .not("company_name", "is", null)
        .range(from, to)
        .order("created_at", { ascending: false });

      return (data || []) as CompanyCard[];
    },
  });

  const renderSkeleton = () => (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-3 w-1/2 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold">Discover</h2>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="students">
            <GraduationCap className="h-4 w-4 mr-1.5" />
            Students
          </TabsTrigger>
          <TabsTrigger value="companies">
            <Building2 className="h-4 w-4 mr-1.5" />
            Companies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4 space-y-4">
          {loadingStudents ? (
            renderSkeleton()
          ) : !students?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No students found.</p>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {students.map((s) => (
                  <Link key={s.user_id} to={`/student/${s.user_id}`}>
                    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="pt-5 pb-4 flex flex-col items-center text-center gap-2">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={s.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {(s.full_name || "S").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold text-sm truncate w-full">{s.full_name}</h3>
                        {(s.preferred_course || s.university) && (
                          <p className="text-xs text-muted-foreground truncate w-full">
                            {s.preferred_course || s.university}
                          </p>
                        )}
                        {s.skills && s.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {s.skills.slice(0, 2).map((sk) => (
                              <Badge key={sk} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {sk}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={studentPage === 0}
                  onClick={() => setStudentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(students?.length || 0) < PAGE_SIZE}
                  onClick={() => setStudentPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="companies" className="mt-4 space-y-4">
          {loadingCompanies ? (
            renderSkeleton()
          ) : !companies?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No companies found.</p>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {companies.map((c) => (
                  <Card key={c.user_id} className="h-full hover:shadow-md transition-shadow">
                    <CardContent className="pt-5 pb-4 flex flex-col items-center text-center gap-2">
                      <Avatar className="h-14 w-14 rounded-lg">
                        <AvatarImage src={c.logo_url || undefined} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                          {(c.company_name || "C").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-sm truncate w-full">{c.company_name || "Company"}</h3>
                      {c.industry && (
                        <Badge variant="outline" className="text-[10px]">{c.industry}</Badge>
                      )}
                      {(c.city || c.state) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[c.city, c.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={companyPage === 0}
                  onClick={() => setCompanyPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(companies?.length || 0) < PAGE_SIZE}
                  onClick={() => setCompanyPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiscoverySection;
