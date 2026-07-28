"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { EASE, useStillness } from "./motion";

/**
 * Counts a figure up once it is on screen. Figures are set in tabular
 * numerals (see .figure) so the column edge never jitters while it runs.
 */
export default function CountUp({
  to,
  suffix = "",
  duration = 1.6,
  className = "",
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const still = useStillness();
  // Always starts at zero so the server's markup and the client's first paint
  // agree; the effect below jumps straight to the figure when holding still.
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (still) {
      setValue(to);
      return;
    }
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, still, to, duration]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
