import type { ReactNode } from "react";

/**
 * The small caps label that opens nearly every section. Optionally carries
 * an index — used where the content genuinely is an ordered set.
 */
export function Eyebrow({
  children,
  index,
  className = "",
  tone = "muted",
}: {
  children: ReactNode;
  index?: string;
  className?: string;
  tone?: "muted" | "accent" | "inverse";
}) {
  const toneClass =
    tone === "accent"
      ? "text-vermilion"
      : tone === "inverse"
        ? "text-paper/55"
        : "text-ink-3";

  return (
    <p className={`eyebrow flex items-center gap-3 ${toneClass} ${className}`}>
      {index && (
        <>
          <span className="tabular-nums">{index}</span>
          <span
            aria-hidden
            className="h-px w-6 bg-current opacity-40"
          />
        </>
      )}
      {children}
    </p>
  );
}

/** Hairline divider. The site's most-used piece of structure. */
export function Rule({
  className = "",
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "strong" | "gold" | "inverse";
}) {
  const toneClass = {
    default: "bg-rule",
    strong: "bg-rule-strong",
    gold: "bg-gold/45",
    inverse: "bg-paper/15",
  }[tone];

  return <div aria-hidden className={`h-px w-full ${toneClass} ${className}`} />;
}

/**
 * Printer's crop marks. Borrowed from the paper world the type comes from —
 * they frame the cinematic stage without the heaviness of a border.
 */
export function CropMarks({
  className = "",
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "paper";
}) {
  const color = tone === "paper" ? "border-paper/35" : "border-ink/25";
  const arm = "absolute h-5 w-5";

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-5 sm:inset-8 ${className}`}>
      <span className={`${arm} left-0 top-0 border-l border-t ${color}`} />
      <span className={`${arm} right-0 top-0 border-r border-t ${color}`} />
      <span className={`${arm} bottom-0 left-0 border-b border-l ${color}`} />
      <span className={`${arm} bottom-0 right-0 border-b border-r ${color}`} />
    </div>
  );
}

/**
 * Section wrapper. Holds the page's one container width and rhythm so
 * sections can't drift apart from each other over time.
 */
export function Section({
  children,
  className = "",
  id,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  width?: "default" | "wide" | "narrow";
}) {
  const max = {
    narrow: "max-w-3xl",
    default: "max-w-[78rem]",
    wide: "max-w-[92rem]",
  }[width];

  return (
    <section id={id} className={className}>
      <div className={`${max} mx-auto px-5 sm:px-8 lg:px-12`}>{children}</div>
    </section>
  );
}
