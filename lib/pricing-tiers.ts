import portfolioData from "@/data/portfolio.json";
import { PortfolioDataSchema } from "@/lib/portfolio";

/**
 * TIERS DE PRECIO · VITRINA NEXORA (FASE 6)
 *
 * Agrupa los ítems de `data/portfolio.json` por nivel de producto (N0–N5) en
 * tiers de venta (Presencia / Negocio / Venta en línea / Plataformas /
 * Ecosistemas), tal como los comunicamos en /precios.
 *
 * REGLA #7: los montos "desde/hasta" se DERIVAN del JSON (fuente de verdad =
 * `precioDesde` de `lib/agency-catalog.ts`). NUNCA hardcodear precios aquí:
 * si cambia el catálogo, los tiers se recalculan solos.
 */

export type NivelTier = {
  /** id estable del tier (para anclas). */
  id: string;
  /** Niveles N0–N5 que agrupa. */
  niveles: string[];
  /** Nombre del tier (Presencia, Negocio, …). */
  titulo: string;
  descripcion: string;
  /** Precio desde (mínimo del tier, MXN IVA incl.). */
  desde: number;
  /** Precio máximo del tier (MXN IVA incl.). */
  hasta: number;
  /** Cuota mensual "desde" = desde/24 (reencuadre de precio). */
  cuota: number;
  /** Qué incluye (copy de venta curado, sin montos). */
  includes: string[];
  /** Nombres de los tipos de web que caen en el tier. */
  ejemplos: string[];
  /** N5 se cotiza con propuesta formal, no precio cerrado. */
  propuestaFormal?: boolean;
};

const TIER_DEFS: {
  niveles: string[];
  titulo: string;
  descripcion: string;
  includes: string[];
  propuestaFormal?: boolean;
}[] = [
  {
    niveles: ["N0", "N1"],
    titulo: "Presencia",
    descripcion:
      "Tu negocio en línea a bajo costo: la entrada perfecta para que te encuentren y te contacten.",
    includes: [
      "Diseño mobile-first con tu marca",
      "Botón de WhatsApp y mapa",
      "SEO básico local (Google)",
      "Entrega en 1–8 días",
    ],
  },
  {
    niveles: ["N2"],
    titulo: "Negocio",
    descripcion:
      "Herramientas que operan tu negocio: citas, cotizaciones y sitios multi-página.",
    includes: [
      "Sitios de varias páginas o sistemas de citas",
      "Cotizador / presupuesto en línea",
      "Panel para administrar contenido",
      "Entrega en 7–18 días",
    ],
  },
  {
    niveles: ["N3"],
    titulo: "Venta en línea",
    descripcion:
      "Vende por internet 24/7: catálogo, carrito y pagos con pasarela.",
    includes: [
      "Tienda con catálogo y carrito",
      "Pagos en línea (Stripe/PayPal)",
      "Panel de pedidos y notificaciones",
      "Escalón pro: inventario, CFDI y multi-vendedor",
    ],
  },
  {
    niveles: ["N4"],
    titulo: "Plataformas",
    descripcion:
      "Sistemas a medida por vertical: inmobiliaria, membresías, cursos, telemedicina y directorios.",
    includes: [
      "Panel de administración propio",
      "Base de datos y cuentas de usuario",
      "Flujos de negocio por vertical",
      "Entrega en 15–30 días",
    ],
  },
  {
    niveles: ["N5"],
    titulo: "Ecosistemas",
    descripcion:
      "Marketplace multi-vendedor, SaaS multi-tenant y ERP. Se cotiza con propuesta formal, no precio cerrado.",
    includes: [
      "Marketplace con split de pagos",
      "SaaS con billing automático",
      "ERP / CRM con módulos de operación",
      "Arquitectura multi-tenant y API pública",
    ],
    propuestaFormal: true,
  },
];

/** Deriva los tiers de precios desde data/portfolio.json (regla #7). */
export function getPricingTiers(): NivelTier[] {
  const items = PortfolioDataSchema.parse(portfolioData);
  return TIER_DEFS.map((def, i) => {
    const inTier = items.filter((it) => {
      const key = it.nivel.split(" ")[0];
      return def.niveles.includes(key);
    });
    const precios = inTier.map((it) => it.precioDesde);
    const desde = precios.length > 0 ? Math.min(...precios) : 0;
    const hasta = precios.length > 0 ? Math.max(...precios) : 0;
    return {
      id: `tier-${i + 1}`,
      niveles: def.niveles,
      titulo: def.titulo,
      descripcion: def.descripcion,
      desde,
      hasta,
      cuota: Math.round(desde / 24),
      includes: def.includes,
      ejemplos: inTier.map((it) => it.nombre),
      propuestaFormal: def.propuestaFormal,
    };
  });
}
