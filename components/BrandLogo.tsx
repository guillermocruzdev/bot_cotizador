import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo de Nexora (assets SVG de FASE 0 en public/brand/).
 * Variantes: "full" (mark + wordmark), "mono" (una tinta para fondos oscuros),
 * "mark" (solo el símbolo hexágono-nodo).
 */
type BrandLogoProps = {
  variant?: "full" | "mono" | "mark";
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
  priority?: boolean;
};

const SRC: Record<NonNullable<BrandLogoProps["variant"]>, string> = {
  full: "/brand/logo-full.svg",
  mono: "/brand/logo-mono.svg",
  mark: "/brand/mark.svg",
};

export function BrandLogo({
  variant = "full",
  className,
  width,
  height,
  alt = "Nexora — El nexo entre tu negocio y tus clientes",
  priority = false,
}: BrandLogoProps) {
  const isMark = variant === "mark";
  return (
    <Image
      src={SRC[variant]}
      alt={alt}
      width={width ?? (isMark ? 32 : 180)}
      height={height ?? (isMark ? 32 : 48)}
      className={cn("h-auto w-auto", className)}
      priority={priority}
    />
  );
}
