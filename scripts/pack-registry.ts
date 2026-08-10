/**
 * REGISTRO DE PACKS · Nexora
 *
 * Fuente de verdad de "qué PACK es cuál" en Vercel/GitHub (código PK, nivel,
 * precio "desde", slug y repo). Se extrajo de `generate-pack-samples.ts` a un
 * módulo propio para que `sync-agency-data.ts` (FASE 5) pueda leerlo SIN
 * ejecutar la generación de packs (ese script tiene efectos de módulo).
 *
 * - `slugVercel`: nombre del proyecto en Vercel → URL = https://{slug}.vercel.app
 * - `repoGitHub`: ruta del repo → URL = https://github.com/{repoGitHub}
 * - `desde`: precio "desde" MXN (IVA incl.) citado por INDICE-PACKS y los PACKs;
 *   debe coincidir con `precioDesde` de `lib/agency-catalog.ts` (regla #7).
 */

export interface PackRegistro {
  codigo: string; // ej. "PK-008"
  nombre: string; // nombre del producto en la agencia
  nivel: string; // ej. "N1 · Presencia"
  desde: number; // precio "desde" MXN (IVA incl.) para la vitrina
  slugVercel: string;
  repoGitHub: string;
  nota?: string; // aclaración opcional (ej. "servicio, sin PACK de web")
}

/** Códigos asignados por orden del catálogo maestro (docs/MERCADO_PAGINAS_VIBECODER.md). */
export const REGISTRO_PACKS: Record<string, PackRegistro> = {
  // Nivel 0 · Entrada
  "PACK-link-in-bio.md": { codigo: "PK-001", nombre: "Link-in-bio premium", nivel: "N0 · Entrada", desde: 2500, slugVercel: "nexora-link-in-bio", repoGitHub: "Nexora/pack-link-in-bio" },
  "PACK-menu-digital.md": { codigo: "PK-002", nombre: "Menú digital con QR", nivel: "N0 · Entrada", desde: 3500, slugVercel: "nexora-menu-digital", repoGitHub: "Nexora/pack-menu-digital" },
  "PACK-tarjeta-digital.md": { codigo: "PK-003", nombre: "Tarjeta digital / minisitio", nivel: "N0 · Entrada", desde: 4500, slugVercel: "nexora-tarjeta-digital", repoGitHub: "Nexora/pack-tarjeta-digital" },
  "PACK-micro-landing.md": { codigo: "PK-004", nombre: "Micro-landing promocional", nivel: "N0 · Entrada", desde: 4500, slugVercel: "nexora-micro-landing", repoGitHub: "Nexora/pack-micro-landing" },
  // Nivel 1 · Presencia
  "PACK-landing-evento.md": { codigo: "PK-006", nombre: "Landing de evento", nivel: "N1 · Presencia", desde: 6500, slugVercel: "nexora-landing-evento", repoGitHub: "Nexora/pack-landing-evento" },
  "PACK-portafolio.md": { codigo: "PK-007", nombre: "Portafolio profesional", nivel: "N1 · Presencia", desde: 7000, slugVercel: "nexora-portafolio", repoGitHub: "Nexora/pack-portafolio" },
  "PACK-landing.md": { codigo: "PK-008", nombre: "Landing page", nivel: "N1 · Presencia", desde: 8500, slugVercel: "nexora-landing", repoGitHub: "Nexora/pack-landing" },
  "PACK-blog.md": { codigo: "PK-009", nombre: "Blog / contenido con SEO", nivel: "N1 · Presencia", desde: 9000, slugVercel: "nexora-blog", repoGitHub: "Nexora/pack-blog" },
  // Nivel 2 · Negocio
  "PACK-multilingue.md": { codigo: "PK-010", nombre: "Sitio multilingüe", nivel: "N2 · Negocio", desde: 11000, slugVercel: "nexora-multilingue", repoGitHub: "Nexora/pack-multilingue" },
  "PACK-pwa.md": { codigo: "PK-011", nombre: "PWA instalable (app sin tienda)", nivel: "N2 · Negocio", desde: 12000, slugVercel: "nexora-pwa", repoGitHub: "Nexora/pack-pwa" },
  "PACK-reservas-restaurante.md": { codigo: "PK-012", nombre: "Reservas de restaurante", nivel: "N2 · Negocio", desde: 12000, slugVercel: "nexora-reservas-restaurante", repoGitHub: "Nexora/pack-reservas-restaurante" },
  "PACK-cotizador.md": { codigo: "PK-013", nombre: "Cotizador / presupuesto en línea", nivel: "N2 · Negocio", desde: 15000, slugVercel: "nexora-cotizador", repoGitHub: "Nexora/pack-cotizador" },
  "PACK-citas.md": { codigo: "PK-014", nombre: "Sistema de citas", nivel: "N2 · Negocio", desde: 15000, slugVercel: "nexora-citas", repoGitHub: "Nexora/pack-citas" },
  "PACK-corporativo.md": { codigo: "PK-015", nombre: "Sitio corporativo (multi-página)", nivel: "N2 · Negocio", desde: 15000, slugVercel: "nexora-corporativo", repoGitHub: "Nexora/pack-corporativo" },
  // Nivel 3 · Venta
  "PACK-reservas-pago.md": { codigo: "PK-016", nombre: "Reservas con pago por adelantado", nivel: "N3 · Venta", desde: 18000, slugVercel: "nexora-reservas-pago", repoGitHub: "Nexora/pack-reservas-pago" },
  "PACK-ecommerce.md": { codigo: "PK-017", nombre: "E-commerce (tienda online)", nivel: "N3 · Venta", desde: 20000, slugVercel: "nexora-ecommerce", repoGitHub: "Nexora/pack-ecommerce" },
  "PACK-ecommerce-pro.md": { codigo: "PK-018", nombre: "E-commerce pro (inventario + CFDI)", nivel: "N3 · Venta", desde: 28000, slugVercel: "nexora-ecommerce-pro", repoGitHub: "Nexora/pack-ecommerce-pro" },
  // Nivel 4 · Plataforma
  "PACK-directorio.md": { codigo: "PK-019", nombre: "Directorio / listado de negocios", nivel: "N4 · Plataforma", desde: 22000, slugVercel: "nexora-directorio", repoGitHub: "Nexora/pack-directorio" },
  "PACK-webapp.md": { codigo: "PK-020", nombre: "Plataforma / webapp a medida", nivel: "N4 · Plataforma", desde: 25000, slugVercel: "nexora-webapp", repoGitHub: "Nexora/pack-webapp" },
  "PACK-inmobiliaria.md": { codigo: "PK-021", nombre: "Portal inmobiliario", nivel: "N4 · Plataforma", desde: 25000, slugVercel: "nexora-inmobiliaria", repoGitHub: "Nexora/pack-inmobiliaria" },
  "PACK-telemedicina.md": { codigo: "PK-022", nombre: "Portal de salud (telemedicina)", nivel: "N4 · Plataforma", desde: 26000, slugVercel: "nexora-telemedicina", repoGitHub: "Nexora/pack-telemedicina" },
  "PACK-membresias.md": { codigo: "PK-023", nombre: "Portal de membresías", nivel: "N4 · Plataforma", desde: 28000, slugVercel: "nexora-membresias", repoGitHub: "Nexora/pack-membresias" },
  "PACK-cursos.md": { codigo: "PK-024", nombre: "Plataforma de cursos online", nivel: "N4 · Plataforma", desde: 30000, slugVercel: "nexora-cursos", repoGitHub: "Nexora/pack-cursos" },
  // Nivel 5 · Ecosistema
  "PACK-marketplace.md": { codigo: "PK-025", nombre: "Marketplace multi-vendedor", nivel: "N5 · Ecosistema", desde: 40000, slugVercel: "nexora-marketplace", repoGitHub: "Nexora/pack-marketplace" },
  "PACK-marketplace-split.md": { codigo: "PK-026", nombre: "Marketplace con split de pagos", nivel: "N5 · Ecosistema", desde: 70000, slugVercel: "nexora-marketplace-split", repoGitHub: "Nexora/pack-marketplace-split" },
  "PACK-saas.md": { codigo: "PK-027", nombre: "SaaS multi-tenant B2B", nivel: "N5 · Ecosistema", desde: 60000, slugVercel: "nexora-saas", repoGitHub: "Nexora/pack-saas" },
  "PACK-erp.md": { codigo: "PK-028", nombre: "ERP / CRM a medida", nivel: "N5 · Ecosistema", desde: 90000, slugVercel: "nexora-erp", repoGitHub: "Nexora/pack-erp" },
  // Extra · demo
  "PACK-psicologo.md": { codigo: "PK-029", nombre: "Landing de psicólogo con asistente IA", nivel: "N1 · Presencia (extra)", desde: 12000, slugVercel: "nexora-psicologo", repoGitHub: "Nexora/pack-psicologo" },
};

/** Servicios de la agencia que NO generan un PACK de web (se listan igual en el índice). */
export const SERVICIOS_SIN_PACK: { codigo: string; nombre: string; nivel: string; desde: number; nota: string }[] = [
  {
    codigo: "PK-005",
    nombre: "Perfil Google Business (setup)",
    nivel: "N0 · Entrada",
    desde: 3000,
    nota: "Servicio de setup/optimización (no es una web): se ofrece junto a cualquier landing. Sin PACK de prompts.",
  },
];
