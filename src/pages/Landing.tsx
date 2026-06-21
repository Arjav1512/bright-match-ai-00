import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

import { ArrowRight, Users, Search, CheckCircle, ArrowDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollProgress from "@/components/ScrollProgress";
import { LANDING_CATEGORIES, LANDING_FAQS } from "@/components/landing/landingData";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, useEffect, useState, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Below-the-fold sections — lazy so the hero paints faster.
const LandingCategories = lazy(() => import("@/components/landing/LandingCategories"));
const LandingValueProps = lazy(() => import("@/components/landing/LandingValueProps"));
const WhyChooseWroobSection = lazy(() => import("@/components/landing/WhyChooseWroobSection"));
const LandingFAQ = lazy(() => import("@/components/landing/LandingFAQ"));
const Footer = lazy(() => import("@/components/Footer"));


const FLOATING_TAGS = [
  { label: "Manufacturing", top: "10%", left: "4%", delay: 0, scale: 1.02, showOnMobile: true },
  { label: "Robotics", top: "15%", right: "4%", delay: 0.5, scale: 0.97, showOnMobile: true },
  { label: "Plant Operations", top: "35%", left: "5%", delay: 1.2, scale: 1.0, showOnMobile: false },
  { label: "Industrial Automation", bottom: "20%", left: "4%", delay: 0.8, scale: 1.04, showOnMobile: true },
  { label: "Supply Chain", top: "8%", left: "32%", delay: 1.5, scale: 0.96, showOnMobile: false },
  { label: "CNC Machining", bottom: "18%", right: "8%", delay: 0.3, scale: 1.01, showOnMobile: false },
  { label: "Quality Control", bottom: "30%", right: "2%", delay: 1.8, scale: 0.98, showOnMobile: true },
  { label: "Mechatronics", bottom: "12%", right: "4%", delay: 0.7, scale: 1.03, showOnMobile: true },
  { label: "Lean Manufacturing", bottom: "12%", left: "25%", delay: 1.1, scale: 0.99, showOnMobile: false },
  { label: "Production Engineering", top: "6%", right: "30%", delay: 1.4, scale: 1.0, showOnMobile: true },
  { label: "Industry 4.0", bottom: "22%", left: "3%", delay: 2.0, scale: 1.02, showOnMobile: false },
  { label: "Data Analytics", top: "25%", left: "18%", delay: 0.6, scale: 0.97, showOnMobile: false },
];

const HOW_STEPS = [
  { icon: Users, title: "Create your profile", desc: "Sign up, add your skills, experience, and what you're looking for." },
  { icon: Search, title: "Discover matches", desc: "Our skills-based matching surfaces the best opportunities for you." },
  { icon: CheckCircle, title: "Apply & connect", desc: "Apply with one click. Companies review candidates with match scores." },
];

const sectionReveal = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const Landing = () => {
  const { user, role } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Disable hero scroll-parallax on mobile / reduced-motion users — the
  // constant transform reads were the biggest source of style-recalc cost.
  const enableParallax = !isMobile && !prefersReducedMotion;
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, enableParallax ? 0.96 : 1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, enableParallax ? 0.3 : 1]);

  // On mobile or for reduced-motion users, skip the infinite y-bobbing that
  // drove >1s of style recalc. Hook count is preserved by always iterating
  // FLOATING_TAGS; only the rendered output is reduced via showOnMobile.
  const animateTags = !prefersReducedMotion && !isMobile;
  const mobileVisibleSlugs = new Set(
    FLOATING_TAGS.filter((t) => t.showOnMobile).slice(0, 4).map((t) => t.label),
  );

  const landingJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: LANDING_FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Popular internship categories on Wroob",
      itemListElement: LANDING_CATEGORIES.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.label,
        url: `https://wroob.in/internships?category=${c.slug}`,
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Your Internship Journey Starts (& Ends) Here — Find It, Build It, Land It"
        description="Start your career journey while you're still in college. So when interview day comes, companies pick you for the permanent role — not the temporary one. Build real skills, real experience, and a real shot at getting hired for keeps."
        path="/"
        jsonLd={landingJsonLd}
      />
      <ScrollProgress />
      <Navbar />
      <main>


      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36 min-h-[90vh] flex flex-col justify-center">
        {/* Layered background effects */}
        <div className="hero-glow left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2" />
        <div className="hero-glow-secondary right-[10%] top-[20%]" />
        <div className="hero-glow-tertiary left-[15%] bottom-[15%]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 hero-grid-pattern opacity-[0.03] pointer-events-none" />

        {/* Floating tags with parallax */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {FLOATING_TAGS.map((tag, i) => {
            const speed = 0.3 + (i % 4) * 0.15;
            const yTransform = useTransform(scrollYProgress, [0, 1], [0, enableParallax ? -80 * speed : 0]);
            const renderOnMobile = mobileVisibleSlugs.has(tag.label);
            const hiddenClass = isMobile
              ? (renderOnMobile ? "" : "hidden")
              : (tag.showOnMobile ? "" : "hidden md:block");
            return (
              <motion.div
                key={tag.label}
                className={`absolute pointer-events-auto ${hiddenClass}`}
                style={{
                  top: tag.top,
                  left: tag.left,
                  right: tag.right,
                  bottom: tag.bottom,
                  y: yTransform,
                }}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 0.7, y: 0, scale: tag.scale }}
                transition={{ delay: tag.delay, duration: 0.8 }}
              >
                <motion.div
                  className="glass rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-muted-foreground/70 shadow-sm cursor-pointer transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/35"
                  style={{ letterSpacing: "var(--letter-spacing-label)" }}
                  animate={animateTags ? { y: [0, -8, 0] } : undefined}
                  transition={animateTags ? { duration: 4 + tag.delay, repeat: Infinity, ease: "easeInOut" } : undefined}
                  whileHover={animateTags ? { scale: 1.1, y: -6, opacity: 1 } : undefined}
                >
                  {tag.label}
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <div className="container relative z-10">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            style={{ scale: heroScale, opacity: heroOpacity }}
          >
            {/* Eyebrow badge */}
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 mb-8"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-muted-foreground" style={{ font: "var(--text-label)", letterSpacing: "var(--letter-spacing-label)" }}>
                Connecting students with early internship opportunities
              </span>
            </motion.div>

            <motion.h1
              className="font-display font-bold"
              style={{ font: "var(--text-hero)", letterSpacing: "-0.035em", fontSize: "clamp(40px, 7vw, 76px)", lineHeight: "1.05" }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              Start your <span className="brand-gradient-text">career journey</span> while you're still in college
            </motion.h1>

            <motion.p
              className="mx-auto mt-6 md:mt-8 text-muted-foreground"
              style={{ font: "var(--text-body)", maxWidth: "560px", fontSize: "clamp(15px, 1.8vw, 18px)", lineHeight: "1.7" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              So when interview day comes, companies pick you for the permanent role — not the temporary one. Build real skills, real experience, and a real shot at getting hired for keeps.
            </motion.p>


            {/* Hero CTAs */}
            <motion.div
              className="mt-10 md:mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
            >
              <Button size="lg" className="gap-2.5 rounded-full h-14 px-10 text-base brand-gradient border-0 text-white shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 transition-all duration-300 hover:-translate-y-1 active:scale-[0.97]" asChild>
                <Link to={user ? "/dashboard" : "/signup"}>
                  {user ? "Go to Dashboard" : "Get Started Free"} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" className="gap-2 rounded-full h-14 px-8 text-base border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 hover:-translate-y-0.5" asChild>
                  <Link to="/internships">
                    Browse Internships
                  </Link>
                </Button>
              )}
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className="mt-14 md:mt-16 flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              <div className="flex items-center -space-x-2">
                {[
                  "bg-gradient-to-br from-blue-400 to-blue-600",
                  "bg-gradient-to-br from-emerald-400 to-emerald-600",
                  "bg-gradient-to-br from-violet-400 to-violet-600",
                  "bg-gradient-to-br from-amber-400 to-amber-600",
                  "bg-gradient-to-br from-rose-400 to-rose-600",
                ].map((bg, i) => (
                  <motion.div
                    key={i}
                    className={`h-8 w-8 rounded-full ${bg} ring-2 ring-background flex items-center justify-center text-white font-medium`}
                    style={{ fontSize: "11px" }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.05 }}
                  >
                    {["JK", "AL", "MS", "RD", "TC"][i]}
                  </motion.div>
                ))}
              </div>
              <p className="text-muted-foreground/60" style={{ font: "var(--text-label)", letterSpacing: "var(--letter-spacing-label)" }}>
                Joined by ambitious students everywhere
              </p>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.5 }}
        >
          <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
        </motion.div>
      </section>

      {/* CTA section */}
      <motion.section
        className="border-t py-24 section-alt"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 style={{ font: "var(--text-section)", letterSpacing: "var(--letter-spacing-heading)" }}>
              Where students and companies connect
            </h2>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {(!user || role === "employer") && (
                <Button size="lg" className="min-w-[200px] gap-2 rounded-full text-base h-14 px-8 brand-gradient border-0 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]" asChild>
                  <Link to={user ? "/dashboard" : "/signup?role=employer"}>
                    {user ? "Go to Dashboard" : "Find your next hire"}
                  </Link>
                </Button>
              )}
              {(!user || role === "student") && (
                <Button size="lg" variant={!user ? "outline" : "default"} className={`min-w-[200px] gap-2 rounded-full text-base h-14 px-8 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 ${user ? "brand-gradient border-0 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30" : ""}`} asChild>
                  <Link to={user ? "/dashboard" : "/signup?role=student"}>
                    {user ? "Go to Dashboard" : "Find your next internship"}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* How it works — sticky scroll storytelling */}
      <motion.section
        className="border-t py-24"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 style={{ font: "var(--text-section)", letterSpacing: "var(--letter-spacing-heading)" }}>How it works</h2>
            <p className="mt-4 text-muted-foreground" style={{ font: "var(--text-body)" }}>Three simple steps to get started.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={i}
                className="group card-depth p-8 text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl brand-gradient text-white shadow-lg shadow-primary/20">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="mb-2 uppercase text-muted-foreground" style={{ font: "var(--text-label)", letterSpacing: "var(--letter-spacing-label)" }}>Step {i + 1}</div>
                <h3 style={{ font: "var(--text-card-title)", letterSpacing: "var(--letter-spacing-heading)" }}>{step.title}</h3>
                <p className="mt-3 text-muted-foreground" style={{ font: "var(--text-body)" }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Below-the-fold sections are code-split — they sit far below the LCP
          hero so deferring their JS shaves bytes off the critical path. */}
      <Suspense fallback={null}>
        {/* Internship categories (SEO + discovery) */}
        <LandingCategories />

        {/* Value props for students / employers / campuses */}
        <LandingValueProps />

        {/* Why Choose Wroob */}
        <WhyChooseWroobSection />

        {/* FAQ */}
        <LandingFAQ />
      </Suspense>

      {/* Social proof */}
      <motion.section
        className="border-t py-24 section-blue"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
              {[
                { value: "700+", label: "Students Joined" },
                { value: "200+", label: "Early Companies" },
                { value: "150+", label: "Internships Curated" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <div className="font-bold brand-gradient-text" style={{ font: "var(--text-section)", letterSpacing: "var(--letter-spacing-heading)" }}>{stat.value}</div>
                  <div className="mt-1" style={{ font: "var(--text-label)", letterSpacing: "var(--letter-spacing-label)" }}>{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Final CTA */}
      <motion.section
        className="border-t py-24"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 style={{ font: "var(--text-section)", letterSpacing: "var(--letter-spacing-heading)" }}>Ready to get started?</h2>
            <p className="mt-4 text-muted-foreground" style={{ font: "var(--text-body)" }}>Join early users already on Wroob.</p>
            <div className="mt-8">
              <Button size="lg" className="gap-2 rounded-full h-14 px-10 text-base brand-gradient border-0 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]" asChild>
              <Link to={user ? "/dashboard" : "/signup"}>
                  {user ? "Go to Dashboard" : "Get Started"} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.section>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Landing;
