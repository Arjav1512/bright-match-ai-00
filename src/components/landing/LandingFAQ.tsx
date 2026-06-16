import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LANDING_FAQS } from "./landingData";

const FAQS = LANDING_FAQS;

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

export default LandingFAQ;
