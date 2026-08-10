"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type FadeInProps = {
  children: ReactNode;
  /** Retraso en segundos antes de animar. */
  delay?: number;
  /** Desplazamiento vertical inicial en px. */
  y?: number;
  className?: string;
};

/** Aparición suave al hacer scroll (whileInView), respeta prefers-reduced-motion. */
export function FadeIn({
  children,
  delay = 0,
  y = 24,
  className,
}: FadeInProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
