"use client";

import { useState } from "react";
import Image from "next/image";
import ActionLink from "@/components/ui/ActionLink";
import { CropMarks, Eyebrow, Rule } from "@/components/ui/primitives";
import { Reveal, SplitHeading } from "@/components/ui/motion";

/* ═══════════════════════════════════════════════════════════════════
   THE COVENANT

   When a family settled in Agroha, every household already there gave
   them one brick and one rupee — a house, and the means to begin. एक
   ईंट, एक रुपया. That is the community's founding artifact, so it is
   what the page opens with.

   The two figures the samaj is founded on flank that vow: Mahalakshmi,
   whose blessing Agroha was raised under, and Maharaja Agrasen, who
   raised it. Deity, vow, founder — read left to right, the way the
   community tells it.

   They are enshrined, not used as wallpaper. Each sits in a lit arch:
   a saffron halo behind, a gold hairline around, the paper falling away
   at the edges. The previous version ran Agrasen full-bleed under an
   80% paper wash, which turned the most meaningful image on the site
   into texture — the arches exist to undo exactly that.

   No scroll choreography on purpose: everything is present the moment
   the page loads.
   ═══════════════════════════════════════════════════════════════════ */

/** A proper temple arch: the horizontal radius is half the width so the
 *  dome springs from the frame's edges, the vertical radius is shallower
 *  so it domes rather than bulges. Not expressible as a Tailwind radius. */
const ARCH = { borderRadius: "50% 50% 0 0 / 42% 42% 0 0" } as const;

type Figure = {
  src: string;
  name: string;
  latin: string;
  /** object-position, so each painting's face stays in the arch. */
  position: string;
};

const MAHALAKSHMI: Figure = {
  src: "/heritage/mahalakshmi.jpg",
  name: "महालक्ष्मी",
  latin: "Mahalakshmi",
  position: "center top",
};

const AGRASEN: Figure = {
  src: "/heritage/agrasen-portrait.webp",
  name: "महाराजा अग्रसेन",
  latin: "Maharaja Agrasen",
  position: "center top",
};

function Niche({ figure, className = "" }: { figure: Figure; className?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className={`relative mx-auto w-full max-w-[15rem] ${className}`}>
      {/* The highlight itself: warm light pooling behind the arch. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-saffron/25 blur-3xl"
      />

      <div
        style={ARCH}
        className="relative aspect-[7/10] overflow-hidden border border-gold/55 bg-paper-3 shadow-[0_18px_50px_-24px_rgba(22,17,14,0.45)]"
      >
        {failed ? (
          /* The image has not been supplied yet. Hold the niche with the
             name rather than a broken frame — the composition still reads. */
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="deva text-xl text-ink-2">{figure.name}</span>
            <span className="text-[0.6875rem] leading-tight text-ink-3">
              Portrait to be added
            </span>
          </div>
        ) : (
          <Image
            src={figure.src}
            alt={`${figure.latin} — ${figure.name}`}
            fill
            priority
            sizes="(min-width: 1024px) 240px, 42vw"
            style={{ objectPosition: figure.position }}
            onError={() => setFailed(true)}
            className="object-cover"
          />
        )}
      </div>

      <figcaption className="mt-4 text-center">
        <p className="deva text-base leading-snug text-ink">{figure.name}</p>
        <p className="mt-0.5 text-xs text-ink-3">{figure.latin}</p>
      </figcaption>
    </figure>
  );
}

export default function CovenantHero() {
  return (
    <section className="grain relative grid min-h-[100svh] place-items-center overflow-hidden bg-paper px-6 py-12 sm:py-20">
      {/* One warm ground behind everything, so the arches sit in light
          instead of on flat paper. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_38%,rgba(224,118,31,0.13),transparent_70%)]"
      />

      <div className="relative z-10 w-full max-w-6xl">
        <Reveal>
          <Eyebrow className="justify-center">Agroha</Eyebrow>
        </Reveal>

        {/* Deity · vow · founder. On narrow screens the two arches share the
            top row and the vow drops beneath them. */}
        <div className="mt-8 grid grid-cols-2 items-center gap-x-6 gap-y-8 sm:gap-x-10 sm:gap-y-12 lg:mt-12 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,15rem)] lg:gap-12">
          <Reveal delay={0.1}>
            <Niche figure={MAHALAKSHMI} />
          </Reveal>

          <div className="order-last col-span-2 flex flex-col items-center text-center lg:order-none lg:col-span-1">
            <Reveal delay={0.14}>
              <h1
                className="text-[clamp(2.5rem,7vw,4.75rem)] leading-tight text-center font-medium"
                style={{ fontFamily: "var(--font-noto-serif-deva), 'Noto Serif Devanagari', serif" }}
              >
                <span className="block">
                  {/* ईं rendered without native anusvara; dot placed manually for cross-browser clarity */}
                  एक <span className="relative inline-block">ई<span aria-hidden className="absolute pointer-events-none select-none rounded-full bg-current" style={{ top: '-0.008em', left: '81%', transform: 'translateX(-50%)', width: '0.12em', height: '0.12em' }} /></span>ट
                </span>
                <span className="block">एक रुपया</span>
              </h1>
            </Reveal>

            <Reveal delay={0.26}>
              <p className="mx-auto mt-6 max-w-md text-[0.9375rem] leading-relaxed text-ink-2 sm:mt-7">
                The oldest social contract we know still runs this community —
                the covenant Maharaja Agrasen founded it on.
              </p>
            </Reveal>

            <Reveal delay={0.32} className="mt-8 w-full max-w-xs sm:mt-10">
              <Rule />
            </Reveal>

            <Reveal delay={0.38}>
              <div className="mt-6 text-center sm:mt-8">
                <p className="deva text-lg text-vermilion">अग्रवाल समाज</p>
                <h2 className="display mt-2 text-[clamp(1.75rem,4.5vw,2.75rem)]">
                  Agrawal Samaj Mansrovar Jaipur
                </h2>
                <Eyebrow className="mt-4 justify-center">Jaipur · Est. 1985</Eyebrow>
              </div>
            </Reveal>

            <Reveal delay={0.46}>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:mt-9 sm:gap-4 max-w-2xl mx-auto">
                <ActionLink href="/bhavan" title="Book a stay at Agrasen Bhawan">Bhavan Booking</ActionLink>
                <ActionLink href="/members" variant="outline" title="Search the member directory">Directory</ActionLink>
                <ActionLink href="/events" variant="outline" title="See upcoming events and passes">Events</ActionLink>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.18}>
            <Niche figure={AGRASEN} />
          </Reveal>
        </div>
      </div>

      <CropMarks />
    </section>
  );
}
