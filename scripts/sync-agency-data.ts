/**
 * SYNC AGENCIA → PORTFOLIO.JSON (FASE 5 · Portafolio data-driven)
 *
 * Genera `data/portfolio.json` — la fuente de verdad de la vitrina `/portafolio`
 * (y del detalle `/portafolio/[codigo]`) — concatenando dos fuentes:
 *
 *   - `REGISTRO_PACKS` de `scripts/pack-registry.ts`: los 28 PACKs de la agencia
 *     con su código PK, nivel, precio "desde", slug Vercel y repo GitHub.
 *   - `AGENCY_WEB_TYPES` de `lib/agency-catalog.ts`: la descripción del tipo y su
 *     `categoriaBase`; su `precioDesde` es la fuente de precio (regla #7:
 *     UI = pack = PDF = copy, mismo total).
 *
 * Ejecutar: npx tsx scripts/sync-agency-data.ts  (o `npm run sync:agencia`).
 *
 * El estado de despliegue (`disponible`/`proximamente`) se PRESERVA del JSON
 * anterior: cuando despliegues una demo, marca ese ítem como `"disponible"` en
 * `data/portfolio.json` (y anótalo en `docs/prompts/REGISTRO-DEPLOY.md`); la
 * siguiente corrida de este script lo conserva. Los ítems nuevos nacen
 * `"proximamente"` (ninguna demo está desplegada todavía).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getWebTypeById } from "../lib/agency-catalog";
import { PortfolioDataSchema, type PortfolioItem } from "../lib/portfolio";
import { REGISTRO_PACKS } from "./pack-registry";

const OUT_PATH = join(process.cwd(), "data", "portfolio.json");

/**
 * Mapea el archivo del PACK (clave de REGISTRO_PACKS) al `id` del tipo en
 * AGENCY_WEB_TYPES. Es explícito (no derivado por nombre) porque varios archivos
 * no coinciden con el id del catálogo (p. ej. PACK-landing-evento → "evento",
 * PACK-pwa → "pwa_app", PACK-cursos → "curso_online").
 */
const PACK_TO_AGENCY_ID: Record<string, string> = {
  "PACK-link-in-bio.md": "link_in_bio",
  "PACK-menu-digital.md": "menu_digital",
  "PACK-tarjeta-digital.md": "tarjeta_digital",
  "PACK-micro-landing.md": "micro_landing", // sin tipo en agency-catalog → FALLBACK_EXTRA
  "PACK-landing-evento.md": "evento",
  "PACK-portafolio.md": "portafolio",
  "PACK-landing.md": "landing",
  "PACK-blog.md": "blog",
  "PACK-multilingue.md": "multilingue",
  "PACK-pwa.md": "pwa_app",
  "PACK-reservas-restaurante.md": "reservas_restaurante",
  "PACK-cotizador.md": "cotizador",
  "PACK-citas.md": "citas",
  "PACK-corporativo.md": "corporativo",
  "PACK-reservas-pago.md": "reservas_pago", // sin tipo → FALLBACK_EXTRA
  "PACK-ecommerce.md": "ecommerce",
  "PACK-ecommerce-pro.md": "ecommerce_pro", // sin tipo → FALLBACK_EXTRA
  "PACK-directorio.md": "directorio",
  "PACK-webapp.md": "webapp",
  "PACK-inmobiliaria.md": "inmobiliaria",
  "PACK-telemedicina.md": "telemedicina",
  "PACK-membresias.md": "membresias",
  "PACK-cursos.md": "curso_online",
  "PACK-marketplace.md": "marketplace",
  "PACK-marketplace-split.md": "marketplace_split",
  "PACK-saas.md": "saas",
  "PACK-erp.md": "erp",
  "PACK-psicologo.md": "psicologo", // sin tipo → FALLBACK_EXTRA
};

/** Packs sin tipo equivalente en AGENCY_WEB_TYPES: descripción + categoría base de respaldo. */
const FALLBACK_EXTRA: Record<string, { descripcion: string; categoriaBase: string }> = {
  "PACK-micro-landing.md": {
    descripcion:
      "Micro-página de una sola vista para campañas, lanzamientos o productos puntuales: mensaje claro, un CTA y cero distracciones.",
    categoriaBase: "landing",
  },
  "PACK-reservas-pago.md": {
    descripcion:
      "Reservas en línea con pago por adelantado al agendar (anticipo) y recordatorios automáticos para reducir inasistencias.",
    categoriaBase: "citas",
  },
  "PACK-ecommerce-pro.md": {
    descripcion:
      "Tienda online avanzada: control de inventario (tallas, colores, stock), reportes de venta y facturación CFDI.",
    categoriaBase: "ecommerce",
  },
  "PACK-psicologo.md": {
    descripcion:
      "Landing de psicólogo con asistente IA que recibe al visitante, responde dudas frecuentes y agenda la primera cita.",
    categoriaBase: "landing",
  },
};

/** Lee el estado de despliegue del JSON previo (si existe) para preservarlo. */
function readPrevEstado(): Map<string, PortfolioItem["estado"]> {
  const mapa = new Map<string, PortfolioItem["estado"]>();
  if (!existsSync(OUT_PATH)) return mapa;
  try {
    const raw = JSON.parse(readFileSync(OUT_PATH, "utf8")) as unknown;
    const prev = PortfolioDataSchema.parse(raw);
    for (const it of prev) mapa.set(it.codigo, it.estado);
  } catch {
    // JSON previo inexistente o inválido → todos nacen "proximamente".
  }
  return mapa;
}

function buildItems(): PortfolioItem[] {
  const prevEstado = readPrevEstado();
  const items: PortfolioItem[] = [];

  for (const [file, pack] of Object.entries(REGISTRO_PACKS)) {
    const agencyId = PACK_TO_AGENCY_ID[file];
    const spec = agencyId ? getWebTypeById(agencyId) : undefined;
    const extra = FALLBACK_EXTRA[file];

    const descripcion = spec?.descripcion ?? extra?.descripcion ?? pack.nombre;
    const categoriaBase = spec?.categoriaBase ?? extra?.categoriaBase ?? "landing";
    // Fuente de precio: agency-catalog (regla #7); el registro solo para packs sin tipo.
    const precioDesde = spec?.precioDesde ?? pack.desde;

    if (spec && spec.precioDesde !== pack.desde) {
      console.warn(
        `⚠ ${pack.codigo} ${pack.nombre}: agency.precioDesde (${spec.precioDesde}) ≠ REGISTRO_PACKS.desde (${pack.desde}) — el JSON usa agency (regla #7); revisa pack-registry.ts.`
      );
    }

    items.push({
      codigo: pack.codigo,
      nombre: pack.nombre,
      nivel: pack.nivel,
      descripcion,
      precioDesde,
      categoriaBase,
      slugVercel: pack.slugVercel,
      repoGitHub: pack.repoGitHub,
      urlDemo: `https://${pack.slugVercel}.vercel.app`,
      repo: `https://github.com/${pack.repoGitHub}`,
      estado: prevEstado.get(pack.codigo) ?? "proximamente",
    });
  }

  // Orden estable por código PK (PK-001 … PK-029), igual que INDICE-PACKS.md.
  items.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
  return items;
}

function main(): void {
  const items = buildItems();
  const data = PortfolioDataSchema.parse(items); // valida con zod antes de escribir
  writeFileSync(OUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  // Resumen por nivel para verificar cobertura N0–N5 de un vistazo.
  const porNivel = new Map<string, number>();
  for (const it of data) {
    const key = /N[0-5]/.exec(it.nivel)?.[0] ?? "?";
    porNivel.set(key, (porNivel.get(key) ?? 0) + 1);
  }
  const resumen = Array.from(porNivel.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([k, n]) => `${k}=${n}`)
    .join(" · ");

  console.log(`✓ ${data.length} PACKs escritos en ${OUT_PATH}`);
  console.log(`  Cobertura por nivel: ${resumen}`);
  if (data.some((it) => it.estado === "disponible")) {
    console.log("  Nota: algunos ítems están marcados 'disponible' (demos desplegadas).");
  } else {
    console.log("  Nota: todas las demos están 'proximamente' (ninguna desplegada aún).");
  }
}

main();
