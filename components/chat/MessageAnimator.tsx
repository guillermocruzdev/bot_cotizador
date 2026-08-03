"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Animación de entrada para mensajes: fade-in + slide-up.
 * Se reutiliza también en la pantalla de resultados (staggered).
 */
export function MessageAnimator({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
