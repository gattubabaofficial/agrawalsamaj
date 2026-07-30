"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow, Rule, Section } from "@/components/ui/primitives";
import { Reveal, RevealGroup, RevealItem, SplitHeading } from "@/components/ui/motion";

interface SiteEntry {
  title: string;
  subtitle?: string;
  href: string;
  blurb: string;
  category: "portal" | "matrimony" | "network";
  tag: string;
  action: string;
  icon: string;
  isExternal?: boolean;
}

const ALL_SITES: SiteEntry[] = [
  {
    title: "Bhavan Booking",
    subtitle: "भवन बुकिंग",
    href: "/bhavan",
    blurb: "Rooms, halls, AC banquet and open lawn for weddings & samaj functions.",
    category: "portal",
    tag: "Bhavan",
    action: "Book Bhavan",
    icon: "🏛️",
  },
  {
    title: "Samaj Blog & News",
    subtitle: "समाचार एवं ब्लॉग",
    href: "/blog",
    blurb: "Free eye camps, summer vacation activities, announcements & public stories.",
    category: "portal",
    tag: "News & Media",
    action: "Read & Write",
    icon: "📰",
  },
  {
    title: "Events & Gatherings",
    subtitle: "कार्यक्रम एवं समारोह",
    href: "/events",
    blurb: "Cultural, religious and educational functions throughout the year.",
    category: "portal",
    tag: "Events",
    action: "See Events",
    icon: "📅",
  },
  {
    title: "Member Directory",
    subtitle: "सदस्य निर्देशिका",
    href: "/members",
    blurb: "Every registered household, searchable by name, gotra or area.",
    category: "portal",
    tag: "Directory",
    action: "Find Member",
    icon: "👥",
  },
  {
    title: "Donation & Welfare",
    subtitle: "दान एवं जनकल्याण",
    href: "/donate",
    blurb: "Education funds, medical aid, 80G tax benefits and welfare schemes.",
    category: "portal",
    tag: "Welfare",
    action: "Contribute",
    icon: "❤️",
  },
  {
    title: "Register Household",
    subtitle: "नया पंजीकरण",
    href: "/register",
    blurb: "Apply for new membership, register your family and join the samaj.",
    category: "portal",
    tag: "Membership",
    action: "Register",
    icon: "📜",
  },
  {
    title: "अग्रवाल वैवाहिक मंच",
    subtitle: "Agrawal Matrimony",
    href: "https://www.agrawalmatrimony.org",
    blurb: "Verified profiles, gotra matching & matrimonial alliance directory for Agrawal families.",
    category: "matrimony",
    tag: "Matrimonial",
    action: "Visit Site",
    icon: "💍",
    isExternal: true,
  },
  {
    title: "अग्रोहा धाम संस्थान",
    subtitle: "Agroha Dham Shrine Trust",
    href: "https://www.agrohadham.org",
    blurb: "Official portal of Kuldevi Mahalaxmi Mandir & Maharaja Agrasen Shrine, Agroha.",
    category: "network",
    tag: "Heritage",
    action: "Visit Site",
    icon: "🏰",
    isExternal: true,
  },
  {
    title: "महाराजा अग्रसेन फाउंडेशन",
    subtitle: "Agrasen Foundation",
    href: "https://www.agrasenfoundation.org",
    blurb: "Educational grants, student hostels, Jayanti celebrations & cultural archives.",
    category: "network",
    tag: "Education",
    action: "Visit Site",
    icon: "🎓",
    isExternal: true,
  },
  {
    title: "अग्रवाल व्यापार एवं उद्योग",
    subtitle: "Agrawal Business Guild",
    href: "https://www.agrawalbusiness.org",
    blurb: "B2B commercial directory, trade networking & entrepreneurship support.",
    category: "network",
    tag: "Business",
    action: "Visit Site",
    icon: "💼",
    isExternal: true,
  },
];

export default function PortalIndex() {
  const [activeCategory, setActiveCategory] = useState<"all" | "portal" | "matrimony" | "network">("all");

  const filteredSites = ALL_SITES.filter(
    (s) => activeCategory === "all" || s.category === activeCategory
  );

  return (
    <Section className="bg-paper pb-24 pt-8 sm:pb-32">
      {/* Masthead Header & Category Filter Controls in the Same Line */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-rule">
        <div>
          <Reveal>
            <Eyebrow tone="accent">Agrawal Samaj Mansrovar Jaipur Ecosystem & Partner Network</Eyebrow>
          </Reveal>
          <SplitHeading
            className="display mt-4 max-w-2xl text-[clamp(2rem,5vw,3.25rem)]"
            lines={["All Samaj Sites & Matrimonial Links", "Aligned In One Place."]}
            delay={0.05}
          />
        </div>

        {/* Category Filters on the Same Horizontal Line */}
        <Reveal delay={0.1}>
          <div className="flex flex-wrap gap-2 bg-paper-2 p-1.5 rounded-2xl border border-rule">
            {[
              { id: "all", label: "🌐 All Sites (10)" },
              { id: "portal", label: "🏢 Samaj Portals" },
              { id: "matrimony", label: "💍 Matrimonial" },
              { id: "network", label: "🤝 Community Network" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-vermilion text-paper shadow-md"
                    : "text-ink-2 hover:text-ink hover:bg-paper"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Grid of Equal-Height Cards Aligned Side-By-Side on the Same Line */}
      <RevealGroup as="div" stagger={0.05} className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSites.map((site) => {
          const CardContent = (
            <div className="group flex flex-col justify-between p-6 rounded-2xl border border-rule bg-paper-2 hover:bg-paper hover:border-vermilion/40 hover:shadow-xl transition-all duration-300 h-full">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{site.icon}</span>
                  <span className="px-2.5 py-1 rounded-full bg-vermilion/10 text-vermilion text-[10px] font-bold tracking-wider uppercase">
                    {site.tag}
                  </span>
                </div>
                <h4 className="deva font-bold text-xl text-ink group-hover:text-vermilion transition-colors">
                  {site.title}
                </h4>
                {site.subtitle && (
                  <p className="text-xs font-semibold text-ink-3 mt-0.5">{site.subtitle}</p>
                )}
                <p className="text-xs text-ink-2 mt-3 leading-relaxed">{site.blurb}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-rule/60 flex items-center justify-between text-xs font-bold text-vermilion">
                <span>{site.action}</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </div>
          );

          return (
            <RevealItem key={site.title}>
              {site.isExternal ? (
                <a href={site.href} target="_blank" rel="noopener noreferrer" className="block h-full">
                  {CardContent}
                </a>
              ) : (
                <Link href={site.href} className="block h-full">
                  {CardContent}
                </Link>
              )}
            </RevealItem>
          );
        })}
      </RevealGroup>
    </Section>
  );
}
