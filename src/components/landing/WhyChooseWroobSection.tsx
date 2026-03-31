import { useRef, memo } from "react";
import { motion } from "framer-motion";
import {
  Factory, Cpu, ShieldCheck, Users, LayoutDashboard,
  FileText, Trophy, GraduationCap, Map, HardHat,
  Wallet, Network
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface WhyCard {
  title: string;
  tag: string;
  description: string;
  wroobLabel: string;
  othersLabel: string;
  icon: LucideIcon;
}

const WHY_CARDS: WhyCard[] = [
  {
    title: "Factory Floor Internships Only",
    tag: "Wroob's #1 USP",
    description: "Hands-on factory internships, not office roles",
    wroobLabel: "Factory-first",
    othersLabel: "Office-heavy",
    icon: Factory,
  },
  {
    title: "Real-Time Machine & Equipment Tracker",
    tag: "Never done before",
    description: 'Logs machines/tools worked on → verified "Machine Resume"',
    wroobLabel: "Machine Resume",
    othersLabel: "Just certificates",
    icon: Cpu,
  },
  {
    title: "Industry-Verified Skill Badges",
    tag: "Trust & credibility",
    description: "Supervisor-verified skills (CNC, Welding, QA)",
    wroobLabel: "Company-verified",
    othersLabel: "Self-declared",
    icon: ShieldCheck,
  },
  {
    title: "Mentor from the Shop Floor",
    tag: "Guidance built-in",
    description: "Assigned mentor + weekly check-ins",
    wroobLabel: "Assigned mentor",
    othersLabel: "No mentorship",
    icon: Users,
  },
  {
    title: "Live Industry Project Dashboard",
    tag: "Transparency first",
    description: "Track tasks, attendance, milestones, feedback",
    wroobLabel: "Live tracking",
    othersLabel: "No visibility",
    icon: LayoutDashboard,
  },
  {
    title: "Smart Internship Report Generator",
    tag: "Student time-saver",
    description: "Auto-generate reports from logs",
    wroobLabel: "Auto-report",
    othersLabel: "Do it yourself",
    icon: FileText,
  },
  {
    title: "Wroob Score (Industrial Rating)",
    tag: "Gamified growth",
    description: "Score based on machines, internships, ratings",
    wroobLabel: "Industry score",
    othersLabel: "No such metric",
    icon: Trophy,
  },
  {
    title: "College Partnership Portal",
    tag: "B2B growth engine",
    description: "College dashboard for tracking & compliance",
    wroobLabel: "College portal",
    othersLabel: "Student only",
    icon: GraduationCap,
  },
  {
    title: "Pan-India Manufacturing Map",
    tag: "Discovery feature",
    description: "Visual map of internships by location/sector",
    wroobLabel: "Visual map",
    othersLabel: "Text list only",
    icon: Map,
  },
  {
    title: "Safety Induction & Compliance",
    tag: "Industry-grade trust",
    description: "Mandatory safety training before internship",
    wroobLabel: "Safety-first",
    othersLabel: "No safety prep",
    icon: HardHat,
  },
  {
    title: "Stipend Guarantee & Escrow",
    tag: "Student protection",
    description: "Guaranteed stipend via escrow",
    wroobLabel: "Guaranteed pay",
    othersLabel: "No protection",
    icon: Wallet,
  },
  {
    title: "Alumni & Senior Network",
    tag: "Community moat",
    description: "Alumni help, referrals, job sharing",
    wroobLabel: "Alumni network",
    othersLabel: "No community",
    icon: Network,
  },
];

const TAG_COLORS = [
  "bg-amber-500/15 text-amber-400",
  "bg-violet-500/15 text-violet-400",
  "bg-sky-500/15 text-sky-400",
  "bg-emerald-500/15 text-emerald-400",
  "bg-rose-500/15 text-rose-400",
  "bg-indigo-500/15 text-indigo-400",
];

const WhyCardComponent = memo(({ card, index }: { card: WhyCard; index: number }) => {
  const Icon = card.icon;
  const tagColor = TAG_COLORS[index % TAG_COLORS.length];

  return (
    <motion.div
      className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 sm:p-6 flex flex-col gap-4 group hover:border-primary/20 transition-colors duration-300"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.4 }}
      whileHover={{ y: -4 }}
    >
      {/* Icon + Tag row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl brand-gradient text-white shadow-md shadow-primary/15">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${tagColor}`}>
          {card.tag}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-medium text-foreground leading-snug" style={{ font: "var(--text-card-title)" }}>
        {card.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        {card.description}
      </p>

      {/* Comparison pills */}
      <div className="flex items-center gap-2 pt-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {card.wroobLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          {card.othersLabel}
        </span>
      </div>
    </motion.div>
  );
});

WhyCardComponent.displayName = "WhyCardComponent";

const WhyChooseWroobSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <motion.section
      id="why-wroob"
      className="border-t py-16 sm:py-24 overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="container mb-10 sm:mb-14">
        <div className="mx-auto max-w-2xl text-center">
          <h2 style={{ font: "var(--text-section)", letterSpacing: "var(--letter-spacing-heading)" }}>
            Why Choose Wroob?
          </h2>
          <p className="mt-4 text-muted-foreground" style={{ font: "var(--text-body)" }}>
            Built for real industry experience
          </p>
        </div>
      </div>

      {/* Horizontal scroller */}
      <div className="relative">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-background to-transparent z-10" />

        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto px-6 sm:px-12 pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
          role="list"
          aria-label="Why Choose Wroob features"
        >
          {WHY_CARDS.map((card, i) => (
            <WhyCardComponent key={card.title} card={card} index={i} />
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default WhyChooseWroobSection;
