import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FadeInProps = {
  children: ReactNode;
  /** Retraso en segundos antes de animar. */
  delay?: number;
  /** Desplazamiento vertical inicial en px. */
  y?: number;
  className?: string;
};

/**
 * Aparición suave al montar (animación CSS en compositor: no registra observers
 * ni bloquea el main thread). Respeta prefers-reduced-motion vía CSS.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 24,
  className,
}: FadeInProps) {
  return (
    <div
      className={cn("nexora-rise", className)}
      style={
        {
          animationDelay: `${delay}s`,
          "--nexora-rise-y": `${y}px`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
