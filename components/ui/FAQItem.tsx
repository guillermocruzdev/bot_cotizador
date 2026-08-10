"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FAQItemProps = {
  question: string;
  answer: ReactNode;
  /** Abierto por defecto. */
  defaultOpen?: boolean;
  className?: string;
};

/** Acordeón de FAQ accesible (aria-expanded/controls). */
export function FAQItem({
  question,
  answer,
  defaultOpen = false,
  className,
}: FAQItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `faq-${question.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}`;
  return (
    <div
      className={cn(
        "rounded-2xl border border-night-900/10 bg-white",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-heading font-semibold text-night-900 transition hover:text-brand-700"
      >
        {question}
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-brand-600 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div
          id={id}
          className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground"
        >
          {answer}
        </div>
      ) : null}
    </div>
  );
}
