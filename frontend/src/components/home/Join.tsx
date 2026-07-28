"use client";

import ActionLink from "@/components/ui/ActionLink";
import { Eyebrow, Rule, Section } from "@/components/ui/primitives";
import { Reveal, SplitHeading } from "@/components/ui/motion";

/* Closing the loop the hero opened: the covenant is still running, and
   registering is how you take your place in it. */

export default function Join() {
  return (
    <Section className="bg-paper py-24 sm:py-32">
      <Reveal>
        <Rule tone="strong" />
      </Reveal>

      <div className="grid grid-cols-1 gap-12 pt-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <Reveal>
            <Eyebrow>Your place in it</Eyebrow>
          </Reveal>

          <SplitHeading
            className="display mt-6 text-[clamp(2rem,5.5vw,3.75rem)]"
            lines={["Register your household.", "Take the brick."]}
            delay={0.05}
          />

          <Reveal delay={0.14}>
            <p className="mt-8 max-w-lg text-[0.9375rem] leading-relaxed text-ink-2">
              Registration adds your family to the directory, opens Bhavan
              booking at member rates, and puts event passes and receipts in one
              place. It costs nothing.
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-5 lg:pt-4">
          <Reveal delay={0.1}>
            <div className="flex flex-col gap-3">
              <ActionLink href="/register" className="w-full">
                Register a household
              </ActionLink>
              <ActionLink href="/login" variant="outline" className="w-full">
                Sign in
              </ActionLink>
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <dl className="mt-10 space-y-4">
              {[
                ["Who can register", "Any Agrawal household in Jaipur"],
                ["What you need", "A phone number and your gotra"],
                ["How long it takes", "About four minutes"],
              ].map(([term, detail]) => (
                <div key={term} className="flex justify-between gap-6 border-b border-rule pb-4">
                  <dt className="eyebrow !tracking-[0.18em]">{term}</dt>
                  <dd className="text-right text-sm text-ink-2">{detail}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
