import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Code2, Database, Brain, Palette, Megaphone, Briefcase, LineChart, Cpu } from "lucide-react";
import { LANDING_CATEGORIES } from "./landingData";

const ICONS: Record<string, typeof Code2> = {
  frontend: Code2,
  backend: Database,
  "ai-ml": Brain,
  "data-science": LineChart,
  design: Palette,
  marketing: Megaphone,
  product: Briefcase,
  fintech: Cpu,
};

const CATEGORIES = LANDING_CATEGORIES.map((c) => ({ ...c, Icon: ICONS[c.slug] ?? Briefcase }));

const LandingCategories = () => (
  <motion.section
    className="border-t py-24"
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.6 }}
    aria-labelledby="categories-heading"
  >
    <div className="container">
      <div className="mx-auto max-w-2xl text-center mb-14">
        <h2 id="categories-heading" style={{ font: "var(--text-section)", letterSpacing: "var(--letter-spacing-heading)" }}>
          Popular internship categories
        </h2>
        <p className="mt-4 text-muted-foreground" style={{ font: "var(--text-body)" }}>
          Explore internships across engineering, design, data, marketing and more — curated for students in India.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map(({ slug, label, desc, Icon }) => (
          <Link
            key={slug}
            to={`/internships?category=${slug}`}
            className="card-depth p-6 group transition-all hover:-translate-y-0.5"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl brand-gradient text-white shadow-md shadow-primary/15">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-display font-semibold text-base group-hover:text-primary transition-colors">
              {label}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  </motion.section>
);

export default LandingCategories;
