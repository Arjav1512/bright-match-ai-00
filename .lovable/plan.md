
# AI-Native Internship Platform — Full Implementation Plan

## Overview
A platform connecting students with internship opportunities, featuring employer posting, student applications, skills-based matching, and admin moderation — all powered by Lovable Cloud (Supabase).

---

## Phase 1: Database & Auth Foundation

### Database Schema
- **profiles** table (linked to auth.users): name, bio, avatar_url, user type indicator
- **user_roles** table: role enum (student, employer, admin) — separate from profiles for security
- **student_profiles** table: university, major, graduation_year, skills (text array), resume_url
- **employer_profiles** table: company_name, industry, company_size, website, logo_url
- **internships** table: title, description, requirements, skills_required, location, type (remote/onsite/hybrid), status (draft/published/closed), deadline, employer_id
- **applications** table: student_id, internship_id, status (pending/reviewed/interview/accepted/rejected), cover_letter, applied_at
- **notifications** table: user_id, type, title, message, read status, link
- **Storage buckets**: resumes, avatars, company-logos

### Authentication
- Email/password signup with role selection (Student or Employer)
- Login, logout, password reset with `/reset-password` page
- Role-based route protection
- Auto-create profile + role on signup via database trigger

---

## Phase 2: Student Experience

### Student Dashboard
- **Profile page**: Edit personal info, university, skills (tag-based picker), upload/replace resume
- **Internship Discovery page**: Browse published internships with filters (skills, location, type, industry), search bar, pagination
- **Internship Detail page**: Full description, requirements, skill match indicator, "Apply" button
- **Application form**: Cover letter textarea, attach resume, submit
- **My Applications page**: List of applied internships with status badges (pending, interview, accepted, rejected), sort by date

---

## Phase 3: Employer Experience

### Employer Dashboard
- **Company Profile page**: Edit company info, upload logo
- **Post Internship page**: Form with title, description, required skills (tag picker), location, type, deadline, save as draft or publish
- **My Internships page**: List of posted internships with status, applicant count, edit/close actions
- **Applicant Review page**: For each internship — list of applicants with name, skills, match score, resume download, status update buttons (shortlist, interview, accept, reject)

---

## Phase 4: Skills-Based Matching

- Predefined skills taxonomy (tags stored in a skills table or enum)
- Students tag their skills on profile; employers tag required skills on internships
- **Match score calculation**: Percentage of required skills the student has (simple intersection-based scoring)
- Internship discovery sorted by match score for logged-in students
- Employer applicant list shows match score per candidate

---

## Phase 5: Notifications System

- In-app notification bell with unread count in the navbar
- Notifications triggered on: application submitted, status changed, new internship matching student skills
- Notification dropdown with mark-as-read functionality
- Notification preferences page (optional)

---

## Phase 6: Admin Panel

- **User Management**: View all users, filter by role, deactivate accounts
- **Internship Moderation**: Review/approve/reject internship posts, flag inappropriate content
- **Analytics Dashboard**: Total users (by role), total internships, total applications, charts showing trends over time (using Recharts)
- **Audit log**: Track admin actions (approvals, account changes)

---

## Phase 7: Shared UI & Navigation

- **Navbar**: Logo, role-based navigation links, notification bell, user avatar dropdown (profile, settings, logout)
- **Landing page**: Hero section, how-it-works steps, featured internships, CTA for students and employers
- **Responsive design**: Mobile-friendly across all pages
- **Loading states & error handling**: Skeleton loaders, toast notifications for actions, empty states
- **Dark mode support**

---

## Implementation Order
1. Lovable Cloud setup → Database schema + auth
2. Landing page + auth pages (signup, login, reset password)
3. Student profile + internship browsing
4. Employer profile + internship posting
5. Application system (apply + review)
6. Skills matching integration
7. Notifications
8. Admin panel
9. Polish (responsive, loading states, dark mode)
