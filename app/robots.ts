import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * robots.txt de la vitrina Nexora (FASE 8 · SEO).
 * index,follow en todo el sitio + referencia al sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
