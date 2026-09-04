import { Link } from "react-router-dom";
import { Instagram, Linkedin, Github, Youtube, Facebook } from "lucide-react";
import wroobeLogo from "@/assets/wroob-logo.webp";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const QuoraIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12.02 2C6.9 2 3.2 5.83 3.2 10.97c0 5.13 3.7 8.96 8.82 8.96 1.02 0 2-.15 2.9-.44.7.98 1.6 1.86 2.9 2.31l1.16-2.06c-.7-.3-1.26-.75-1.7-1.3 1.9-1.6 3.06-4.1 3.06-7.47C20.34 5.83 17.14 2 12.02 2zm0 15.3c-1.03 0-1.9-.28-2.6-.8l1.1-1.9c.4.28.88.43 1.42.43.5 0 .95-.12 1.35-.35l1.1 1.9c-.7.47-1.5.72-2.37.72zm3.5-3.1-1.1-1.9c.5-.72.78-1.7.78-2.9 0-2.72-1.36-4.4-3.2-4.4s-3.18 1.68-3.18 4.4c0 2.73 1.35 4.42 3.19 4.42.2 0 .4-.02.58-.06l-.9-1.55h2.1l.34.6c.5-.9.78-2.06.78-3.4 0-1.35-.28-2.5-.78-3.4z" />
  </svg>
);

const socials = [
  { Icon: XIcon, label: "X", href: "https://x.com/yourwroob" },
  { Icon: Instagram, label: "Instagram", href: "https://www.instagram.com/wroob.in/" },
  { Icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/company/wroob-in/" },
  { Icon: Github, label: "GitHub", href: "https://github.com/yourwroob" },
  { Icon: QuoraIcon, label: "Quora", href: "https://www.quora.com/profile/Wroob" },
  { Icon: Youtube, label: "YouTube", href: "https://www.youtube.com/@wroobofficial" },
  { Icon: Facebook, label: "Facebook", href: "https://www.facebook.com/wroob.in" },
];

const columns = [
  {
    title: "Explore",
    links: [
      { label: "Browse Internships", href: "/internships" },
      { label: "For Students", href: "/signup?role=student" },
      { label: "For Companies", href: "/signup?role=employer" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Help Center", href: "/help" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">
          {/* Brand */}
          <div className="max-w-xs">
            <img
              src={wroobeLogo}
              alt="Wroob"
              width="139"
              height="56"
              loading="lazy"
              decoding="async"
              className="h-11 w-auto brightness-0 invert"
            />
            <p className="mt-4 text-[13px] leading-6 text-background/60">
              Skills-based internship matching for students and companies.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
              {socials.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  className="inline-flex h-5 w-5 items-center justify-center text-background/55 transition-colors hover:text-background"
                >
                  <item.Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-background/50">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.href}
                      className="text-[13px] leading-5 text-background/80 transition-colors hover:text-background"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-background/10">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 sm:flex-row">
          <p className="text-[12px] text-background/50">© 2026 Wroob. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
