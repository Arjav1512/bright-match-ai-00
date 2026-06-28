import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Target, Users, Zap, Linkedin } from "lucide-react";
import { motion } from "framer-motion";
import founderAsset from "@/assets/founder-jeetu.jpg.asset.json";

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
    <section className="border-t py-20 section-alt">
      <div className="container">
        <h2 className="font-display text-2xl font-bold text-center md:text-3xl">Meet the Founder</h2>
        <div className="mt-12 mx-auto max-w-4xl">
          <motion.div
            className="card-depth overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid md:grid-cols-[280px_1fr] gap-8 p-8 md:p-12 items-center">
              <div className="mx-auto md:mx-0">
                <div className="h-48 w-48 md:h-64 md:w-64 rounded-full overflow-hidden border-4 border-border bg-muted flex items-center justify-center">
                  <img
                    src={founderAsset.url}
                    alt="Jeetu Sharma"
                    className="h-full w-full object-cover object-[center_top]"
                  />
                </div>
              </div>
              <div className="text-center md:text-left">
                <h3 className="font-display text-2xl font-bold">Jeetu Sharma</h3>
                <p className="mt-1 text-primary font-medium">Founder &amp; CEO</p>
                <p className="mt-2 text-sm text-muted-foreground">B.Tech (Electrical Engineer) | MBA (Marketing)</p>
                <blockquote className="mt-6 text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-4">
                  &ldquo;My vision is to eliminate the gap between education and employment. Students shouldn&apos;t have to wait until graduation to gain industry experience. Wroob is being built to become India&apos;s most trusted Learning-to-Earning platform where students, colleges, and industries grow together.&rdquo;
                </blockquote>
                <a
                  href="https://www.linkedin.com/in/jeetu-sharma-4a2473212"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-6 text-primary hover:underline font-medium"
                >
                  <Linkedin className="h-4 w-4" />
                  Connect on LinkedIn
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
    <Footer />
  </div>
);

export default About;
