import { Skeleton } from "@/components/ui/skeleton";

/** Full-page skeleton used by Dashboard/ProtectedRoute redirects */
export const PageLoadingSkeleton = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="w-full max-w-md space-y-6 px-4">
      <Skeleton className="mx-auto h-10 w-10 rounded-full" />
      <Skeleton className="mx-auto h-4 w-48" />
      <Skeleton className="mx-auto h-3 w-32" />
    </div>
  </div>
);

/** Profile page skeleton (student / employer) */
export const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="card-depth p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-20 w-20 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
    <div className="card-depth p-6 space-y-3">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    <div className="card-depth p-6 space-y-3">
      <Skeleton className="h-5 w-20" />
      <div className="flex flex-wrap gap-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
    </div>
  </div>
);

/** Internship card skeleton */
export const InternshipCardSkeleton = () => (
  <div className="card-depth p-6 space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-4 w-2/5" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full shrink-0" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
  </div>
);

/** List of internship card skeletons */
export const InternshipListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <InternshipCardSkeleton key={i} />
    ))}
  </div>
);

/** Notification row skeleton */
export const NotificationSkeleton = () => (
  <div className="space-y-2">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="card-depth p-4 flex items-start gap-3">
        <Skeleton className="mt-1 h-2 w-2 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    ))}
  </div>
);

/** My internships skeleton (employer) */
export const MyInternshipsSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="card-depth p-6 flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    ))}
  </div>
);

/** Student discovery card skeleton */
export const StudentCardSkeleton = () => (
  <div className="card-depth p-6 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-12 rounded-full" />
    </div>
  </div>
);

/** Student grid skeleton */
export const StudentGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2">
    {[...Array(count)].map((_, i) => (
      <StudentCardSkeleton key={i} />
    ))}
  </div>
);

/** Group card skeleton */
export const GroupCardSkeleton = () => (
  <div className="card-depth p-6 space-y-3">
    <div className="flex items-start justify-between">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-9 w-full" />
  </div>
);

/** Groups grid skeleton */
export const GroupGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2">
    {[...Array(count)].map((_, i) => (
      <GroupCardSkeleton key={i} />
    ))}
  </div>
);

/** Community groups list skeleton */
export const CommunityGroupsSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-8 w-28" />
    </div>
    <Skeleton className="h-10 w-full" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card-depth p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  </div>
);

/** PeerUp circle bubbles skeleton */
export const CircleBubblesSkeleton = () => (
  <div className="flex items-center gap-5 overflow-hidden pb-3 px-1">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-1.5 min-w-[72px]">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-3 w-12" />
      </div>
    ))}
  </div>
);

/** Internship detail page skeleton */
export const InternshipDetailSkeleton = () => (
  <div className="space-y-8">
    <div className="space-y-3">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-48" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-wrap gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-full" />
        ))}
      </div>
    </div>
    <Skeleton className="h-12 w-full rounded-lg" />
  </div>
);

/** Applicant review skeleton */
export const ApplicantListSkeleton = () => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-24" />
    </div>
    {[...Array(4)].map((_, i) => (
      <div key={i} className="card-depth p-6 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

/** Admin verification skeleton */
export const AdminVerificationSkeleton = () => (
  <div className="space-y-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="card-depth p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    ))}
  </div>
);

/** Skill tests grid skeleton */
export const SkillTestsSkeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="card-depth p-6 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-full" />
      </div>
    ))}
  </div>
);
