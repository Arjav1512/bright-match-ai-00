

# Fix Backend Issues:<lov-plan>

# Fix Backend Issues: Internships Not Internships Not Displaying + Displaying + Group Members Recursion

## Problems Group Members Recursion

## Problems Identified Identified

From the network

From the network requests requests, there are **, there are **two critical backendtwo critical backend issues**:

### Issue issues**:

### Issue 1: Internships not 1: Internships not loading for loading for students (400 students (400 error)
The query error)
The query tries to join `internships` to tries to join `internships` to `employer_profiles` using `!internships_employer_id_fkey`, but that foreign key points to `auth.users`, not `employer_profiles`. PostgREST cannot resolve this join, so `employer_profiles` using `!internships_employer_id_fkey`, but that foreign key points to `auth.users`, not `employer_profiles`. PostgREST cannot resolve this join, so every intern every internship listing pageship listing page returns a 400 error.

Affected pages: Internships listing, Internship Detail, My Applications.

### Issue 2: Group members infinite recursion (500 error, polling every returns a 400 error.

Affected pages: Internships listing, Internship Detail, My Applications.

### Issue 2: Group members infinite recursion (500 error, polling every 30s 30s)
The `group_members` SELECT policy checks)
The `group_members` SELECT policy checks "is the current "is the current user a member of this group?" by user a member of this group?" by querying ` querying `group_members` itselfgroup_members` itself, creating infinite, creating infinite recursion. This fires recursion. This fires repeatedly repeatedly on polling on polling intervals.

---

## Fix intervals.

---

## Fix Plan

### Step Plan

### Step 1: Fix 1: Fix group_members R group_members RLS (databaseLS (database migration)
- Create migration)
- Create a ` a `SECURITY DEFINER` function `is_group_member(SECURITY DEFINER` function `is_group_member(groupgroup_id, user_id)` that checks membership_id, user_id)` that checks membership without triggering R without triggering RLS.LS.
- Drop the existing recursive
- Drop the existing recursive SELECT SELECT policy on ` policy on `group_members`.
- Create a new SELECTgroup_members`.
- Create a new SELECT policy using the security definer function. policy using the security definer function.
- Also fix
- Also fix the `groups` table SELECT the `groups` table SELECT policy which policy which has the same recurs has the same recursion pattern (ion pattern (it queriesit queries `group_members` which triggers `group_members` which triggers the recursive policy). the recursive policy).
- Fix
- Fix `group `group_messages` SELECT_messages` SELECT and INSERT policies similarly and INSERT policies similarly.

### Step 2: Fix internship.

### Step 2: Fix internship queries (frontend queries (frontend code changes code changes)
Since the)
Since the FK `internships_employer_id_f FK `internships_employer_id_fkey` points to `auth.users`key` points to `auth.users` (not `employer_profiles`), (not `employer_profiles`), the Post the PostgREST join hint isgREST join hint is invalid. The invalid. The fix is to change fix is to change the query pattern the query pattern in in 3 files to 3 files to fetch employer data fetch employer data separately (same separately (same pattern pattern already used already used in `AdminInternships. in `AdminInternships.tsx`):

-tsx`):

- **` **`src/pages/Internships.tsx`**:src/pages/Internships.tsx`**: Fetch internships, Fetch internships, then batch- then batch-fetch employer profiles by `fetch employer profiles by `user_id INuser_id IN (...)`, (...)`, merge client-side.
- **`src/pages/InternshipDetail.tsx`**: Fetch internship, then fetch employer profile by `user_id = employer merge client-side.
- **`src/pages/InternshipDetail.tsx`**: Fetch internship, then fetch employer profile by `user_id = employer_id`.
- **`src/pages/MyApplications.tsx`**: Fetch applications with internships_id`.
- **`src/pages/MyApplications.tsx`**: Fetch applications with internships, then fetch employer profiles separately, then fetch employer profiles separately.

### Step 3: Verify no other broken joins
Search for any other `!internships_employer_id_f.

### Step 3: Verify no other broken joins
Search for any other `!internships_employer_id_fkey` or similar broken FK hints and fix them.

---

## Technicalkey` or similar broken FK hints and fix them.

---

## Technical Details

**Security Details

**Security def definer function for group membershipiner function for group membership:**
```sql
CREATE:**
```sql
CREATE OR REPLACE FUNCTION public OR REPLACE FUNCTION public.is_group_member(_group_id uuid.is_group_member(_group_id uuid, _user_id uuid), _user_id uuid)
RETURNS boolean
LANGUAGE
RETURNS boolean
LANGUAGE sql sql STABLE STABLE SECURITY DEFINER
SET search_path = SECURITY DEFINER
SET search_path = public
AS $$ public
AS $$
  SELECT EXISTS
  SELECT EXISTS (
    SELECT 1 FROM public (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  ) user_id = _user_id
  )
$$;
```

**Replacement
$$;
```

**Replacement RLS policies RLS policies:**
-:**
- `group_members` SELECT `group_members` SELECT: `: `USING (publicUSING (public.is_group_member(group_id, auth.is_group_member(group_id, auth.uid()))`
- `groups.uid()))`
- `groups` SELECT: `USING (public.is_group_member(id` SELECT: `USING (public.is_group_member(id, auth.uid()))`
- `group_messages` SELECT/, auth.uid()))`
- `group_messages` SELECT/INSERT: use `INSERT: use `is_group_member`is_group_member` instead instead of subquery

**Query of subquery

**Query pattern change ( pattern change (Internships.tsx example):**Internships.tsx example):**
Fetch internships first, collect unique `employer_id`s, batch-fetch from `employer_profiles` by `user_id`, merge into
Fetch internships first, collect unique `employer_id`s, batch-fetch from `employer_profiles` by `user_id`, merge into results client results client-side.-side.

