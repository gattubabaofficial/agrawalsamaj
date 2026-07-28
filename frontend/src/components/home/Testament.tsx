"use client";

import Image from "next/image";
import { Eyebrow } from "@/components/ui/primitives";
import { Reveal, SplitHeading } from "@/components/ui/motion";

/* The one dark field on the page. Everything else is paper, so this
   section carries all the weight by itself and needs no ornament. */

export default function Testament() {
  return (
    <section className="relative overflow-hidden bg-char py-24 text-paper sm:py-36">
      <div className="mx-auto grid max-w-[78rem] grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-20 lg:px-12">
        <Reveal className="lg:col-span-4" distance={30}>
          <figure className="relative mx-auto w-full max-w-[17rem]">
            <div
              className="relative aspect-[3/4] overflow-hidden"
              style={{ borderRadius: "50% 50% 0 0 / 22% 22% 0 0" }}
            >
              <Image
                src="/heritage/agrasen-portrait.webp"
                alt="Painted portrait of Maharaja Agrasen"
                fill
                sizes="(max-width: 1024px) 60vw, 17rem"
                className="object-cover object-top saturate-[0.75]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-char via-transparent to-transparent" />
            </div>
            <figcaption className="eyebrow mt-5 justify-center text-paper/45">
              Maharaja Agrasen
            </figcaption>
          </figure>
        </Reveal>

        <div className="lg:col-span-8">
          <Reveal>
            <Eyebrow tone="inverse">The principle</Eyebrow>
          </Reveal>

          <SplitHeading
            as="p"
            className="display-italic mt-8 text-[clamp(1.5rem,3.4vw,2.75rem)] text-paper"
            lines={[
              "“A society can only progress",
              "when the welfare of every",
              "citizen is secured, and we",
              "support one another",
              "as a single family.”",
            ]}
          />

          <Reveal delay={0.15}>
            <div className="mt-12 flex items-center gap-5">
              <span aria-hidden className="h-px w-14 bg-gold/60" />
              <p className="deva text-base text-paper/70">महाराजा अग्रसेन</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
