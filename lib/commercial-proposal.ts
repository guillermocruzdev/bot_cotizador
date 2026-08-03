/**
 * PROPUESTA COMERCIAL — Estructura de Directora de Ventas Senior
 *
 * Genera la propuesta formal (portada + 5 páginas) con la que el bot cierra
 * la venta. Reglas estrictas:
 * - Precio EXACTO (nunca rangos). Aparece solo en la página de inversión.
 * - Cero tecnología (nada de React, hosting, frameworks...). Solo resultados.
 * - Cero emojis. Segunda persona del singular. Sin disculparse por el precio.
 * - Garantía, condiciones 50/50, 2 rondas de revisión y CTA de autorización.
 *
 * El prompt técnico para Roo Code sigue siendo interno (lib/prompt-builder.ts).
 */

import type { AnalysisResult, ChatContext } from "@/lib/types";

// ─── Datos del vendedor (configura en .env) ─────────────────────────

export const VENDOR = {
  nombre: process.env.NEXT_PUBLIC_DEVELOPER_NAME || "Tu nombre",
  empresa: process.env.NEXT_PUBLIC_AGENCY_NAME || "Cotizador.web",
  email: process.env.NEXT_PUBLIC_DEVELOPER_EMAIL || "hola@tuagencia.mx",
  whatsapp: process.env.NEXT_PUBLIC_DEVELOPER_WHATSAPP || "",
};

const IVA_RATE = 0.16;

// ─── Helpers ───────────────────────────────────────────────────────

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-MX")} MXN`;
const fmtInt = (n: number) => Math.round(n).toLocaleString("es-MX");

function fecha(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function addDias(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Detecta ciudad/estado dentro de la descripción del negocio */
function detectarCiudad(descripcion: string | null): string | null {
  const t = (descripcion ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const ciudades = [
    "madero", "tampico", "monterrey", "guadalajara", "cdmx", "ciudad de mexico",
    "puebla", "queretaro", "leon", "bajio", "saltillo", "torreon", "culiacan",
    "mazatlan", "hermosillo", "tijuana", "mexicali", "veracruz", "xalapa",
    "villahermosa", "tuxtla", "oaxaca", "morelia", "aguascalientes", "campeche",
    "merida", "cancun", "playa del carmen", "chihuahua", "durango", "zacatecas",
    "san luis potosi", "colima", "manzanillo", "los cabos", "la paz", "nuevo laredo",
    "reynosa", "matamoros", "ciudad victoria", "poza rica", "coatzacoalcos",
  ];
  for (const c of ciudades) {
    if (t.includes(c)) {
      return c
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }
  return null;
}

/** Reencuadra funcionalidades como RESULTADOS de negocio ("Tus clientes podrán...") */
function reframeFuncionalidad(f: string): string {
  const t = f.toLowerCase();
  if (/(calendario|citas|agenda|agendar)/.test(t)) {
    return `Tus clientes podrán agendar por su cuenta, sin llamadas de por medio.`;
  }
  if (/(pago|pagaran|tarjeta|transferencia|pagar)/.test(t)) {
    return `Tus clientes podrán pagar en línea de forma segura.`;
  }
  if (/(formulario|contacto)/.test(t)) {
    return `Tus clientes podrán contactarte y pedir información con un solo clic.`;
  }
  if (/(google|seo|buscador|encontra)/.test(t)) {
    return `Tendrás una página que te encuentra cuando te buscan en Google.`;
  }
  if (/(panel|administrar|dashboard)/.test(t)) {
    return `Tendrás un panel donde ves y controlas tu información en un solo lugar.`;
  }
  if (/(mapa|sucursal|ubicacion)/.test(t)) {
    return `Tus clientes podrán ver tu ubicación y llegar sin perderse.`;
  }
  if (/(whatsapp|escriban|chat|mensaje)/.test(t)) {
    return `Tus clientes podrán escribirte por WhatsApp directo desde la página.`;
  }
  if (/(instalar|app|celular|pwa)/.test(t)) {
    return `Tus clientes podrán guardar tu página en su celular como una app.`;
  }
  if (/(pagina principal|informacion|inicio)/.test(t)) {
    return `Tendrás una página principal que presenta tu negocio con seriedad.`;
  }
  if (/(diseno|celular|tablet|responsive)/.test(t)) {
    return `Tendrás una página impecable en celular, tablet y computadora.`;
  }
  return f;
}

// ─── Tipos ─────────────────────────────────────────────────────────

export interface EntregableValor {
  nombre: string;
  valor: number;
}

export interface CommercialProposal {
  numero: string;
  fechaEmision: string;
  fechaVigencia: string;
  cliente: { negocio: string; giro: string; ciudad: string | null; contacto: string };
  vendedor: typeof VENDOR;
  dolor: string;
  costo_omision: string;
  solucionIntro: string;
  solucionBullets: string[];
  entregables: EntregableValor[];
  total: number;
  subtotal: number;
  iva: number;
  anticipo: number;
  saldo: number;
  diasEntrega: number;
  rondasRevision: number;
  garantiaDias: number;
  cta: string;
  notaLegal: string;
}

// ─── Constructor ───────────────────────────────────────────────────

export function buildCommercialProposal(
  result: AnalysisResult,
  context: ChatContext
): CommercialProposal {
  const hoy = new Date();
  const numero = `PC-2026-${100 + Math.floor(Math.random() * 900)}`;

  // Precio EXACTO: usamos el "gancho" ajustado (lo que el cliente pagará).
  const total = Math.max(result.precio_min, 1000);
  const subtotal = Math.round(total / (1 + IVA_RATE));
  const iva = total - subtotal;
  const anticipo = total / 2;
  const saldo = total - anticipo;

  // Días de entrega: promedio del rango estimado ("18-28 días" → 23).
  const nums = (result.tiempo_estimado.match(/\d+/g) ?? []).map(Number);
  const diasEntrega = nums.length
    ? Math.round((Math.min(...nums) + Math.max(...nums)) / 2)
    : 10;

  // Bullets de solución: beneficios de negocio + funcionalidades reencuadradas.
  // Los reencuadres que repiten el tema de un beneficio se descartan (sin duplicados).
  const beneficios = (result.beneficios ?? []).map((b) => b.trim()).filter(Boolean);
  const reframes = (result.funcionalidades ?? []).slice(0, 6).map(reframeFuncionalidad);
  const palaClave = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z]+/)
        .filter((w) => w.length > 3 && !["tus", "tendra", "podran", "podras", "tendras", "podran"].includes(w))
    );
  const beneficiosTokens = beneficios.flatMap((b) => Array.from(palaClave(b)));
  const keptReframes: string[] = [];
  const seen = new Set<string>();
  for (const r of reframes) {
    const tokens = Array.from(palaClave(r));
    const solapa = tokens.some((t) => beneficiosTokens.includes(t));
    const key = r.toLowerCase();
    if (!solapa && !seen.has(key)) {
      keptReframes.push(r);
      seen.add(key);
    }
    if (keptReframes.length >= 4) break;
  }
  const solucionBullets = [...beneficios, ...keptReframes].slice(0, 6);

  // Entregables con valor asignado (reparte el total entre los entregables).
  const entregablesBase = result.entregables?.length
    ? result.entregables
    : ["Página web funcional y profesional", "Revisión final y ajustes"];
  const n = entregablesBase.length;
  const valorBase = Math.floor((subtotal / n) / 100) * 100;
  const entregables: EntregableValor[] = entregablesBase.map((nombre, i) => ({
    nombre,
    valor: i === n - 1 ? Math.max(Math.round(subtotal - valorBase * (n - 1)), 0) : valorBase,
  }));

  return {
    numero,
    fechaEmision: fecha(hoy),
    fechaVigencia: fecha(addDias(hoy, 7)),
    cliente: {
      negocio: context.clientName || result.clientName || "Su negocio",
      giro: result.giro || result.categoria,
      ciudad: detectarCiudad(context.negocioDescripcion),
      contacto: context.clientName || result.clientName || "",
    },
    vendedor: VENDOR,
    dolor: result.dolor || "Su negocio pierde oportunidades porque no tiene una presencia digital clara.",
    costo_omision: result.costo_omision || "Cada cliente que no lo encuentra termina contratando a la competencia.",
    solucionIntro: result.punto_venta || "Una página que trabaja para su negocio todos los días.",
    solucionBullets,
    entregables,
    total,
    subtotal,
    iva,
    anticipo,
    saldo,
    diasEntrega,
    rondasRevision: 2,
    garantiaDias: 15,
    cta:
      "Para iniciar, responde este correo con la frase \"AUTORIZO LA PROPUESTA\" y realiza el pago del anticipo. El proyecto se agenda al confirmar el anticipo.",
    notaLegal: `Precios vigentes hasta ${fecha(addDias(hoy, 7))}. Los tiempos de entrega comienzan a partir de la confirmación del anticipo y entrega de materiales por parte del cliente.`,
  };
}

// ─── Markdown (listo para que un diseñador lo convierta en PDF) ────

export function toMarkdown(p: CommercialProposal): string {
  const logoV = `![LOGO DEL VENDEDOR](${p.vendedor.empresa})`;
  const logoC = `![LOGO DEL CLIENTE](${p.cliente.negocio})`;

  return `<!-- ═══════════ PORTADA ═══════════ -->
<div style="text-align:center; padding-top:120px;">

${logoV}   ${logoC}

# PROPUESTA COMERCIAL

**Número de propuesta:** ${p.numero}
**Fecha de emisión:** ${p.fechaEmision}
**Vigencia:** ${p.fechaVigencia} (7 días naturales)

**Vendedor:** ${p.vendedor.nombre} · ${p.vendedor.empresa}
**Contacto:** ${p.vendedor.email} ${p.vendedor.whatsapp ? `· WhatsApp: ${p.vendedor.whatsapp}` : ""}

**Cliente:** ${p.cliente.negocio}
**Contacto:** ${p.cliente.contacto}
**Giro:** ${p.cliente.giro}${p.cliente.ciudad ? ` · Ubicación: ${p.cliente.ciudad}` : ""}

</div>

<!-- ═══════════ PÁGINA 1 · DIAGNÓSTICO DEL DOLOR ═══════════ -->

## 1. Diagnóstico del dolor

Queremos que este documento sea una conversación honesta, no una lista de precios.

Hoy, **${p.cliente.negocio}** enfrenta una situación que se repite cada semana:

> ${p.dolor}

Esto no es un detalle menor. En su giro (${p.cliente.giro.toLowerCase()}), cada día sin una presencia profesional clara representa una oportunidad que se va con la competencia:

> ${p.costo_omision}

La buena noticia: este problema **tiene solución**, y en las siguientes páginas se la explicamos con claridad.

<!-- ═══════════ PÁGINA 2 · LA SOLUCIÓN ═══════════ -->

## 2. La solución

${p.solucionIntro}

No le hablaremos de tecnología: le hablaremos de **resultados** para su negocio.

- ${p.solucionBullets.join("\n- ")}

En resumen: **${p.cliente.negocio}** dejará de perder oportunidades y empezará a recibir clientes de forma constante, con una imagen a la altura del trabajo que ya hace.

<!-- ═══════════ PÁGINA 3 · ENTREGABLES ═══════════ -->

## 3. Entregables y su valor

Esto es exactamente lo que recibirá, en qué formato y con qué valor:

| Entregable | Valor |
|---|---|
${p.entregables.map((e) => `| ${e.nombre} | **${fmt(e.valor)}** |`).join("\n")}
| **Valor total de la solución** | **${fmt(p.subtotal)} + IVA** |

*Plazo de entrega: **${p.diasEntrega} días** a partir de la confirmación del anticipo y la entrega de materiales.*

<!-- ═══════════ PÁGINA 4 · INVERSIÓN Y CONDICIONES ═══════════ -->

## 4. Inversión y condiciones

La inversión total para que ${p.cliente.negocio} cuente con esta solución es de:

<div style="text-align:center; font-size:22px;">

# **${fmt(p.total)}** (IVA incluido)

</div>

- **Anticipo para iniciar:** **${fmt(p.anticipo)}** (50%)
- **Contra entrega:** **${fmt(p.saldo)}** (50%)

*Desglose: subtotal ${fmt(p.subtotal)} + IVA (16%) ${fmt(p.iva)}.*

**Condiciones:**
- Incluye **${p.rondasRevision} rondas de revisiones** sobre el alcance acordado.
- Revisiones adicionales fuera de esas ${p.rondasRevision} rondas tendrán **costo adicional**.
- Los tiempos de entrega inician al confirmar el anticipo y recibir los materiales.

<!-- ═══════════ PÁGINA 5 · GARANTÍA Y SIGUIENTE PASO ═══════════ -->

## 5. Garantía y siguiente paso

Su proyecto queda cubierto con una **garantía de ${p.garantiaDias} días de ajustes menores** posteriores a la entrega. Su tranquilidad es parte del trato.

**Para iniciar:**

> ${p.cta}

Estamos listos para arrancar en cuanto confirme. Este proyecto está pensado para que **${p.cliente.negocio}** recupere la inversión con muy pocos clientes nuevos.

---

*${p.notaLegal}*

*Número de propuesta: ${p.numero} · Emitida el ${p.fechaEmision}*
`;
}
