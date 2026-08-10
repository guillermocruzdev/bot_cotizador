import type { MetadataRoute } from "next";
import portfolioData from "@/data/portfolio.json";
import { PortfolioDataSchema } from "@/lib/portfolio";
import { siteConfig } from "@/lib/site";

/**
 * Sitemap de la vitrina Nexora (FASE 8 · SEO).
 * Rutas estáticas de la vitrina + rutas del bot + una URL por PACK del
 * portafolio (data/portfolio.json, 28 ítems) — data-driven, cero hardcode.
 */
const items = PortfolioDataSchema.parse(portfolioData);

type Freq = "daily" | "weekly" | "monthly" | "yearly";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: Freq }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/servicios", priority: 0.8, changeFrequency: "weekly" },
  { path: "/portafolio", priority: 0.8, changeFrequency: "weekly" },
  { path: "/proceso", priority: 0.7, changeFrequency: "monthly" },
  { path: "/precios", priority: 0.8, changeFrequency: "monthly" },
  { path: "/preguntas", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contacto", priority: 0.7, changeFrequency: "monthly" },
  { path: "/aviso-privacidad", priority: 0.3, changeFrequency: "yearly" },
  { path: "/chat", priority: 0.9, changeFrequency: "monthly" },
  { path: "/results", priority: 0.3, changeFrequency: "monthly" },
  { path: "/demo", priority: 0.3, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticUrls: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${siteConfig.url}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const packUrls: MetadataRoute.Sitemap = items.map((it) => ({
    url: `${siteConfig.url}/portafolio/${it.codigo}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticUrls, ...packUrls];
}
