"use client";

import { Eyebrow, Rule, Section } from "@/components/ui/primitives";
import { Reveal, SplitHeading } from "@/components/ui/motion";

/* Closing the loop the hero opened: where the covenant is actually kept. */

export default function Join() {
  return (
    <Section className="bg-paper py-24 sm:py-32">
      <Reveal>
        <Rule tone="strong" />
      </Reveal>

      <div className="grid grid-cols-1 gap-12 pt-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <Reveal>
            <Eyebrow>Find us</Eyebrow>
          </Reveal>

          <SplitHeading
            className="display mt-6 text-[clamp(2rem,5.5vw,3.75rem)]"
            lines={["Agrawal Bhawan,", "Mansarovar Sector 5."]}
            delay={0.05}
          />

          <Reveal delay={0.14}>
            <p className="mt-8 max-w-lg text-[0.9375rem] leading-relaxed text-ink-2">
              VQ87+JX6, Ward 27, Mansarovar Sector 5, Mansarovar, Jaipur, Rajasthan 302020, India — Shipra Path Road (Opposite Vijay Modi), the main hall where the samaj gathers.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <a
              href="https://www.google.com/maps/search/?api=1&query=VQ87%2BJX6%2C+Ward+27%2C+Mansarovar+Sector+5%2C+Mansarovar%2C+Jaipur%2C+Rajasthan+302020"
              target="_blank"
              rel="noopener noreferrer"
              className="eyebrow !tracking-[0.18em] mt-8 inline-block border-b border-ink pb-1 text-ink transition-colors hover:border-vermilion hover:text-vermilion"
            >
              Get directions on Google Maps
            </a>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <Reveal delay={0.1}>
            <div className="aspect-[4/3] w-full overflow-hidden border border-rule sm:aspect-[16/10]">
              <iframe
                title="Agrawal Bhawan, Mansarovar Sector 5, Jaipur — location"
                src="https://www.google.com/maps?q=VQ87%2BJX6,+Ward+27,+Mansarovar+Sector+5,+Mansarovar,+Jaipur,+Rajasthan+302020&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
