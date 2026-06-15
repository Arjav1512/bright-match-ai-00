import { motion } from "framer-motion";
import { GraduationCap, Building2, Sparkles } from "lucide-react";

const VALUE_PROPS = [
  {
    Icon: GraduationCap,
    audience: "For students",
    title: "Land internships built around your skills",
    body:
      "Create a free Wroob profile, add the skills you actually have, and we surface internships where you already match the requirements. Apply with one click, track every application, and build a verifiable reputation score with each completed role and skill test.",
  },
  {
    Icon: Building2,
    audience: "For employers",
    title: "Hire interns who can ship from day one",
    body:
      "Post an internship in minutes and reach pre-vetted students across India. Every applicant arrives with a match percentage, a verified skill profile, and a public reputation score — so you spend less time screening resumes and more time interviewing the right people.",
  },
  {
    Icon: Sparkles,
    audience: "For universities & campuses",
    title: "Connect your students to real opportunities",
    body:
      "Wroob's hyperlocal PeerUp circles let students at the same campus discover each other, share leads, and team up on applications. Career cells get visibility into internship outcomes without any extra admin overhead.",
  },
];

const LandingValueProps = () => (
  <motion.section
    className="border-t py-24 section-alt"
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.6 }}
    aria-labelledby="value-props-heading"
  >
    <div className="container">
      <div className="mx-auto max-w-2xl text-center mb-14">
        <h2 id="value-props-heading" style={{ font: "var(--text-section)", letterSpacing: "var(--letter-spacing-heading)" }}>
          Built for students, employers and campuses
        </h2>
        <p className="mt-4 text-muted-foreground" style={{ font: "var(--text-body)" }}>
          Wroob is a skills-based internship platform connecting ambitious students in India with innovative companies through transparent matching, verified reputation, and hyperlocal community.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {VALUE_PROPS.map(({ Icon, audience, title, body }) => (
          <article key={audience} className="card-depth p-7">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl brand-gradient text-white shadow-md shadow-primary/15">
              <Icon className="h-5 w-5" />
            </div>
            <div className="mb-1 uppercase text-muted-foreground" style={{ font: "var(--text-label)", letterSpacing: "var(--letter-spacing-label)" }}>
              {audience}
            </div>
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{body}</p>
          </article>
        ))}
      </div>
    </div>
  </motion.section>
);

export default LandingValueProps;
