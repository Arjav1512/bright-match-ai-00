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
    <path d="M12.738 18.702c-.831.53-1.9.79-3.2.79-2.62 0-4.72-.9-6.28-2.71C1.7 14.97.92 12.7.92 9.96c0-2.76.79-5.03 2.36-6.83C4.86 1.32 6.97.41 9.61.41c2.6 0 4.69.91 6.24 2.72 1.56 1.8 2.34 4.08 2.34 6.83 0 1.62-.28 3.08-.83 4.37-.36.85-.84 1.6-1.44 2.26.5.53 1.03.79 1.6.79.62 0 1.07-.2 1.36-.6.29-.4.45-.98.48-1.74h1.86c-.05 1.62-.5 2.86-1.36 3.72-.86.86-2.02 1.29-3.48 1.29-1.2 0-2.4-.45-3.64-1.35zM9.6 15.6c.86 0 1.6.2 2.24.6.5-.98.75-2.72.75-5.22 0-2.6-.3-4.42-.9-5.46-.6-1.05-1.62-1.57-3.05-1.57-1.4 0-2.4.53-3 1.58-.6 1.05-.9 2.86-.9 5.45 0 2.57.3 4.38.9 5.44.6 1.05 1.6 1.58 3 1.58.36 0 .7-.05 1.02-.15-.5-.5-1.1-.75-1.8-.75-.3 0-.6.04-.9.13l-.6-1.3c.98-.4 2.06-.33 3.24-.33z" />
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
    <footer className="border-t bg-[#333333] text-foreground">
      {/* Upper footer */}
      <div className="container py-10 md:py-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-x-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 lg:max-w-xs">
            <img
              src={wroobeLogo}
              alt="Wroob"
              width="139"
              height="56"
              loading="lazy"
              decoding="async"
              className="h-8 w-auto dark:brightness-0 dark:invert"
            />
            <p className="mt-3 text-[13px] leading-5 font-bold text-white">
              Skills-based internship matching for students and companies.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-[12px] font-bold uppercase tracking-[0.08em] text-white">
                {col.title}
              </h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.href}
                      className="text-[13px] leading-5 text-muted-foreground transition-colors hover:text-primary"
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

      {/* Lower footer */}
      <div className="border-t border-border">
        <div className="container flex flex-col-reverse items-center justify-between gap-4 py-4 sm:flex-row">
          <p className="text-[12px] leading-5 text-muted-foreground">
            © 2026 Wroob. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {socials.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-primary"
              >
                <item.Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
