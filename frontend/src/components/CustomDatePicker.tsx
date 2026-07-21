"use client";

import { Calendar } from "lucide-react";
import { formatDateDDMonthYYYY } from "@/utils/date";
import { useRef } from "react";

interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  min?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export default function CustomDatePicker({
  value,
  onChange,
  min,
  required = false,
  placeholder = "Select Date (e.g. 21 Jul 2026)",
  className = ""
}: CustomDatePickerProps) {
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const displayValue = value ? formatDateDDMonthYYYY(value) : "";

  const handleContainerClick = () => {
    const el = dateInputRef.current;
    if (el) {
      if (typeof (el as any).showPicker === "function") {
        try {
          (el as any).showPicker();
        } catch (e) {
          el.focus();
        }
      } else {
        el.focus();
        el.click();
      }
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={dateInputRef}
        type="date"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
      />
      <div 
        onClick={handleContainerClick}
        className={`flex items-center justify-between px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium transition-all hover:border-amber-500 cursor-pointer ${className}`}
      >
        <span className={displayValue ? "text-zinc-900 font-semibold" : "text-zinc-400"}>
          {displayValue || placeholder}
        </span>
        <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0 ml-2" />
      </div>
    </div>
  );
}
