// Plain data extracted from landing section components so that Landing.tsx
// can build JSON-LD without statically importing (and bundling) the section
// components themselves — those are lazy-loaded.

export const LANDING_CATEGORIES = [
  { slug: "frontend", label: "Frontend Development", desc: "React, Vue, UI engineering internships" },
  { slug: "backend", label: "Backend Development", desc: "Node, Python, Go, APIs & databases" },
  { slug: "ai-ml", label: "AI / Machine Learning", desc: "LLMs, computer vision, applied ML roles" },
  { slug: "data-science", label: "Data Science", desc: "Analytics, SQL, modelling and dashboards" },
  { slug: "design", label: "Product & UX Design", desc: "Figma, design systems, user research" },
  { slug: "marketing", label: "Marketing & Growth", desc: "Content, performance, SEO, social" },
  { slug: "product", label: "Product Management", desc: "Associate PM and product ops internships" },
  { slug: "fintech", label: "Fintech & Web3", desc: "Payments, trading, on-chain product roles" },
] as const;

export const LANDING_FAQS = [
  {
    q: "How do internships on Wroob work?",
    a: "Students create a free profile with their skills, education, and preferences. Wroob's skills-based matching surfaces internships you already qualify for, shows a match percentage, and lets you apply in one click. Employers review applicants ranked by relevance, then message shortlisted candidates inside Wroob.",
  },
  {
    q: "Is Wroob free for students?",
    a: "Yes. Wroob is completely free for students — including browsing internships, applying, taking skill tests, joining campus circles, and messaging connections. There are no hidden fees or premium tiers required to land an internship.",
  },
  {
    q: "What kinds of internships are listed on Wroob?",
    a: "You'll find remote, on-site, and hybrid internships across software engineering (frontend, backend, AI/ML), data science, product, design, marketing, fintech and more. Roles range from short micro-internships to full-time multi-month positions, primarily across India.",
  },
  {
    q: "How does the Wroob reputation score work?",
    a: "Your Wroob Score (0–100) blends profile completeness, verified skill-test results, and completed internships. Employers see your score on every application, which helps strong candidates stand out regardless of their college pedigree.",
  },
  {
    q: "How do employers post internships on Wroob?",
    a: "Sign up as an employer, complete the company profile (including GSTIN/PAN for verification), and post an internship through the dashboard. Verified employers get an official badge that increases applicant trust and apply-through rate.",
  },
  {
    q: "Where is Wroob available?",
    a: "Wroob is built for the Indian internship market and lists opportunities from companies across cities like Bengaluru, Mumbai, Delhi NCR, Hyderabad, Pune and more — plus fully remote roles open to students anywhere in India.",
  },
] as const;
