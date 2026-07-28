"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import ActionLink from "@/components/ui/ActionLink";
import { CropMarks } from "@/components/ui/primitives";
import { useStillness } from "@/components/ui/motion";

/* ═══════════════════════════════════════════════════════════════════
   THE COVENANT

   When a family settled in Agroha, every household already there gave
   them one brick and one rupee — a house, and the means to begin. एक
   ईंट, एक रुपया. That is the community's founding artifact, so it is
   what the page opens with.

   Scroll assembles a wall out of scattered bricks, bottom course
   first, the way a wall is actually laid. The wall resolves into an
   archway; the last movement carries you through it into the portal.
   ═══════════════════════════════════════════════════════════════════ */

/* 7 × 8 on a 7:4 box gives every brick a true 2:1 face at any screen width.
   Sizing the wall by viewport height instead would stretch bricks into tall
   slabs on a phone, which stops reading as masonry entirely. */
const COLS = 7;
const ROWS = 8;

/** Arch opening, in normalised wall coordinates. */
const ARCH = { halfWidth: 0.17, springLine: 0.58, riseRadius: 0.17 };

/** Deterministic pseudo-random in [0,1) — Math.random would break hydration. */
function noise(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Progress of `v` through the window [from, to], clamped at both ends. */
const ramp = (v: number, from: number, to: number) => clamp01((v - from) / (to - from));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type BrickSpec = {
  key: string;
  /** Final position and size, as CSS percentages of the wall. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Scattered origin, relative to the final position. */
  fromX: number;
  fromY: number;
  fromRotate: number;
  /** Fraction of scroll at which this brick begins settling. */
  start: number;
  /** A few bricks are inked in, the way a drawing gets partly filled. */
  filled: boolean;
};

function buildWall(): BrickSpec[] {
  const bricks: BrickSpec[] = [];
  const brickW = 100 / COLS;
  const brickH = 100 / ROWS;

  for (let row = 0; row < ROWS; row++) {
    // Running bond — alternate courses shift half a brick. The overhang is
    // clipped by the wall's overflow, which is exactly how a real wall ends.
    const offset = row % 2 === 0 ? 0 : -brickW / 2;

    for (let col = 0; col <= COLS; col++) {
      const left = col * brickW + offset;
      const top = row * brickH;

      // Is this brick inside the archway? Rectangle below the spring line,
      // capped by an ellipse above it.
      const cx = (left + brickW / 2) / 100;
      const cy = (top + brickH / 2) / 100;
      const dx = Math.abs(cx - 0.5);
      const inShaft = cy >= ARCH.springLine && dx <= ARCH.halfWidth;
      const inRise =
        (dx / ARCH.halfWidth) ** 2 +
          ((cy - ARCH.springLine) / ARCH.riseRadius) ** 2 <=
        1;
      if (inShaft || inRise) continue;

      const seed = row * 37 + col;
      // Lower courses settle first, so the wall grows upward.
      const courseFactor = (ROWS - 1 - row) / (ROWS - 1);
      const start = 0.07 + courseFactor * 0.2 + noise(seed) * 0.03;

      bricks.push({
        key: `${row}-${col}`,
        left,
        top,
        width: brickW,
        height: brickH,
        fromX: (noise(seed + 1) - 0.5) * 900,
        fromY: (noise(seed + 2) - 0.35) * 700,
        fromRotate: (noise(seed + 3) - 0.5) * 140,
        start,
        filled: noise(seed + 4) > 0.86,
      });
    }
  }
  return bricks;
}

const WALL = buildWall();

function Brick({ spec, p }: { spec: BrickSpec; p: MotionValue<number> }) {
  const end = spec.start + 0.22;
  const settle = (v: number) => ramp(v, spec.start, end);

  const x = useTransform(p, (v) => lerp(spec.fromX, 0, settle(v)));
  const y = useTransform(p, (v) => lerp(spec.fromY, 0, settle(v)));
  const rotate = useTransform(p, (v) => lerp(spec.fromRotate, 0, settle(v)));
  // Bricks are already on screen at rest — scattered and faint — so the page
  // never opens on an empty field. They only firm up as they find their course.
  const opacity = useTransform(p, (v) => lerp(0.3, 1, settle(v)));

  return (
    <motion.span
      style={{
        position: "absolute",
        left: `${spec.left}%`,
        top: `${spec.top}%`,
        width: `${spec.width}%`,
        height: `${spec.height}%`,
        x,
        y,
        rotate,
        opacity,
      }}
      className="block p-[0.35%]"
    >
      <span
        className={`block h-full w-full rounded-[1px] border border-vermilion/40 ${
          spec.filled ? "bg-vermilion/[0.07]" : ""
        }`}
      />
    </motion.span>
  );
}

/** One movement of copy. Fades through its own slice of the scroll. */
function Beat({
  p,
  from,
  to,
  children,
}: {
  p: MotionValue<number>;
  from: number;
  to: number;
  children: React.ReactNode;
}) {
  const span = to - from;
  // The opening beat is already on the page when you arrive — it has no
  // fade-in to play, only a fade-out. Later beats get both.
  const isFirst = from === 0;

  // Written as an explicit ramp rather than a multi-stop range: the two
  // edges are independent, and reading it back later should not require
  // reconstructing which stop meant what.
  const opacity = useTransform(p, (v) => {
    const fadeIn = isFirst ? 1 : ramp(v, from, from + span * 0.25);
    const fadeOut = 1 - ramp(v, to - span * 0.25, to);
    return Math.min(fadeIn, fadeOut);
  });

  const y = useTransform(p, [from, to], isFirst ? [0, -26] : [26, -26]);

  return (
    <motion.div
      style={{ opacity, y }}
      // On a phone the wall is too small to sit behind type without the
      // courses cutting through it, so copy takes the upper field and the
      // wall takes the lower. From sm up they share the centre again.
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-start px-6 pt-[15vh] text-center sm:justify-center sm:pt-0"
    >
      <div className="w-full max-w-3xl">{children}</div>
    </motion.div>
  );
}

/**
 * Picks which hero to mount.
 *
 * The two variants are separate components on purpose. They render different
 * trees, and only the scrolling one may call useScroll — keeping them apart
 * means the still variant never leaves a scroll target ref dangling.
 *
 * useStillness (rather than useReducedMotion) is what keeps the server's
 * markup and the client's first paint in agreement — see its own note.
 */
export default function CovenantHero() {
  return useStillness() ? <CovenantHeroStill /> : <CovenantHeroScrolling />;
}

function CovenantHeroScrolling() {
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stage,
    offset: ["start start", "end end"],
  });

  /* Every stage below is written as an explicit ramp. The sequence also
     finishes at 0.94 rather than 1.0 — the last sliver of a sticky range
     is never comfortably reachable, and the payoff must not depend on
     landing on it exactly. */

  /* ── Wall: settles, holds, then rushes past the viewer ─────────── */
  const wallScale = useTransform(scrollYProgress, (v) => lerp(1, 2.9, ramp(v, 0.7, 0.94)));
  const wallOpacity = useTransform(scrollYProgress, (v) => 1 - ramp(v, 0.7, 0.89));

  /* ── Plate: visible through the arch, then meets you ───────────── */
  // Holds well back while there is still copy over it, comes up briefly once
  // the last beat clears at 0.76, then washes out again. The painting is
  // atmosphere for this page, never the surface you end up reading on.
  const plateOpacity = useTransform(scrollYProgress, (v) => {
    const rise = 0.3 * ramp(v, 0.3, 0.55) + 0.35 * ramp(v, 0.74, 0.84);
    return rise * (1 - 0.85 * ramp(v, 0.84, 0.94));
  });
  const plateScale = useTransform(scrollYProgress, (v) => lerp(1.18, 1.34, ramp(v, 0.3, 0.94)));
  const plateFilter = useTransform(
    scrollYProgress,
    (v) => `saturate(${lerp(0.15, 0.5, ramp(v, 0.55, 0.86))})`
  );

  /* ── Arch mask: opens out of the wall as the wall completes ────── */
  const archScale = useTransform(scrollYProgress, (v) => lerp(1, 2, ramp(v, 0.7, 0.94)));

  /* ── Paper veil: you come through the arch into light, not into a
       poster. This is what the lockup actually lands on. ─────────── */
  const veilOpacity = useTransform(scrollYProgress, (v) => ramp(v, 0.79, 0.92));

  /* ── Lockup: the destination ───────────────────────────────────── */
  const lockupOpacity = useTransform(scrollYProgress, (v) => ramp(v, 0.8, 0.91));
  const lockupY = useTransform(scrollYProgress, (v) => lerp(30, 0, ramp(v, 0.8, 0.93)));

  /* ── Chrome ────────────────────────────────────────────────────── */
  const trackFill = useTransform(scrollYProgress, (v) => `${clamp01(v) * 100}%`);
  const cueOpacity = useTransform(scrollYProgress, (v) => 1 - ramp(v, 0, 0.08));

  return (
    <section ref={stage} className="relative h-[340vh] bg-paper">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden grain">
        {/* Plate, seen through the archway */}
        <motion.div
          style={{ opacity: plateOpacity, scale: archScale }}
          className="absolute inset-0 z-0 flex items-end justify-center pb-[14vh] sm:items-center sm:pb-0"
        >
          {/* Same box as the wall, so the opening below lines up with the
              masonry arch exactly rather than by coincidence. */}
          <div className="relative aspect-[7/4] w-[min(92vw,56rem)]">
            <div
              className="absolute overflow-hidden"
              style={{
                left: `${(0.5 - ARCH.halfWidth) * 100}%`,
                width: `${ARCH.halfWidth * 200}%`,
                top: `${(ARCH.springLine - ARCH.riseRadius) * 100}%`,
                height: `${(1 - ARCH.springLine + ARCH.riseRadius) * 100}%`,
                borderRadius: "50% 50% 0 0 / 50% 50% 0 0",
              }}
            >
              <motion.div style={{ scale: plateScale, filter: plateFilter }} className="absolute inset-0">
                <Image
                  src="/heritage/agrasen-court.png"
                  alt=""
                  aria-hidden
                  fill
                  priority
                  sizes="(max-width: 768px) 40vw, 20rem"
                  className="object-cover object-center"
                />
              </motion.div>
              <div className="absolute inset-0 bg-linear-to-t from-paper/70 via-transparent to-paper/30" />
            </div>
          </div>
        </motion.div>

        {/* The wall */}
        <motion.div
          aria-hidden
          style={{ scale: wallScale, opacity: wallOpacity }}
          className="absolute inset-0 z-10 flex items-end justify-center pb-[14vh] sm:items-center sm:pb-0"
        >
          <div className="relative aspect-[7/4] w-[min(92vw,56rem)] overflow-hidden">
            {WALL.map((spec) => (
              <Brick key={spec.key} spec={spec} p={scrollYProgress} />
            ))}
          </div>
        </motion.div>

        {/* Copy */}
        <div className="absolute inset-0 z-20">
          <div className="relative h-full w-full">
            <Beat p={scrollYProgress} from={0} to={0.26}>
              <p className="eyebrow mb-6">Agroha · एक ईंट, एक रुपया</p>
              <h1 className="display text-[clamp(2.75rem,9vw,6.5rem)]">
                One brick.
                <br />
                One rupee.
              </h1>
              <p className="mx-auto mt-7 max-w-md text-[0.9375rem] leading-relaxed text-ink-2">
                The oldest social contract we know still runs this community.
              </p>
            </Beat>

            <Beat p={scrollYProgress} from={0.27} to={0.53}>
              <h2 className="display text-[clamp(2.25rem,7vw,5rem)]">
                A house before
                <br />
                you asked for one.
              </h2>
              <p className="mx-auto mt-7 max-w-lg text-[0.9375rem] leading-relaxed text-ink-2">
                Every household already settled gave the newcomer a brick to
                build with and a rupee to begin with. No one arrived with
                nothing.
              </p>
            </Beat>

            <Beat p={scrollYProgress} from={0.54} to={0.76}>
              <h2 className="display text-[clamp(2.25rem,7vw,5rem)]">
                The wall still stands.
              </h2>
              <p className="mx-auto mt-7 max-w-md text-[0.9375rem] leading-relaxed text-ink-2">
                Agrasen Bhawan, Vidyadhar Nagar — laid the same way, by
                everyone, for anyone who needs it.
              </p>
            </Beat>
          </div>
        </div>

        {/* Light. Everything above dissolves into it. */}
        <motion.div
          aria-hidden
          style={{ opacity: veilOpacity }}
          className="absolute inset-0 z-25 bg-paper"
        />

        {/* Lockup — you arrive */}
        <motion.div
          style={{ opacity: lockupOpacity, y: lockupY }}
          className="absolute inset-0 z-30 grid place-items-center px-6"
        >
          <Lockup />
        </motion.div>

        <CropMarks />

        {/* Progress ledger */}
        <div className="absolute bottom-8 left-5 z-40 flex items-center gap-4 sm:left-8">
          <div className="h-px w-24 overflow-hidden bg-ink/15 sm:w-36">
            <motion.div style={{ width: trackFill }} className="h-full bg-vermilion" />
          </div>
          <span className="eyebrow !tracking-[0.2em] tabular-nums">The covenant</span>
        </div>

        {/* Scroll cue, and a way past all of this */}
        <motion.div
          style={{ opacity: cueOpacity }}
          className="absolute bottom-8 right-5 z-40 flex flex-col items-end gap-2 sm:right-8"
        >
          <span className="eyebrow">Scroll</span>
          <a
            href="#directory"
            className="eyebrow rule-grow !tracking-[0.2em] text-ink-2 hover:text-vermilion"
          >
            Skip to the portal
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Reduced motion means nothing moves — not that nothing is here. The wall is
 * drawn already built, the plate sits in its arch, and the lockup reads
 * against the same paper wash the scrolling finale resolves into.
 */
function CovenantHeroStill() {
  return (
    <section className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-paper px-6 py-24">
      <div aria-hidden className="absolute inset-0 flex items-center justify-center">
        <div className="relative aspect-[7/4] w-[min(92vw,56rem)]">
          <ArchOpening opacity={0.3} saturate={0.5} />
          {WALL.map((spec) => (
            <span
              key={spec.key}
              className="absolute block p-[0.35%]"
              style={{
                left: `${spec.left}%`,
                top: `${spec.top}%`,
                width: `${spec.width}%`,
                height: `${spec.height}%`,
              }}
            >
              <span
                className={`block h-full w-full rounded-[1px] border border-vermilion/40 ${
                  spec.filled ? "bg-vermilion/[0.07]" : ""
                }`}
              />
            </span>
          ))}
        </div>
      </div>

      <div aria-hidden className="absolute inset-0 bg-paper/80" />

      <div className="relative z-20 text-center">
        <Lockup />
      </div>
      <CropMarks />
    </section>
  );
}

/**
 * The archway cut into the wall, positioned from the same ARCH constants the
 * masonry uses so the opening and the picture behind it can never drift apart.
 */
function ArchOpening({ opacity, saturate }: { opacity: number; saturate: number }) {
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: `${(0.5 - ARCH.halfWidth) * 100}%`,
        width: `${ARCH.halfWidth * 200}%`,
        top: `${(ARCH.springLine - ARCH.riseRadius) * 100}%`,
        height: `${(1 - ARCH.springLine + ARCH.riseRadius) * 100}%`,
        borderRadius: "50% 50% 0 0 / 50% 50% 0 0",
        opacity,
        filter: `saturate(${saturate})`,
      }}
    >
      <Image
        src="/heritage/agrasen-court.png"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 40vw, 20rem"
        className="object-cover object-center"
      />
    </div>
  );
}

function Lockup() {
  return (
    <div className="text-center">
      <p className="deva text-lg text-vermilion sm:text-xl">अग्रवाल समाज</p>
      <h2 className="display mt-3 text-[clamp(2.5rem,8vw,5.5rem)]">
        Agrawal Samaj
      </h2>
      <p className="eyebrow mt-5 justify-center">Jaipur · Est. 1985</p>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <ActionLink href="/bhavan">Book the Bhavan</ActionLink>
        <ActionLink href="/register" variant="outline">
          Join the directory
        </ActionLink>
      </div>
    </div>
  );
}
