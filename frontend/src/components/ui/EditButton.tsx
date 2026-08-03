"use client";

import { Pencil } from "lucide-react";

/**
 * A labelled edit button.
 *
 * Replaces the bare pencil icons scattered across the admin and dashboard
 * pages: an icon alone gives no indication of what it does, and offers a tap
 * target too small to hit comfortably on a phone.
 *
 * Styling follows the existing labelled button in admin/members/page.tsx.
 */
export interface EditButtonProps {
  onClick: () => void;
  /** Visible text. Defaults to "Edit". */
  label?: string;
  /** "sm" for dense table rows, "md" elsewhere. */
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

const SIZES = {
  sm: "px-2.5 py-1.5 text-[11px] gap-1",
  md: "px-3 py-2 text-xs gap-1.5",
} as const;

const ICON_SIZES = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
} as const;

export function EditButton({
  onClick,
  label = "Edit",
  size = "md",
  className = "",
  title,
}: EditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 font-bold whitespace-nowrap text-amber-700 transition-colors hover:bg-amber-100 ${SIZES[size]} ${className}`}
    >
      <Pencil className={ICON_SIZES[size]} />
      {label}
    </button>
  );
}
