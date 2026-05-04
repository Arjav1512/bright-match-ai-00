// Map of route paths -> dynamic import for that page chunk.
// Used by Navbar/links to prefetch the JS chunk on hover/focus so the
// subsequent click renders instantly instead of waiting on a network round trip.
const routeImporters: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/profile": () => import("@/pages/Profile"),
  "/internships": () => import("@/pages/Internships"),
  "/my-applications": () => import("@/pages/MyApplications"),
  "/post-internship": () => import("@/pages/PostInternship"),
  "/my-internships": () => import("@/pages/MyInternships"),
  "/notifications": () => import("@/pages/Notifications"),
  "/groups": () => import("@/pages/Groups"),
  "/students": () => import("@/pages/StudentDiscovery"),
  "/skill-tests": () => import("@/pages/SkillTests"),
  "/campus": () => import("@/pages/CampusCommunity"),
  "/select-role": () => import("@/pages/SelectRole"),
  "/admin": () => import("@/pages/admin/AdminDashboard"),
  "/admin/users": () => import("@/pages/admin/AdminUsers"),
  "/admin/internships": () => import("@/pages/admin/AdminInternships"),
  "/admin/verification": () => import("@/pages/admin/AdminVerification"),
  "/admin/settings": () => import("@/pages/admin/AdminSettings"),
  "/about": () => import("@/pages/About"),
  "/blog": () => import("@/pages/Blog"),
  "/help": () => import("@/pages/Help"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  // Strip query/hash and trailing dynamic segments
  const clean = path.split("?")[0].split("#")[0];
  const importer = routeImporters[clean];
  if (!importer || prefetched.has(clean)) return;
  prefetched.add(clean);
  // Fire-and-forget; swallow errors so a failed prefetch never breaks UX.
  importer().catch(() => prefetched.delete(clean));
}
