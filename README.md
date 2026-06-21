# Wroob — Find Your Perfect Internship

**[wroob.in](https://wroob.in)** · Skills-based internship matching for students and companies

---

Most internship platforms dump you a list of listings and wish you luck. Wroob does something different: it matches students to internships based on actual skills, not just keywords on a CV.

The focus is manufacturing and industry. Factory floor roles. Hands-on work with real machines, supervised by real engineers. Not another "social media intern wanted" listing.

---

## What makes it different

**Factory floor internships only.** No office fluff. Students get placed in actual manufacturing environments — CNC, welding, QA, production lines.

**Machine Resume.** Wroob tracks which machines and equipment a student has worked on across internships. By the end, that list is worth more than a degree certificate to most shop floors.

**Industry-verified badges.** Skills like CNC operation or QA inspection get verified by supervisors on-site, not self-reported on a form.

**Wroob Score.** A running industrial rating built from machines worked on, internship count, and supervisor ratings. Gamified, but grounded in real output.

**Safety induction before day one.** Mandatory safety training is required before any student sets foot on a factory floor. Non-negotiable.

**Stipend in escrow.** Students get paid. The stipend is guaranteed and held in escrow before the internship starts, so there's no chasing companies for payment at the end.

**Mentor assigned.** Every intern gets a mentor from the shop floor with weekly check-ins built in.

**College portal.** Colleges can track their students' placements, attendance, and milestones. Useful for compliance and genuinely useful for placement cells.

**Pan-India manufacturing map.** Visual map of internship availability by location and sector.

---

## Numbers so far

- **700+** students joined
- **200+** early companies
- **150+** internships curated

---

## For students

- Browse internships with a match score so you know where you stand before applying
- One-click applications with resume and cover letter
- Skill tests to prove what you know, not just what you wrote on your profile
- Campus communities, peer groups, direct messaging with companies
- Your Machine Resume grows with every placement

## For employers

- Post internships with required skills and filters
- Review applicants with per-candidate match scores
- Shortlist, interview, accept — all in one place
- Company onboarding with verification (verified companies show up differently to students)

---

## Tech stack

| What | How |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Backend & DB | Supabase (Postgres + Realtime + Edge Functions) |
| Auth | Supabase Auth via Lovable Cloud |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 |
| AI matching | Supabase Edge Function scoring skills, location, and interest fit |

---

## Getting started

```bash
git clone https://github.com/Arjav1512/bright-match-ai-00.git
cd bright-match-ai-00-main

npm install

cp .env.example .env
# Fill in your Supabase credentials

npm run dev
```

App runs at `http://localhost:5173`. Sign up as a student or employer to see the full flow.

### Environment variables

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Get both from **Supabase → Project Settings → API**. The anon key is safe to expose in frontend code. The service role key is never referenced here.

---

## Project layout

```
src/
├── components/
│   ├── chat/                 # DM popup, conversation list, active chat
│   ├── internship/           # Internship form (posting + editing)
│   ├── onboarding/           # Step layouts for student and employer flows
│   ├── peerup/               # Peer discovery (circles, bubbles)
│   ├── groups/               # Group chat, location-based groups
│   └── admin/                # Admin sidebar and layout
├── pages/
│   ├── onboarding/           # Student onboarding steps
│   ├── employer-onboarding/  # Employer onboarding steps
│   └── admin/                # Admin-only pages
└── App.tsx

supabase/
├── functions/                # Edge functions
└── migrations/               # DB schema in order
```

---

## How matching works

The `ai-recommendations` edge function scores every internship against a student's profile:

- **Skill match** — overlap between student skills and internship requirements
- **Location match** — student location vs. internship location (remote = full score)
- **Interest alignment** — preferred roles, work type, culture fit answers

These combine into a single score. Students see ranked results. Employers see scores when reviewing applicants.

Rate limited to 10 calls/hour per user, enforced atomically at the DB level.

---

## Edge functions

| Function | What it does |
|---|---|
| `ai-recommendations` | Scores and ranks internship matches for a student |
| `apply-to-internship` | Atomic application with rate limiting and role enforcement |
| `skill-tests` | Generates and scores skill test questions |
| `student-reputation` | Calculates the Wroob Score |
| `campus-status` | Campus verification and community status |
| `geo-group-assign` | Assigns users to location-based groups |
| `recommendation-feedback` | Thumbs up/down on AI match results |
| `send-email` | Emails sent to the authenticated user only |
| `admin-broadcast` | Admin-only mass notifications |
| `admin-list-users` | Admin-only user listing |

---

## Security

A full audit was done before launch (April 2026). Things that were found and fixed:

- DM messages were leaking to all subscribers — now per-user Realtime channels with server-side filters
- Employers could submit applications — fixed with a role check in the edge function
- Students could apply to draft internships — blocked at SQL level
- Resume downloads were 403ing — fixed by storing storage paths and generating signed URLs at request time
- Onboarding steps had silent DB failures causing redirect loops — all fixed with error capture
- Employer profile queries were exposing GSTIN, PAN, CIN, and other sensitive fields — now explicit field selection

Full details in `AUDIT_CONTEXT.md`.

---

## Roles

Three roles, enforced via Postgres RLS — not just frontend guards:

- **Student** — browse, apply, take skill tests, join communities
- **Employer** — post internships, review applicants, manage company profile
- **Admin** — full moderation, broadcasting, user management

Role is set during onboarding. It cannot be escalated from the client side.

---

## Tests

```bash
npm test
```

Tests in `src/test/` cover route protection and security edge cases.

---

## Roadmap

- AI-generated cover letter suggestions
- Resume parsing and auto-fill
- Internship outcome tracking (full-time conversion rates)
- University partnerships + verified student IDs
- Recruiter direct messaging

---

## Contributing

Open an issue or PR. The code is readable — start in `src/pages/` or `src/components/` depending on what you're after.

---

## Links

- Website: [wroob.in](https://wroob.in)
- Instagram: [@wroob.in](https://www.instagram.com/wroob.in/)
- LinkedIn: [wroob.in](https://www.linkedin.com/company/wroob-in/)
