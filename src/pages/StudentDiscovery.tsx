import { useState } from "react";
import ProfileLink from "@/components/ProfileLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, GraduationCap, MapPin, Users, Building2 } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import { StudentGridSkeleton } from "@/components/skeletons";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface StudentCard {
  user_id: string;
  university: string | null;
  major: string | null;
  skills: string[] | null;
  location: string | null;
  graduation_year: number | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface CompanyCard {
  user_id: string;
  company_name: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  company_size: string | null;
}

const StudentDiscovery = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("students");

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["student-discovery"],
    queryFn: async () => {
      // SEC-2: use public-safe view (excludes phone/lat-lng/linkedin/resume)
      const { data: studentProfiles } = await (supabase as any)
        .from("student_profiles_public")
        .select("user_id, university, major, skills, location, graduation_year")
        .eq("onboarding_status", "completed")
        .limit(100);

      if (!studentProfiles || studentProfiles.length === 0) return [];

      const userIds = studentProfiles.map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      return studentProfiles.map((s) => ({
        ...s,
        full_name: profileMap.get(s.user_id)?.full_name ?? null,
        avatar_url: profileMap.get(s.user_id)?.avatar_url ?? null,
      })) as StudentCard[];
    },
    enabled: !!user,
  });

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ["company-discovery"],
    queryFn: async () => {
      // SEC-1: use public-safe view (excludes GSTIN/PAN/CIN/HR & manager phones+emails)
      const { data: employerProfiles } = await (supabase as any)
        .from("employer_profiles_public")
        .select("user_id, company_name, industry, city, state, logo_url, company_size")
        .limit(100);

      return (employerProfiles ?? []) as CompanyCard[];
    },
    enabled: !!user && activeTab === "companies",
  });

  const filtered = students.filter((s) => {
    if (!search) return s.user_id !== user?.id;
    const q = search.toLowerCase();
    return (
      s.user_id !== user?.id &&
      (s.full_name?.toLowerCase().includes(q) ||
        s.university?.toLowerCase().includes(q) ||
        s.major?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q) ||
        s.skills?.some((sk) => sk.toLowerCase().includes(q)))
    );
  });

  const filteredCompanies = companies.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.industry?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.state?.toLowerCase().includes(q)
    );
  });

  const getInitials = (name: string | null) =>
    (name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            LinkUp
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover students and companies to grow your network.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearch(""); }} className="mb-6">
          <TabsList className="w-full max-w-xs">
            <TabsTrigger value="students" className="flex-1 gap-1.5">
              <Search className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex-1 gap-1.5">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
          </TabsList>

          <div className="relative mt-4 mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "students" ? "Search by name, university, skills, or location..." : "Search by company name, industry, or location..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <TabsContent value="students">
            {isLoading ? (
              <StudentGridSkeleton />
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No students found</p>
                <p className="text-sm">Try adjusting your search terms.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((student, i) => (
                  <motion.div
                    key={student.user_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-14 w-14 shrink-0">
                            <AvatarImage src={student.avatar_url ?? undefined} />
                            <AvatarFallback className="brand-gradient text-white text-sm font-semibold">
                              {getInitials(student.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <ProfileLink userId={student.user_id} type="student" className="font-semibold text-foreground truncate block">
                                  {student.full_name || "Student"}
                                </ProfileLink>
                                {student.university && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                      {student.major ? `${student.major} · ` : ""}
                                      {student.university}
                                    </span>
                                  </p>
                                )}
                                {student.location && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{student.location}</span>
                                  </p>
                                )}
                              </div>
                              <FollowButton targetUserId={student.user_id} />
                            </div>
                            {student.skills && student.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {student.skills.slice(0, 4).map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {student.skills.length > 4 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{student.skills.length - 4}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="companies">
            {isLoadingCompanies ? (
              <StudentGridSkeleton />
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No companies found</p>
                <p className="text-sm">Try adjusting your search terms.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredCompanies.map((company, i) => (
                  <motion.div
                    key={company.user_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-14 w-14 shrink-0">
                            <AvatarImage src={company.logo_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                              {getInitials(company.company_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <ProfileLink userId={company.user_id} type="employer" className="font-semibold text-foreground truncate block">
                                  {company.company_name || "Company"}
                                </ProfileLink>
                                {company.industry && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{company.industry}</span>
                                  </p>
                                )}
                                {(company.city || company.state) && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                      {[company.city, company.state].filter(Boolean).join(", ")}
                                    </span>
                                  </p>
                                )}
                              </div>
                              <FollowButton targetUserId={company.user_id} />
                            </div>
                            {company.company_size && (
                              <Badge variant="secondary" className="text-xs mt-3">
                                {company.company_size} employees
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDiscovery;
