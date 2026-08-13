import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { Rule } from "@/components/ui/primitives";

const COLUMNS = [
  {
    heading: "The samaj",
    links: [
      { label: "About us", href: "/about" },
      { label: "Managing committee", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Member directory", href: "/members" },
    ],
  },
  {
    heading: "Take part",
    links: [
      { label: "Upcoming events", href: "/events" },
      { label: "Donation schemes", href: "/donate" },
    ],
  },

  {
    heading: "Samaj Network",
    links: [
      { label: "Agrawal Matrimony (वैवाहिक)", href: "https://www.agrawalmatrimony.org" },
      { label: "Agarwal 2 Agarwal Matrimony", href: "https://www.agarwal2agarwal.org" },
      { label: "Akhil Bhartiya Agrawal Sammelan", href: "https://abasofficial.com" },
      { label: "Agroha Dham (अग्रोहा धाम)", href: "https://www.agrohadham.org" },
      { label: "Agrasen Foundation", href: "https://www.agrasenfoundation.org" },
      { label: "Agrawal Business Guild", href: "https://www.agrawalbusiness.org" },
    ],
  },
];

const SOCIALS = [
  {
    label: "Facebook",
    href: "#",
    path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  },
  {
    label: "Instagram",
    href: "#",
    path: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z",
  },
  {
    label: "YouTube",
    href: "#",
    path: "M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17zM9.7 15l4.8-3-4.8-3v6z",
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-rule bg-paper">
      <div className="mx-auto max-w-[78rem] px-5 pb-10 pt-20 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-12 lg:gap-x-12">
          {/* Identity */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
            <p className="deva text-lg text-vermilion">अग्रवाल समाज</p>
            <p className="display mt-2 text-2xl">Agrawal Samaj Mansrovar Jaipur</p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-2">
              One brick, one rupee — the covenant that built Agroha, kept by the
              households of Jaipur.
            </p>

            <div className="mt-7 flex gap-4">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center border border-rule text-ink-3 transition-colors duration-300 hover:border-vermilion hover:text-vermilion"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((column) => (
            <nav key={column.heading} className="lg:col-span-2">
              <h2 className="eyebrow">{column.heading}</h2>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-2 transition-colors duration-300 hover:text-vermilion"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <h2 className="eyebrow">Find us</h2>
            <ul className="mt-5 space-y-4 text-sm text-ink-2">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-vermilion" />
                <span className="leading-relaxed">
                  Agrasen Bhawan, Ward 27, Sector 5, Mansarovar, Jaipur - 302020
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-vermilion" />
                <a href="tel:+911412345678" className="transition-colors hover:text-vermilion">
                  +91 141 234 5678
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-vermilion" />
                <a
                  href="mailto:contact@agrawalsamajjaipur.org"
                  className="break-words transition-colors hover:text-vermilion"
                >
                  contact@agrawalsamajjaipur.org
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Rule className="mt-16" />

        <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="eyebrow !tracking-[0.18em]">
            © {new Date().getFullYear()} Agrawal Samaj Mansrovar Jaipur
          </p>
          <div className="flex gap-6">
            <Link href="#" className="eyebrow !tracking-[0.18em] transition-colors hover:text-vermilion">
              Privacy
            </Link>
            <Link href="#" className="eyebrow !tracking-[0.18em] transition-colors hover:text-vermilion">
              Terms
            </Link>
          </div>
        </div>
      </div>

      {/* Oversized watermark — the name of the samaj, set as a seal rather
          than a logo, bleeding off the bottom edge. */}
      <p
        aria-hidden
        className="deva pointer-events-none select-none whitespace-nowrap text-center text-[18vw] leading-[0.72] text-ink/[0.045]"
      >
        अग्रवाल समाज
      </p>
    </footer>
  );
}
