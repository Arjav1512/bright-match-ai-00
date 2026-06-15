import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
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
];

const LandingFAQ = () => (
  <motion.section
    className="border-t py-24"
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.6 }}
    aria-labelledby="faq-heading"
  >
    <div className="container">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-12">
          <h2 id="faq-heading" style={{ font: "var(--text-section)", letterSpacing: "var(--letter-spacing-heading)" }}>
            Frequently asked questions
          </h2>
          <p className="mt-4 text-muted-foreground" style={{ font: "var(--text-body)" }}>
            Everything students and employers ask before getting started on Wroob.
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`landing-faq-${i}`}>
              <AccordionTrigger className="text-left font-medium">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </motion.section>
);

export const LANDING_FAQS = FAQS;
export default LandingFAQ;
