"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/** The site's single easing curve. Matches --ease-editorial in globals.css. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * "Should this hold still?" — true only for visitors who asked for reduced
 * motion, and only once mounted.
 *
 * The mount gate matters: useReducedMotion is always false on the server but
 * can be true on the client's very first render, so branching on it directly
 * makes the server and client markup disagree and costs a hydration error on
 * exactly the machines we are trying to be gentle with. Prefer this over
 * useReducedMotion anywhere the answer changes what gets rendered.
 */
export function useStillness() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(reduce);
}

/** Reveals fire once, slightly before the element is fully in view. */
const VIEWPORT = { once: true, margin: "-12% 0px -8% 0px" } as const;

type Tag = "div" | "section" | "li" | "article" | "header" | "figure";

type RevealProps = {
  children: ReactNode;
  /** Seconds to wait before this element starts. Use for hand-tuned rhythm. */
  delay?: number;
  /** Distance in px the element rises from. */
  distance?: number;
  className?: string;
  as?: Tag;
};

/**
 * Scroll-triggered rise-and-fade. The workhorse — most things on the page
 * arrive through this, so the whole site shares one sense of timing.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 24,
  className,
  as = "div",
}: RevealProps) {
  const reduce = useStillness();
  const MotionTag = motion[as];

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Staggered container. Pair with <RevealItem> for lists where the children
 * should cascade rather than all arrive at once.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  as = "div",
}: Omit<RevealProps, "distance"> & { stagger?: number }) {
  const reduce = useStillness();
  const MotionTag = motion[as];

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const variants: Variants = {
    hidden: {},
    shown: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}

export function RevealItem({
  children,
  className,
  distance = 20,
  as = "div",
}: Omit<RevealProps, "delay">) {
  const reduce = useStillness();
  const MotionTag = motion[as];

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, y: distance },
        shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
      }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Headline reveal: each line is clipped by its own mask and slides up from
 * beneath it, like type being pulled onto the page. Lines are passed as an
 * array so the mask boundaries land where the design wants them rather than
 * wherever the browser happens to wrap.
 */
export function SplitHeading({
  lines,
  className,
  delay = 0,
  as = "h2",
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  const reduce = useStillness();
  const Heading = motion[as];

  if (reduce) {
    const Plain = as;
    return (
      <Plain className={className}>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </Plain>
    );
  }

  // The trigger lives on the heading, not on the lines. Each line starts
  // translated fully beneath its own mask, so a line can never observe
  // itself into view — it is clipped out of existence until it moves.
  return (
    <Heading
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
    >
      {lines.map((line, i) => (
        <motion.span
          key={i}
          className="block py-1"
          variants={{
            hidden: { overflow: "hidden" },
            shown: {
              overflow: "hidden",
              transitionEnd: { overflow: "visible" },
            },
          }}
        >
          <motion.span
            className="block"
            variants={{
              hidden: { y: "108%" },
              shown: {
                y: 0,
                transition: { duration: 0.9, delay: delay + i * 0.09, ease: EASE },
              },
            }}
          >
            {line}
          </motion.span>
        </motion.span>
      ))}
    </Heading>
  );
}
