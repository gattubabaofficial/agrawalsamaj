"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useStillness } from "./motion";

// Wrapping Link keeps client-side routing while still accepting motion props.
const MotionLink = motion.create(Link);

type Variant = "solid" | "outline" | "bare" | "inverse";

const VARIANTS: Record<Variant, string> = {
  solid: "bg-vermilion text-paper border border-vermilion hover:bg-vermilion-deep hover:border-vermilion-deep",
  outline: "bg-transparent text-ink border border-rule-strong hover:border-ink hover:bg-paper-2",
  inverse: "bg-paper text-ink border border-paper hover:bg-paper-2 hover:border-paper-2",
  bare: "bg-transparent text-ink border border-transparent !px-0 hover:text-vermilion",
};

/**
 * The site's call to action. It leans toward the cursor slightly before the
 * cursor arrives — a small piece of attentiveness rather than a party trick,
 * so the pull stays under a quarter of the real pointer distance.
 *
 * Falls back to a plain, still link on coarse pointers and for visitors who
 * have asked for reduced motion.
 */
export default function ActionLink({
  href,
  children,
  variant = "solid",
  className = "",
  strength = 0.22,
  onClick,
  title,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  strength?: number;
  onClick?: () => void;
  title?: string;
}) {
  const reduce = useStillness();
  const ref = useRef<HTMLAnchorElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 22, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 260, damping: 22, mass: 0.4 });

  const handleMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Coarse pointers have no meaningful hover state; skip the maths entirely.
    if (reduce || !ref.current || !window.matchMedia("(pointer: fine)").matches) return;
    const box = ref.current.getBoundingClientRect();
    x.set((e.clientX - (box.left + box.width / 2)) * strength);
    y.set((e.clientY - (box.top + box.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <MotionLink
      ref={ref}
      href={href}
      title={title}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={reduce ? undefined : { x: springX, y: springY }}
      className={
        "group relative inline-flex items-center justify-center gap-2.5 " +
        "px-7 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.16em] " +
        `transition-colors duration-300 ${VARIANTS[variant]} ${className}`
      }
    >
      {children}
    </MotionLink>
  );
}
