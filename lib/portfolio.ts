import { z } from "zod";

/**
 * Tipos de la vitrina data-driven de Nexora (FASE 1).
 * `data/portfolio.json` (raíz de la app) es la fuente de verdad del portafolio:
 * lo genera `scripts/sync-agency-data.ts` (FASE 5) leyendo `lib/agency-catalog.ts`
 * (AGENCY_WEB_TYPES) + `REGISTRO_PACKS` de `scripts/generate-pack-samples.ts`.
 *
 * Regla #7: los precios SIEMPRE salen de `precioDesde` (UI = pack = copy = PDF).
 */
export const PortfolioItemSchema = z.object({
  /** Código de registro único, p. ej. "PK-001" */
  codigo: z.string(),
  /** Nombre del tipo de web, p. ej. "Landing page" */
  nombre: z.string(),
  /** Nivel de producto N0–N5 */
  nivel: z.string(),
  descripcion: z.string(),
  /** Precio "desde" en MXN (fuente: lib/agency-catalog.ts precioDesde) */
  precioDesde: z.number(),
  /** Categoría base del motor (landing, ecommerce, webapp, citas, ...) */
  categoriaBase: z.string(),
  /** Slug de la demo desplegada en Vercel (nexora-<tipo>) */
  slugVercel: z.string(),
  /** Repo GitHub (Nexora/pack-<tipo>) */
  repoGitHub: z.string(),
  /** URL de la demo (https://{slugVercel}.vercel.app) */
  urlDemo: z.string().optional(),
  /** URL del repo (https://github.com/{repoGitHub}) */
  repo: z.string().optional(),
  /** Estado de despliegue de la demo */
  estado: z.enum(["disponible", "proximamente"]).default("disponible"),
});

/** La data completa del portafolio es un array de ítems. */
export const PortfolioDataSchema = z.array(PortfolioItemSchema);

export type PortfolioItem = z.infer<typeof PortfolioItemSchema>;
export type PortfolioData = z.infer<typeof PortfolioDataSchema>;
