/**
 * FASE 1 · MOTOR DE COTIZACIÓN DETERMINISTA
 *
 * Convierte los datos del cliente en una cotización exacta, sin rangos y
 * sin decimales. Reglas de precio transparentes (configurables):
 *
 *   Base Landing ............ $8,500 MXN
 *   Base Corporativo ........ $15,000 MXN
 *   Sistema de agenda/citas . +$5,600 MXN   (se suma a la base)
 *   Dominio + Hosting (1 año) +$2,500 MXN
 *   Branding básico ......... +$3,500 MXN
 *   IVA ...................... 16% sobre el subtotal
 *
 * Totales redondeados a pesos mexicanos sin decimales.
 */

// ─── Tipos de web ──────────────────────────────────────────────────

export type TipoWeb = "landing" | "corporativo" | "agenda";

export const TIPO_WEB_INFO: Record<
  TipoWeb,
  { label: string; descripcion: string }
> = {
  landing: {
    label: "Landing page",
    descripcion: "Página de 1 a 3 secciones enfocada en presentar el negocio y captar contactos.",
  },
  corporativo: {
    label: "Sitio corporativo",
    descripcion: "Sitio de 4 a 6 páginas: Inicio, Nosotros, Servicios, Galería y Contacto.",
  },
  agenda: {
    label: "Web con agenda / citas",
    descripcion: "Sitio con sistema de calendario donde el cliente agenda día y hora en línea.",
  },
};

export type PresupuestoRango = "<10k" | "10-25k" | ">25k";

// ─── Precios base (configurables) ─────────────────────────────────

export const PRECIOS = {
  base: { landing: 8500, corporativo: 15000 } as const,
  agendaExtra: 5600,
  dominioHosting: 2500,
  branding: 3500,
  iva: 0.16,
} as const;

// ─── Datos del cliente (validados) ────────────────────────────────

export interface ClientData {
  /** Nombre completo del cliente o nombre del negocio */
  nombre: string;
  /** Giro del negocio (ej: "consultorio dental") */
  giro: string;
  /** Teléfono / WhatsApp — regex: ^\+?\d{10,12}$ */
  telefono: string | null;
  /** Ubicación física (ciudad / zona) */
  ubicacion: string | null;
  /** Tipo de web requerida */
  tipoWeb: TipoWeb;
  /** ¿Necesita dominio + hosting (1 año)? */
  dominioHosting: boolean;
  /** ¿Necesita branding (logo / colores)? */
  branding: boolean;
  /** Rango de presupuesto aproximado */
  presupuesto: PresupuestoRango | null;
}

export const TELEFONO_REGEX = /^\+?\d{10,12}$/;

/**
 * Construye y valida el ClientData a partir de la entrada en bruto.
 * - Coercea el teléfono: si no cumple el regex, lo deja en null (no rompe).
 * - `strict` lanza error si un campo obligatorio falta.
 */
export function buildClientData(raw: Partial<ClientData>, opts?: { strict?: boolean }): ClientData {
  const nombre = (raw.nombre ?? "").trim();
  const giro = (raw.giro ?? "").trim();

  if (opts?.strict && (!nombre || !giro)) {
    throw new Error("Faltan datos obligatorios del cliente (nombre y giro).");
  }

  let telefono: string | null = (raw.telefono ?? "").trim() || null;
  if (telefono && !TELEFONO_REGEX.test(telefono)) telefono = null;

  const tipoWeb: TipoWeb =
    raw.tipoWeb === "corporativo" || raw.tipoWeb === "agenda" ? raw.tipoWeb : "landing";

  return {
    nombre: nombre || "El negocio del cliente",
    giro: giro || "negocio local",
    telefono,
    ubicacion: (raw.ubicacion ?? "").trim() || null,
    tipoWeb,
    dominioHosting: raw.dominioHosting !== false,
    branding: raw.branding === true,
    presupuesto: raw.presupuesto ?? null,
  };
}

// ─── Cotización ───────────────────────────────────────────────────

export interface QuoteLine {
  nombre: string;
  descripcion: string;
  precio: number;
}

export interface Quote {
  lineItems: QuoteLine[];
  subtotal: number;
  iva: number;
  total: number;
  anticipo: number;
  saldo: number;
  diasEntrega: number;
}

/** Calcula la cotización exacta a partir del ClientData. */
export function calculateQuote(cd: ClientData): Quote {
  const lineItems: QuoteLine[] = [];

  // Base según tipo de web
  const base =
    cd.tipoWeb === "corporativo" || cd.tipoWeb === "agenda"
      ? PRECIOS.base.corporativo
      : PRECIOS.base.landing;
  lineItems.push({
    nombre: TIPO_WEB_INFO[cd.tipoWeb].label,
    descripcion: TIPO_WEB_INFO[cd.tipoWeb].descripcion,
    precio: base,
  });

  // Agenda / citas
  if (cd.tipoWeb === "agenda") {
    lineItems.push({
      nombre: "Sistema de agenda / citas",
      descripcion: "Calendario en línea donde el cliente elige día y hora, con confirmación.",
      precio: PRECIOS.agendaExtra,
    });
  }

  // Dominio + hosting
  if (cd.dominioHosting) {
    lineItems.push({
      nombre: "Dominio y hosting (1 año)",
      descripcion: "Tu dominio propio (.mx / .com) y hosting profesional por un año.",
      precio: PRECIOS.dominioHosting,
    });
  }

  // Branding
  if (cd.branding) {
    lineItems.push({
      nombre: "Branding básico",
      descripcion: "Propuesta de logo simple y paleta de colores para tu marca.",
      precio: PRECIOS.branding,
    });
  }

  // Cálculo con IVA y redondeo a pesos enteros
  const subtotal = lineItems.reduce((acc, l) => acc + l.precio, 0);
  const iva = Math.round(subtotal * PRECIOS.iva);
  const total = subtotal + iva;
  const anticipo = Math.round(total / 2);
  const saldo = total - anticipo;

  // Días de entrega según tipo de web
  const diasEntrega =
    cd.tipoWeb === "agenda" ? 23 : cd.tipoWeb === "corporativo" ? 14 : 7;

  return { lineItems, subtotal, iva, total, anticipo, saldo, diasEntrega };
}

// ─── Formato numérico consistente ─────────────────────────────────

/** "5600" → "5,600" (sin decimales) */
export function formatNum(n: number): string {
  return Math.round(n).toLocaleString("es-MX");
}

/** "5600" → "$5,600 MXN" — SIEMPRE con espacio entre número y moneda */
export function formatPesos(n: number): string {
  return `$${formatNum(n)} MXN`;
}

/**
 * "2026-08-02" → "02 de agosto de 2026" (formato DD de Mes de AAAA).
 * Nunca "02de agosto": se fuerza el espacio.
 */
export function formatFecha(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Fecha de vigencia = fecha de emisión + 7 días naturales */
export function fechaVigencia(emision: Date): Date {
  const v = new Date(emision);
  v.setDate(v.getDate() + 7);
  return v;
}

// ─── Número de propuesta ──────────────────────────────────────────

/** Genera "PC-2026-123" */
export function generarNumeroPropuesta(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const secuencia = 100 + Math.floor(Math.random() * 900);
  return `PC-${anio}-${secuencia}`;
}

// ─── Ubicación ────────────────────────────────────────────────────

/** Detecta la ciudad/estado dentro de una descripción (best-effort). */
export function detectarCiudad(descripcion: string | null): string | null {
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
