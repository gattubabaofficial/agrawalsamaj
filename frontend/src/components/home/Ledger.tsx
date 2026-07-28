"use client";

import CountUp from "@/components/ui/CountUp";
import { Eyebrow, Rule, Section } from "@/components/ui/primitives";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/motion";

/* A samaj keeps a register — of households, of what was given, of what
   was used. So the numbers are set as a register rather than as cards:
   label on the left, figure on the right, a rule between each line. */

const ENTRIES = [
  { label: "Households on the rolls", value: 850 },
  { label: "Members in the directory", value: 2500 },
  { label: "Gatherings held", value: 120 },
  { label: "Bhavan bookings honoured", value: 480 },
];

export default function Ledger() {
  return (
    <Section id="directory" className="scroll-mt-24 bg-paper py-24 sm:py-32">
      <Reveal>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <Eyebrow>The register</Eyebrow>
          <Eyebrow>Jaipur · current</Eyebrow>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <Rule tone="strong" className="mt-5" />
      </Reveal>

      <RevealGroup as="div" className="mt-2" stagger={0.09}>
        {ENTRIES.map((entry) => (
          <RevealItem key={entry.label}>
            <div className="group flex items-baseline justify-between gap-6 border-b border-rule py-6 sm:py-7">
              <span className="text-sm text-ink-2 sm:text-base">{entry.label}</span>
              <span className="figure text-[clamp(2rem,6vw,3.75rem)] leading-none text-ink">
                <CountUp to={entry.value} />
              </span>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal delay={0.1}>
        <p className="mt-8 max-w-md text-sm leading-relaxed text-ink-3">
          Kept by the managing committee and updated as families register.
        </p>
      </Reveal>
    </Section>
  );
}
