"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow, Rule, Section } from "@/components/ui/primitives";
import { Reveal, RevealGroup, RevealItem, SplitHeading } from "@/components/ui/motion";

/* What the samaj actually does, as an index rather than a card grid.
   Each entry carries its own specification line — the facts someone
   needs before they click, not decoration. */

const ENTRIES = [
  {
    title: "Bhavan",
    href: "/bhavan",
    blurb: "Rooms, halls and the lawn for weddings, ceremonies and meetings.",
    spec: "Rates fixed in advance · Instant PDF receipt",
    action: "Check availability",
  },
  {
    title: "Gatherings",
    href: "/events",
    blurb: "Cultural, religious and educational functions through the year.",
    spec: "Digital passes · Scanned at the gate",
    action: "See what's coming",
  },
  {
    title: "Welfare",
    href: "/donate",
    blurb: "Education funds, medical aid and the schemes the samaj runs.",
    spec: "Every contribution receipted · 80G eligible",
    action: "Contribute",
  },
  {
    title: "Directory",
    href: "/members",
    blurb: "Every registered household, searchable by name, gotra or area.",
    spec: "Members only · Kept current by families themselves",
    action: "Find a household",
  },
];

export default function PortalIndex() {
  return (
    <Section className="bg-paper pb-24 pt-4 sm:pb-32">
      <Reveal>
        <Eyebrow>What the portal carries</Eyebrow>
      </Reveal>

      <SplitHeading
        className="display mt-6 max-w-3xl text-[clamp(2rem,5.5vw,3.75rem)]"
        lines={["Four things the samaj", "has always done for you."]}
        delay={0.05}
      />

      <Reveal delay={0.12}>
        <Rule tone="strong" className="mt-12" />
      </Reveal>

      <RevealGroup as="div" stagger={0.07}>
        {ENTRIES.map((entry) => (
          <RevealItem key={entry.title}>
            <Link
              href={entry.href}
              className="group block border-b border-rule transition-colors duration-500 hover:bg-paper-2"
            >
              <div className="grid grid-cols-1 gap-4 px-1 py-8 sm:grid-cols-12 sm:items-baseline sm:gap-8 sm:py-10">
                <h3 className="display col-span-1 text-[clamp(1.75rem,4vw,2.75rem)] transition-transform duration-500 group-hover:translate-x-1.5 sm:col-span-4">
                  {entry.title}
                </h3>

                <div className="col-span-1 sm:col-span-5">
                  <p className="text-[0.9375rem] leading-relaxed text-ink-2">
                    {entry.blurb}
                  </p>
                  <p className="eyebrow mt-3 !tracking-[0.18em]">{entry.spec}</p>
                </div>

                <span className="col-span-1 inline-flex items-center gap-2 text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-ink-3 transition-colors duration-300 group-hover:text-vermilion sm:col-span-3 sm:justify-end">
                  {entry.action}
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </Section>
  );
}
