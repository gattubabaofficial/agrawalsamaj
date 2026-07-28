"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Eyebrow, Rule, Section } from "@/components/ui/primitives";
import { Reveal, SplitHeading, EASE, useStillness } from "@/components/ui/motion";

/* Photographs from the samaj's own gatherings. Only images that exist in
   /public are listed here — a placeholder would undo the whole page. */

const PLATES = [
  { src: "/gallery/yog_divas/yoga_1.jpg", caption: "Yog Divas · morning session" },
  { src: "/gallery/yog_divas/yoga_4.jpg", caption: "Yog Divas · the lawn" },
  { src: "/gallery/yog_divas/yoga_3.jpg", caption: "Yog Divas · children's row" },
  { src: "/gallery/yog_divas/yoga_5.jpg", caption: "Yog Divas · closing āsana" },
  { src: "/gallery/yog_divas/yoga_6.jpg", caption: "Yog Divas · volunteers" },
  { src: "/gallery/yog_divas/yoga_7.jpg", caption: "Yog Divas · the full hall" },
];

export default function Gallery() {
  const reduce = useStillness();
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback((delta: number) => {
    setOpen((i) => (i === null ? i : (i + delta + PLATES.length) % PLATES.length));
  }, []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  return (
    <Section className="bg-paper py-24 sm:py-32">
      <Reveal>
        <Eyebrow>From the gatherings</Eyebrow>
      </Reveal>

      <div className="flex flex-wrap items-end justify-between gap-6">
        <SplitHeading
          className="display mt-6 max-w-2xl text-[clamp(2rem,5.5vw,3.75rem)]"
          lines={["The samaj, as it", "actually looks."]}
          delay={0.05}
        />
      </div>

      <Reveal delay={0.1}>
        <Rule tone="strong" className="mt-10" />
      </Reveal>

      {/* Asymmetric plate grid: the lead image runs tall, the rest fall in
          beside it, so the band never reads as a uniform tile wall. */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {PLATES.map((plate, i) => (
          <motion.button
            key={plate.src}
            type="button"
            onClick={() => setOpen(i)}
            initial={reduce ? undefined : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            whileInView={reduce ? undefined : { opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.9, delay: (i % 4) * 0.08, ease: EASE }}
            className={`group relative overflow-hidden bg-paper-2 ${
              i === 0 ? "col-span-2 row-span-2 aspect-square lg:aspect-[4/5]" : "aspect-[4/3]"
            }`}
          >
            <Image
              src={plate.src}
              alt={plate.caption}
              fill
              sizes={i === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"}
              className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
            />
            <span className="absolute inset-0 bg-char/0 transition-colors duration-500 group-hover:bg-char/20" />
            <span className="eyebrow absolute bottom-3 left-3 right-3 text-left !tracking-[0.16em] text-paper opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              {plate.caption}
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {open !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-100 grid place-items-center bg-char/95 p-4 sm:p-10"
            role="dialog"
            aria-modal="true"
            aria-label={PLATES[open].caption}
            onClick={() => setOpen(null)}
          >
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-5 top-5 p-2 text-paper/70 transition-colors hover:text-paper"
            >
              <X className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); step(-1); }}
              aria-label="Previous photograph"
              className="absolute left-3 p-2 text-paper/70 transition-colors hover:text-paper sm:left-8"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); step(1); }}
              aria-label="Next photograph"
              className="absolute right-3 p-2 text-paper/70 transition-colors hover:text-paper sm:right-8"
            >
              <ChevronRight className="h-7 w-7" />
            </button>

            <motion.figure
              key={open}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="relative max-h-full w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-[3/2] w-full">
                <Image
                  src={PLATES[open].src}
                  alt={PLATES[open].caption}
                  fill
                  sizes="90vw"
                  className="object-contain"
                />
              </div>
              <figcaption className="eyebrow mt-5 justify-center text-paper/55">
                {PLATES[open].caption}
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
