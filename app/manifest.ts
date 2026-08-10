import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * Web App Manifest de la vitrina Nexora (FASE 8 · SEO/PWA básica).
 * theme_color = brand #2563EB; fondo = surface #FAFAFA; iconos desde /brand.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexora · Webs que venden. Hechas con IA.",
    short_name: "Nexora",
    description: siteConfig.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#2563EB",
    icons: [
      {
        src: "/brand/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/favicon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/brand/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/brand/og.png",
        sizes: "1200x630",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
