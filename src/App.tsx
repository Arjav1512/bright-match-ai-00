import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";
import { lazy, Suspense } from "react";

// Eagerly loaded (landing - first paint)
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

// Retry a dynamic import once, then reload the page so a stale index.html
// referencing an old chunk hash (after a redeploy) recovers automatically.
function lazyWithReload<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) {
  return lazy(() =>
    factory().catch((err) => {
      if (!sessionStorage.getItem("chunk-reload")) {
        sessionStorage.setItem("chunk-reload", "1");
        window.location.reload();
        return new Promise<T>(() => {});
      }
      throw err;
    })
  );
}

// Auth-overlay components — only needed once a user is signed in. Lazy-loading
// them shaves a meaningful chunk off first paint for landing/auth visitors.
const SessionTimeoutWarning = lazyWithReload(() =>
  import("@/components/SessionTimeoutWarning").then((m) => ({ default: m.SessionTimeoutWarning }))
);
const LoginGreeting = lazyWithReload(() => import("@/components/LoginGreeting"));
const ChatPopup = lazyWithReload(() => import("@/components/chat/ChatPopup"));


// Lazy loaded routes
const Login = lazyWithReload(() => import("./pages/Login"));
const Signup = lazyWithReload(() => import("./pages/Signup"));
const ForgotPassword = lazyWithReload(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithReload(() => import("./pages/ResetPassword"));
const Dashboard = lazyWithReload(() => import("./pages/Dashboard"));
const SelectRole = lazyWithReload(() => import("./pages/SelectRole"));
const Profile = lazyWithReload(() => import("./pages/Profile"));
const Internships = lazyWithReload(() => import("./pages/Internships"));
const InternshipDetail = lazyWithReload(() => import("./pages/InternshipDetail"));
const MyApplications = lazyWithReload(() => import("./pages/MyApplications"));
const PostInternship = lazyWithReload(() => import("./pages/PostInternship"));
const MyInternships = lazyWithReload(() => import("./pages/MyInternships"));
const ApplicantReview = lazyWithReload(() => import("./pages/ApplicantReview"));
const Notifications = lazyWithReload(() => import("./pages/Notifications"));
const AdminDashboard = lazyWithReload(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazyWithReload(() => import("./pages/admin/AdminUsers"));
const AdminInternships = lazyWithReload(() => import("./pages/admin/AdminInternships"));
const AdminSettings = lazyWithReload(() => import("./pages/admin/AdminSettings"));
const AdminVerification = lazyWithReload(() => import("./pages/admin/AdminVerification"));
const About = lazyWithReload(() => import("./pages/About"));
const Blog = lazyWithReload(() => import("./pages/Blog"));
const BlogPost = lazyWithReload(() => import("./pages/BlogPost"));
const Help = lazyWithReload(() => import("./pages/Help"));
const EditInternship = lazyWithReload(() => import("./pages/EditInternship"));
const Terms = lazyWithReload(() => import("./pages/Terms"));
const Privacy = lazyWithReload(() => import("./pages/Privacy"));
const Groups = lazyWithReload(() => import("./pages/Groups"));
const StudentDiscovery = lazyWithReload(() => import("./pages/StudentDiscovery"));
const SkillTests = lazyWithReload(() => import("./pages/SkillTests"));
const CampusCommunity = lazyWithReload(() => import("./pages/CampusCommunity"));

const StudentProfile = lazyWithReload(() => import("./pages/StudentProfile"));
const EmployerProfile = lazyWithReload(() => import("./pages/EmployerProfile"));
const OnboardingProfile = lazyWithReload(() => import("./pages/onboarding/OnboardingProfile"));
const OnboardingCulture = lazyWithReload(() => import("./pages/onboarding/OnboardingCulture"));
const OnboardingResume = lazyWithReload(() => import("./pages/onboarding/OnboardingResume"));
const OnboardingDone = lazyWithReload(() => import("./pages/onboarding/OnboardingDone"));
const EmployerOnboardingCompany = lazyWithReload(() => import("./pages/employer-onboarding/EmployerOnboardingCompany"));
const EmployerOnboardingLocation = lazyWithReload(() => import("./pages/employer-onboarding/EmployerOnboardingLocation"));
const EmployerOnboardingManager = lazyWithReload(() => import("./pages/employer-onboarding/EmployerOnboardingManager"));
const EmployerOnboardingLegal = lazyWithReload(() => import("./pages/employer-onboarding/EmployerOnboardingLegal"));
const EmployerOnboardingVerify = lazyWithReload(() => import("./pages/employer-onboarding/EmployerOnboardingVerify"));
const EmployerOnboardingTeam = lazyWithReload(() => import("./pages/employer-onboarding/EmployerOnboardingTeam"));
const EmployerOnboardingDone = lazyWithReload(() => import("./pages/employer-onboarding/EmployerOnboardingDone"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached results stay fresh for 5 minutes and are kept in memory for 30 minutes,
      // so navigating between tabs reuses data instantly instead of refetching.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // Don't retry auth-gated queries that will keep failing while unauthenticated
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Suspense fallback={null}>
            <SessionTimeoutWarning />
            <LoginGreeting />
            <ChatPopup />
          </Suspense>
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/select-role" element={<ProtectedRoute><SelectRole /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/internships" element={<Internships />} />
              <Route path="/internships/:id" element={<InternshipDetail />} />
              <Route path="/my-applications" element={<ProtectedRoute allowedRoles={["student"]}><MyApplications /></ProtectedRoute>} />
              <Route path="/post-internship" element={<ProtectedRoute allowedRoles={["employer"]}><PostInternship /></ProtectedRoute>} />
              <Route path="/my-internships" element={<ProtectedRoute allowedRoles={["employer"]}><MyInternships /></ProtectedRoute>} />
              <Route path="/internships/:id/edit" element={<ProtectedRoute allowedRoles={["employer"]}><EditInternship /></ProtectedRoute>} />
              <Route path="/internships/:id/applicants" element={<ProtectedRoute allowedRoles={["employer"]}><ApplicantReview /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute allowedRoles={["student", "employer"]}><StudentDiscovery /></ProtectedRoute>} />
              <Route path="/skill-tests" element={<ProtectedRoute allowedRoles={["student"]}><SkillTests /></ProtectedRoute>} />
              <Route path="/campus" element={<ProtectedRoute allowedRoles={["student"]}><CampusCommunity /></ProtectedRoute>} />
              
              <Route path="/student/:userId" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
              <Route path="/employer/:userId" element={<ProtectedRoute><EmployerProfile /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/internships" element={<ProtectedRoute allowedRoles={["admin"]}><AdminInternships /></ProtectedRoute>} />
              <Route path="/admin/verification" element={<ProtectedRoute allowedRoles={["admin"]}><AdminVerification /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>} />
              {/* Student onboarding */}
              <Route path="/onboarding/profile" element={<ProtectedRoute allowedRoles={["student"]}><OnboardingProfile /></ProtectedRoute>} />
              <Route path="/onboarding/culture" element={<ProtectedRoute allowedRoles={["student"]}><OnboardingCulture /></ProtectedRoute>} />
              <Route path="/onboarding/resume" element={<ProtectedRoute allowedRoles={["student"]}><OnboardingResume /></ProtectedRoute>} />
              <Route path="/onboarding/done" element={<ProtectedRoute allowedRoles={["student"]}><OnboardingDone /></ProtectedRoute>} />
              {/* Employer onboarding */}
              <Route path="/employer/onboarding/company" element={<ProtectedRoute allowedRoles={["employer"]}><EmployerOnboardingCompany /></ProtectedRoute>} />
              <Route path="/employer/onboarding/location" element={<ProtectedRoute allowedRoles={["employer"]}><EmployerOnboardingLocation /></ProtectedRoute>} />
              <Route path="/employer/onboarding/manager" element={<ProtectedRoute allowedRoles={["employer"]}><EmployerOnboardingManager /></ProtectedRoute>} />
              <Route path="/employer/onboarding/legal" element={<ProtectedRoute allowedRoles={["employer"]}><EmployerOnboardingLegal /></ProtectedRoute>} />
              <Route path="/employer/onboarding/verify" element={<ProtectedRoute allowedRoles={["employer"]}><EmployerOnboardingVerify /></ProtectedRoute>} />
              <Route path="/employer/onboarding/team" element={<ProtectedRoute allowedRoles={["employer"]}><EmployerOnboardingTeam /></ProtectedRoute>} />
              <Route path="/employer/onboarding/done" element={<ProtectedRoute allowedRoles={["employer"]}><EmployerOnboardingDone /></ProtectedRoute>} />
              {/* Legacy route redirect */}
              <Route path="/employer/onboarding/details" element={<ProtectedRoute allowedRoles={["employer"]}><EmployerOnboardingLocation /></ProtectedRoute>} />
              <Route path="/about" element={<About />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/help" element={<Help />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
