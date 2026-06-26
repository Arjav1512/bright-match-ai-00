import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Target, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";

const VALUES = [
  { icon: Target, title: "Sourcing & Marketing", desc: "Connecting students with verified internship and project opportunities aligned to their skills and career direction." },
  { icon: Users, title: "Skill Development", desc: "Equipping students with practical, job-ready capability through real work, not simulated coursework." },
  { icon: Zap, title: "Placement Conversion", desc: "Enabling colleges and industry partners to convert proven interns into full-time hires, reducing hiring risk and onboarding time." },
];

const About = () => (
  <div className="min-h-screen bg-background">
    <SEO title="About Wroob — Skills-based internship platform" description="Learn about Wroob's mission to connect ambitious students with innovative companies through skills-based internship matching across India." path="/about" />
    <Navbar />
    <section className="py-20">
      <div className="container">
        <motion.div className="mx-auto max-w-2xl text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            About <span className="brand-gradient-text">Wroob</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Wroob is a workforce-readiness platform engineered to close the gap between classroom learning and industry-ready employment. We operate at the intersection of three stakeholders — students, colleges, and industry — and build the systems, partnerships, and pipelines that let them function as one connected production line for talent, rather than three disconnected processes. Our approach is structured the way a manufacturing operation is structured: a defined input (students), a controlled process (skill-building, internships, real project work), and a measurable output (industry-ready professionals who convert from temporary roles into permanent ones). Every stage is built for consistency, traceability, and quality — not chance.
          </p>
        </motion.div>
      </div>
    </section>

    <section className="border-t py-20 section-alt">
      <div className="container">
        <h2 className="font-display text-2xl font-bold text-center md:text-3xl">Our Mission</h2>
        <div className="mx-auto mt-8 max-w-2xl space-y-4 text-muted-foreground leading-relaxed">
          <p>To give every student the opportunity to begin their career while still in college — so that by the time the interview happens, they are being selected for a permanent role, not a temporary one. We exist to make industry experience a standard part of education, not an afterthought to it.</p>
        </div>
      </div>
    </section>

    <section className="border-t py-20">
      <div className="container">
        <h2 className="font-display text-2xl font-bold text-center md:text-3xl">What We Do</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <motion.div key={i} className="card-depth p-8 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl brand-gradient text-white">
                <v.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
    <Footer />
  </div>
);

export default About;
