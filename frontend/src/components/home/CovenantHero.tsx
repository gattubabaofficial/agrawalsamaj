"use client";

import Image from "next/image";
import ActionLink from "@/components/ui/ActionLink";
import { CropMarks, Eyebrow, Rule } from "@/components/ui/primitives";
import { Reveal, SplitHeading } from "@/components/ui/motion";

/* ═══════════════════════════════════════════════════════════════════
   THE COVENANT

   When a family settled in Agroha, every household already there gave
   them one brick and one rupee — a house, and the means to begin. एक
   ईंट, एक रुपया. That is the community's founding artifact, so it is
   what the page opens with: Maharaja Agrasen himself, then the vow,
   then the name it built.

   No scroll choreography here on purpose — the portrait and the copy
   are simply present the moment the page loads. This is also the only
   section on the page that uses this image; it is not reused as a
   background anywhere below the fold.
   ═══════════════════════════════════════════════════════════════════ */

export default function CovenantHero() {
  return (
    <section className="grain relative grid min-h-[100svh] place-items-center overflow-hidden bg-paper px-6 py-24">
      {/* Background portrait */}
      <div aria-hidden className="absolute inset-0 z-0">
        <Image
          src="/heritage/maharaja-agrasen.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-top"
        />
        {/* Paper wash so the copy on top stays legible — heavier low where
            the text sits, lighter at the very top so the portrait still reads. */}
        <div className="absolute inset-0 bg-linear-to-b from-paper/55 via-paper/80 to-paper" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <Reveal>
          <Eyebrow>Agroha</Eyebrow>
        </Reveal>

        <SplitHeading
          as="h1"
          className="deva mt-8 text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.95]"
          lines={["एक ईंट।", "एक रुपया।"]}
          delay={0.14}
        />

        <Reveal delay={0.26}>
          <p className="mx-auto mt-7 max-w-md text-[0.9375rem] leading-relaxed text-ink-2">
            The oldest social contract we know still runs this community —
            the covenant Maharaja Agrasen founded it on.
          </p>
        </Reveal>

        <Reveal delay={0.32} className="mt-14 w-full max-w-xs">
          <Rule />
        </Reveal>

        <Reveal delay={0.38}>
          <div className="mt-10 text-center">
            <p className="deva text-lg text-vermilion sm:text-xl">अग्रवाल समाज</p>
            <h2 className="display mt-3 text-[clamp(2rem,6vw,3.5rem)]">Agrawal Samaj</h2>
            <Eyebrow className="mt-5 justify-center">Jaipur · Est. 1985</Eyebrow>
          </div>
        </Reveal>

        <Reveal delay={0.46}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <ActionLink href="/bhavan">Book the Bhavan</ActionLink>
            <ActionLink href="/register" variant="outline">
              Join the directory
            </ActionLink>
          </div>
        </Reveal>
      </div>

      <CropMarks />
    </section>
  );
}
