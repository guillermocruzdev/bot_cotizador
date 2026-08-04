/**
 * INTELIGENCIA DE PRECIOS POR INDUSTRIA (GIROS)
 *
 * El objetivo es vender la solución ajustándola a lo que cada negocio
 * puede y suele invertir. No es lo mismo cobrarle a un mecánico que a un
 * abogado o a un dentista: cada giro tiene un presupuesto típico distinto.
 *
 * - `detectarGiro()` identifica el giro a partir de lo que dijo el cliente.
 * - `ajustarPrecio()` ajusta el estimado al presupuesto del giro y genera
 *   un rango con "gancho" (precio base alcanzable) + cuota mensual.
 * - El copy de venta (pitch, dolor, beneficios, valor) se genera aquí para
 *   que la propuesta "venda" en el lenguaje del dueño del negocio.
 *
 * IMPORTANTE: los presupuestos son estimaciones configurables. Ajústalos
 * con datos reales de tu mercado en la tabla `GIROS`.
 */

import type { ChatContext } from "@/lib/types";

export type Tier = "alto" | "medio" | "ajustado";

export interface Giro {
  id: string;
  /** Nombre legible: "Abogado / bufete" */
  nombre: string;
  /** Palabras clave para detectar el giro */
  keywords: string[];
  tier: Tier;
  /** Rango típico de inversión MXN que este giro puede manejar */
  presupuesto: [number, number];
  /** Pitch de venta: por qué este giro necesita la web (valor) */
  pitch: string;
  /** El dolor/ problema que la web le resuelve */
  dolor: string;
  /** 2-3 beneficios de negocio concretos */
  beneficios: string[];
  /** Qué pierde si no lo hace (urgencia, con honestidad) */
  costo_omision: string;
}

export const GIROS: Giro[] = [
  {
    id: "abogado",
    nombre: "Abogado / bufete legal",
    keywords: ["abogad", "bufete", "legal", "notari", "licenciado", "despacho", "juridic"],
    tier: "alto",
    presupuesto: [18000, 50000],
    pitch:
      "Para un abogado, tu sitio web es tu mejor socio de captación: genera confianza y justifica tus honorarios antes de la primera llamada.",
    dolor:
      "Cada caso que te busca en Google y no encuentra tu despacho, termina con tu competencia.",
    beneficios: [
      "Proyectar autoridad y experiencia para cobrar mejor por tus servicios",
      "Recibir solicitudes de consulta calificadas desde tu web",
      "Posicionarte como referente en tu especialidad",
    ],
    costo_omision:
      "Un solo caso nuevo perdido puede costar más que toda tu página web.",
  },
  {
    id: "medico",
    nombre: "Clínica / consultorio médico",
    keywords: ["medico", "médico", "doctor", "clinica", "clínica", "hospital", "especialista", "salud", "laboratorio", "fisioterapia", "pediatra", "ginecolog"],
    tier: "alto",
    presupuesto: [20000, 60000],
    pitch:
      "Para una clínica, la web inspira confianza y orden: tus pacientes agendan sin llamar y tú recuperas horas de trabajo.",
    dolor:
      "Los pacientes investigan en internet antes de visitarte; si no te encuentran o te ven desactualizado, dudan de ti.",
    beneficios: [
      "Citas en línea que eliminan llamadas perdidas",
      "Imagen profesional que respalda tu reputación médica",
      "Recordatorios que reducen las inasistencias",
    ],
    costo_omision:
      "Cada paciente que no confirma por falta de recordatorio es una cita vacía y dinero perdido.",
  },
  {
    id: "inmobiliaria",
    nombre: "Agencia inmobiliaria",
    keywords: ["inmobiliar", "bienes raices", "bienes raíces", "propiedades", "casas", "terrenos", "departamentos", "rentas", "remodelacion"],
    tier: "alto",
    presupuesto: [25000, 70000],
    pitch:
      "En bienes raíces la primera impresión lo es todo: un portafolio impecable cierra ventas de cientos de miles de pesos.",
    dolor:
      "Si tus propiedades se ven descuidadas en internet, los compradores serios te descartan antes de llamarte.",
    beneficios: [
      "Mostrar tus propiedades con fotos, mapas y filtros profesionales",
      "Captar leads calificados con formularios por propiedad",
      "Diferenciarte de agencias que siguen anunciando solo en redes",
    ],
    costo_omision:
      "Una sola comisión por venta puede pagar tu web decenas de veces.",
  },
  {
    id: "constructor",
    nombre: "Constructora / arquitecto",
    keywords: ["construccion", "construcción", "constructora", "obra", "arquitect", "remodelacion", "remodelación", "edificios", "maestro de obra", "albañil"],
    tier: "alto",
    presupuesto: [18000, 50000],
    pitch:
      "Para una constructora, un portafolio de obra terminada convence más que mil palabras: demuestra que entregas calidad.",
    dolor:
      "Los clientes eligen a quien ya ven resultados; sin portafolio en línea, compiten por precio, no por valor.",
    beneficios: [
      "Galería de proyectos terminados que venden por ti",
      "Solicitudes de cotización directas desde tu web",
      "Presencia profesional frente a clientes y desarrolladores",
    ],
    costo_omision:
      "Un contrato perdido por falta de portafolio supera con creces la inversión.",
  },
  {
    id: "consultor",
    nombre: "Consultor / asesor",
    keywords: ["consultor", "asesor", "coach", "mentor", "capacitacion", "capacitación", "estrategia", "cursos", "talleres", "seminario"],
    tier: "alto",
    presupuesto: [15000, 45000],
    pitch:
      "Para un consultor, tu web es tu tarjeta de presentación que trabaja 24/7: atrae, convence y agenda citas por ti.",
    dolor:
      "Tu tiempo vale mucho; si lo gastas explicando lo mismo una y otra vez, estás regalando horas facturables.",
    beneficios: [
      "Atraer clientes que ya llegan convencidos de tu método",
      "Automatizar la captación con formularios y agenda",
      "Posicionarte como autoridad en tu nicho",
    ],
    costo_omision:
      "Cada hora que pierdes explicando tu servicio es honorario que no cobras.",
  },
  {
    id: "dentista",
    nombre: "Consultorio dental",
    keywords: ["dentista", "dental", "ortodoncia", "odontolog", "clinica dental", "clínica dental", "implantes", "blanqueamiento", "endodoncia"],
    tier: "medio",
    presupuesto: [12000, 32000],
    pitch:
      "Para un consultorio dental, la web es tu recepcionista 24/7: agenda citas mientras atiendes a otros pacientes.",
    dolor:
      "Pierdes pacientes porque no pueden ver tus tratamientos ni agendar fuera de tu horario de atención.",
    beneficios: [
      "Citas en línea sin llamadas de por medio",
      "Mostrar tratamientos y precios con claridad",
      "Recordatorios automáticos que reducen ausencias",
    ],
    costo_omision:
      "Cada cita que no se agendó por falta de agenda en línea es ingreso que se va a otro consultorio.",
  },
  {
    id: "estetica",
    nombre: "Estética / salón / barbería",
    keywords: ["estetica", "estética", "salon", "salón", "peluqueria", "peluquería", "barberia", "barbería", "uñas", "spa", "belleza", "barber", "manicure", "depilacion"],
    tier: "medio",
    presupuesto: [10000, 28000],
    pitch:
      "Para una estética o barbería, tu web convierte a quien te ve en redes en un cliente con cita agendada.",
    dolor:
      "Tu agenda se llena de 'luego te escribo' que nunca regresan; sin reservas en línea, pierdes clientes que sí querían ir.",
    beneficios: [
      "Reservas en línea con horarios reales de tus estilistas",
      "Mostrar tu trabajo (antes/después) que atrae clientes",
      "Menos llamadas y más tiempo para atender",
    ],
    costo_omision:
      "Cada 'luego te escribo' que no vuelve es una silla vacía y dinero que se fue.",
  },
  {
    id: "restaurante",
    nombre: "Restaurante / negocio de comida",
    keywords: ["restaurante", "cafeteria", "cafetería", "comida", "taqueria", "taquería", "pizzeria", "pizzería", "cocina", "catering", "marisqueria", "hamburgues", "bares", "postres", "panaderia"],
    tier: "medio",
    presupuesto: [10000, 30000],
    pitch:
      "Para tu negocio de comida, la web convierte hambre en pedidos: menú, fotos que abren apetito y pedido o reserva en un clic.",
    dolor:
      "Hoy la gente decide dónde comer por internet; sin menú ni presencia clara, eligen al restaurante de al lado.",
    beneficios: [
      "Menú y fotos que venden antes de llegar",
      "Pedidos o reservas en línea sin intermediarios",
      "Posicionarte en Google cuando buscan 'comida cerca'",
    ],
    costo_omision:
      "Cada cliente que elige a la competencia por no encontrarte es una mesa vacía todos los días.",
  },
  {
    id: "gym",
    nombre: "Gimnasio / entrenador",
    keywords: ["gym", "gimnasio", "entrenador", "fitness", "crossfit", "pilates", "yoga", "nutriolog", "personal trainer", "academia", "clases"],
    tier: "medio",
    presupuesto: [10000, 28000],
    pitch:
      "Para un gimnasio o entrenador, tu web convierte a los curiosos en alumnos: planes, horarios e inscripción en línea.",
    dolor:
      "Compites contra apps y cadenas que se ven profesionales; sin presencia digital, pareces informal.",
    beneficios: [
      "Inscripciones y reservas de clase en línea",
      "Mostrar planes y resultados que motivan a inscribirse",
      "Imagen profesional frente a alumnos y marcas",
    ],
    costo_omision:
      "Cada alumno que elige otra opción por verse más profesional es membresía que no cobraste.",
  },
  {
    id: "contador",
    nombre: "Contador / despacho contable",
    keywords: ["contador", "contaduria", "contaduría", "fiscal", "impuestos", "nomina", "nómina", "contable"],
    tier: "medio",
    presupuesto: [12000, 30000],
    pitch:
      "Para un contador, tu web transmite orden y confianza: algo vital cuando te confían la situación fiscal de un negocio.",
    dolor:
      "Muchos contadores se encuentran 'de boca en boca'; una web te hace encontrarable y te posiciona frente a clientes nuevos.",
    beneficios: [
      "Captar clientes que buscan apoyo fiscal en línea",
      "Mostrar tus servicios y paquetes con claridad",
      "Formularios de contacto que llegan directo a ti",
    ],
    costo_omision:
      "Cada cliente que contrata a otro contador porque te buscó y no te encontró es honorarios que perdiste.",
  },
  {
    id: "fotografo",
    nombre: "Fotógrafo / creativo",
    keywords: ["fotografo", "fotógrafo", "fotografia", "fotografía", "diseñador", "creativo", "videografo", "estudio de foto", "editor", "ilustrador", "marca personal"],
    tier: "medio",
    presupuesto: [10000, 26000],
    pitch:
      "Para un fotógrafo o creativo, tu portafolio ES tu producto: una web impecable cobra más por cada trabajo.",
    dolor:
      "Compartir tu trabajo en redes lo devalúa; un portafolio propio te hace ver como profesional serio.",
    beneficios: [
      "Galería que se ve impresionante y carga rápido",
      "Cobrar mejor al proyectar un nivel superior",
      "Atraer clientes que te encuentran por tu estilo",
    ],
    costo_omision:
      "Cada cliente que eligió a otro por 'verse más profesional' es un trabajo que no cobraste.",
  },
  {
    id: "mecanico",
    nombre: "Taller mecánico / automotriz",
    keywords: ["mecanico", "mecánico", "taller", "afinacion", "afinación", "llantas", "hojalateria", "hojalatería", "pintura", "automotriz", "vulcanizadora", "frenos", "suspension", "diagnostico"],
    tier: "ajustado",
    presupuesto: [6000, 16000],
    pitch:
      "Para tu taller, una web sencilla con agenda de citas y cotización por WhatsApp evita que pierdas clientes que hoy no te encuentran.",
    dolor:
      "Tus clientes buscan 'mecánico cerca de mí' y tú no apareces; además pierdes llamadas mientras trabajas.",
    beneficios: [
      "Aparecer cuando te buscan en Google o Maps",
      "Cotizaciones y citas por WhatsApp con un clic",
      "Agenda de citas para no amontonar el trabajo",
    ],
    costo_omision:
      "Cada reparación que no te encuentran es dinero directo que se va a otro taller.",
  },
  {
    id: "tienda",
    nombre: "Tienda / comercio local",
    keywords: ["tienda", "comercio", "abarrotes", "ropa", "zapateria", "zapatería", "regalos", "articulos", "artículos", "papelería", "papeleria", "joyeria", "boutique", "artesania"],
    tier: "ajustado",
    presupuesto: [7000, 20000],
    pitch:
      "Para tu comercio, la web abre tu negocio las 24 horas: catálogo, ubicación y contacto para que no te pierdan.",
    dolor:
      "Si tu negocio no aparece en internet, solo te encuentran los que ya te conocen de vista.",
    beneficios: [
      "Mostrar tu catálogo y promociones en línea",
      "Aparecer en Google con tu ubicación y horario",
      "Recibir pedidos o consultas fuera de tu horario",
    ],
    costo_omision:
      "Cada cliente que no te encontró es una venta que se fue a la tienda de la esquina digital.",
  },
  {
    id: "servicios_hogar",
    nombre: "Servicios para el hogar",
    keywords: ["electricista", "fontanero", "plomero", "plomer", "jardineria", "jardinería", "limpieza", "pintor", "cerrajero", "reparaciones", "mantenimiento", "aire acondicionado", "climas"],
    tier: "ajustado",
    presupuesto: [5000, 14000],
    pitch:
      "Para tus servicios, una web con tu teléfono, tus trabajos y tus zonas de cobertura convierte búsquedas en llamadas.",
    dolor:
      "Tu trabajo llega por recomendación; sin presencia en línea, los que te buscan por urgencia no te encuentran.",
    beneficios: [
      "Aparecer cuando alguien necesita tu servicio urgente",
      "Mostrar trabajos realizados que generan confianza",
      "WhatsApp y llamadas directas sin fricción",
    ],
    costo_omision:
      "Cada trabajo urgente que te buscó y no te encontró es ingreso que se fue a otro.",
  },
];

/** Categorías → giro por defecto (si no se detecta uno específico) */
const DEFAULT_BY_CATEGORY: Record<string, Giro> = {
  landing: {
    id: "landing_default",
    nombre: "Negocio local",
    keywords: [],
    tier: "ajustado",
    presupuesto: [6000, 18000],
    pitch:
      "Para tu negocio, esta página es tu mejor carta de presentación: aparece cuando te buscan y convierte visitas en contactos.",
    dolor:
      "Hoy tus clientes deciden a quién contratar por internet; si no apareces con profesionalismo, eligen a tu competencia.",
    beneficios: [
      "Presencia profesional que genera confianza",
      "Aparecer en Google cuando te buscan",
      "Convertir visitas en llamadas y WhatsApp",
    ],
    costo_omision:
      "Cada cliente que te buscó y no te encontró terminó contratando a otro.",
  },
  ecommerce: {
    id: "ecommerce_default",
    nombre: "Negocio de ventas en línea",
    keywords: [],
    tier: "medio",
    presupuesto: [12000, 35000],
    pitch:
      "Para tu negocio, la tienda online te abre ventas las 24 horas: vende mientras duermes.",
    dolor:
      "Depender solo de redes o del local limita tus ventas; sin tienda propia pierdes margen y control.",
    beneficios: [
      "Vender en línea sin pagar comisiones abusivas",
      "Carrito y pagos que se sienten seguros",
      "Un solo lugar para tu catálogo completo",
    ],
    costo_omision:
      "Cada pedido que no pudiste recibir por no vender en línea es dinero que dejaste sobre la mesa.",
  },
  citas: {
    id: "citas_default",
    nombre: "Negocio de servicios con agenda",
    keywords: [],
    tier: "medio",
    presupuesto: [10000, 30000],
    pitch:
      "Para tu negocio, la agenda en línea elimina las llamadas perdidas y llena tus horarios.",
    dolor:
      "Cada llamada que no contestas y cada cita que no se confirma es un ingreso que se pierde.",
    beneficios: [
      "Agendar citas en línea a cualquier hora",
      "Confirmaciones automáticas que reducen ausencias",
      "Un panel claro con tu agenda del día",
    ],
    costo_omision:
      "Cada cita vacía por falta de recordatorio es ingreso que se fue.",
  },
  webapp: {
    id: "webapp_default",
    nombre: "Empresa con procesos internos",
    keywords: [],
    tier: "alto",
    presupuesto: [20000, 60000],
    pitch:
      "Para tu empresa, un sistema a la medida organiza tu operación y te ahorra horas de trabajo cada semana.",
    dolor:
      "Hacer todo en Excel y WhatsApp te cuesta tiempo, errores y dinero que no ves.",
    beneficios: [
      "Automatizar tareas que hoy te quitan horas",
      "Información y reportes en un solo lugar",
      "Un proceso más ordenado y profesional",
    ],
    costo_omision:
      "Cada hora que tu equipo pierde en procesos manuales es costo que se acumula.",
  },
  blog: {
    id: "blog_default",
    nombre: "Creador de contenido",
    keywords: [],
    tier: "ajustado",
    presupuesto: [6000, 16000],
    pitch:
      "Para tu contenido, un blog propio es tu casa en internet: tus artículos te posicionan y te hacen autoridad.",
    dolor:
      "Depender de redes te deja a merced de algoritmos; un blog es tu audiencia que sí te pertenece.",
    beneficios: [
      "Posicionar tus artículos en Google",
      "Captar suscriptores que son tuyos",
      "Convertir lectores en clientes",
    ],
    costo_omision:
      "Cada mes sin presencia propia es audiencia que se queda con la competencia.",
  },
  portafolio: {
    id: "portafolio_default",
    nombre: "Profesional independiente",
    keywords: [],
    tier: "medio",
    presupuesto: [8000, 22000],
    pitch:
      "Para tu carrera, un portafolio profesional te hace ver al nivel de los mejores y cobrar por ello.",
    dolor:
      "Tu trabajo habla por ti, pero solo si se ve bien; sin portafolio, compites por precio.",
    beneficios: [
      "Mostrar tu mejor trabajo de forma impactante",
      "Atraer clientes que te encuentran por tu estilo",
      "Cobrar mejor por tu propuesta de valor",
    ],
    costo_omision:
      "Cada cliente que no te tomó en serio por tu imagen es un proyecto que no conseguiste.",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Detecta el giro del negocio a partir de la descripción (y categoría) */
export function detectarGiro(descripcion: string | null, category: string): Giro {
  const t = normalize(descripcion ?? "");
  let best: Giro | null = null;
  let bestScore = 0;

  for (const g of GIROS) {
    let score = 0;
    for (const kw of g.keywords) {
      if (t.includes(normalize(kw))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = g;
    }
  }

  if (best && bestScore >= 1) return best;
  return DEFAULT_BY_CATEGORY[category] ?? DEFAULT_BY_CATEGORY.landing;
}

export interface PrecioAjustado {
  precio_min: number;
  precio_max: number;
  /** Cuota mensual "desde $X al mes" (plazo de 24 meses) para reencuadrar el precio */
  cuota_mensual: number;
  /** true si se recortó el alcance para caber en el presupuesto del giro */
  alcance_ajustado: boolean;
  /** Mensaje honesto cuando se ajustó el alcance */
  mensaje_alcance: string | null;
}

/**
 * Ajusta el estimado (min/max) al presupuesto típico del giro, dejando un
 * rango con "gancho": la base se siente alcanzable y el tope muestra el valor.
 */
export function ajustarPrecio(estMin: number, estMax: number, giro: Giro): PrecioAjustado {
  const [gMin, gMax] = giro.presupuesto;
  let min = estMin;
  let max = estMax;
  let alcanceAjustado = false;
  let mensaje: string | null = null;

  // El estimado excede lo que el giro suele invertir → recortamos alcance.
  if (estMin > gMax) {
    max = gMax;
    min = Math.max(Math.round(gMax * 0.82), 2500);
    alcanceAjustado = true;
    mensaje =
      "Ajusté el alcance a un presupuesto cómodo para tu tipo de negocio, sin sacrificar lo esencial. Más adelante siempre se puede ampliar.";
  }
  // El estimado cabe en el presupuesto → dejamos un gancho abajo y el valor arriba.
  else if (estMax <= gMax) {
    min = Math.round(estMin * 0.92);
    max = Math.max(Math.round(estMax), Math.round(estMin * 1.05));
    if (max > gMax) max = gMax;
  }
  // El giro puede pagar más → subimos el techo de valor sin perder el gancho.
  else {
    min = Math.round(estMin * 0.92);
    max = Math.min(gMax, Math.round(estMax * 1.12));
  }

  // Seguridad
  min = Math.max(min, 2000);
  max = Math.max(max, min);
  if (max < min) max = min;

  const cuota = Math.max(Math.round(min / 24), 150);

  return {
    precio_min: min,
    precio_max: max,
    cuota_mensual: cuota,
    alcance_ajustado: alcanceAjustado,
    mensaje_alcance: mensaje,
  };
}

/** Párrafo de valor: por qué esta web es una inversión para ESTE giro.
 *  Si se pasa `totalExacto`, el párrafo cita ese número exacto (el mismo
 *  que muestra la UI) en vez de un rango, para no contradecir el precio. */
export function generarValorNegocio(
  giroNombre: string,
  pitch: string,
  min: number,
  max: number,
  totalExacto?: number
): string {
  const inversion =
    totalExacto != null
      ? `una inversión de $${Math.round(totalExacto).toLocaleString("es-MX")} MXN`
      : `una inversión de $${min.toLocaleString("es-MX")}–$${max.toLocaleString("es-MX")} MXN`;
  return (
    `Para tu ${giroNombre.toLowerCase()}, esta página no es un gasto: es una herramienta que trabaja para ti todos los días. ` +
    `${pitch} ` +
    `Con ${inversion}, ` +
    `te pones a la altura de los mejores de tu sector y recuperas lo invertido con pocos clientes nuevos.`
  );
}

// ─── Copy adaptado a lo que el cliente REALMENTE pidió ─────────────

/**
 * Palabras que, si el cliente las declinó (ctx[x] === false), hacen que
 * una frase de copy quede obsoleta (prometer "citas en línea" cuando el
 * cliente dijo que no las quiere, por ejemplo).
 */
type FeatureKey = "citas" | "pagos" | "dashboard" | "autenticacion" | "chat";
const FEATURE_KEYWORDS: Record<FeatureKey, string[]> = {
  citas: [
    "cita", "citas", "agenda", "agendar", "reserva", "reservas", "reservar",
    "recordatorio", "recordatorios", "inasistenci", "turno", "horario", "horarios",
  ],
  pagos: [
    "pago", "pagos", "cobrar", "pedido", "pedidos", "carrito", "venta en línea",
    "venta en linea", "vender en línea", "vender en linea", "comprar",
  ],
  dashboard: ["panel", "reporte", "reportes", "dashboard"],
  autenticacion: ["registro", "cuenta", "cuentas", "login", "usuario", "usuarios"],
  chat: ["chat", "mensajería", "mensajeria"],
};

/** Copy neutral de presentación (presencia + Google + WhatsApp). */
const COPY_LANDING_NEUTRAL = {
  pitch:
    "tu web es tu mejor carta de presentación: aparece cuando te buscan y convierte visitas en contactos por WhatsApp.",
  dolor:
    "Hoy tus clientes deciden a quién contratar por internet; si no apareces con profesionalismo, eligen a tu competencia.",
  beneficios: [
    "Presencia profesional que genera confianza",
    "Aparecer en Google cuando te buscan",
    "Convertir visitas en llamadas y WhatsApp",
  ],
  costo_omision:
    "Cada cliente que te buscó y no te encontró terminó contratando a otro.",
};

export interface GiroCopyAdaptado {
  pitch: string;
  dolor: string;
  beneficios: string[];
  costo_omision: string;
}

/**
 * Adapta el copy del giro a las respuestas reales del cliente.
 *
 * Si el cliente declinó citas, pagos, panel, cuentas o chat, el copy ya no
 * promete esas funciones: se filtra a la versión neutral de presentación
 * (presencia + Google + WhatsApp) para no contradecir la conversación.
 */
export function adaptarCopyGiro(
  giro: Giro,
  ctx: Pick<ChatContext, "citas" | "pagos" | "dashboard" | "autenticacion" | "chat">
): GiroCopyAdaptado {
  const mencionaDeclinado = (texto: string): boolean => {
    const t = normalize(texto);
    return (Object.keys(FEATURE_KEYWORDS) as FeatureKey[]).some(
      (feat) => {
        if (ctx[feat] !== false) return false;
        return FEATURE_KEYWORDS[feat].some((kw) => t.includes(normalize(kw)));
      }
    );
  };

  const beneficios = giro.beneficios.filter((b) => !mencionaDeclinado(b));

  const necesitaNeutral =
    mencionaDeclinado(giro.pitch) ||
    mencionaDeclinado(giro.dolor) ||
    mencionaDeclinado(giro.costo_omision) ||
    beneficios.length < 2;

  if (necesitaNeutral) {
    // Conserva los beneficios propios del giro que NO contradicen al cliente,
    // y completa con los neutrales (sin duplicados, máx. 3).
    const combinados = [...beneficios, ...COPY_LANDING_NEUTRAL.beneficios];
    const unicos = combinados.filter(
      (b, i) => combinados.findIndex((x) => normalize(x) === normalize(b)) === i
    );
    return {
      pitch: COPY_LANDING_NEUTRAL.pitch,
      dolor: COPY_LANDING_NEUTRAL.dolor,
      beneficios: unicos.slice(0, 3),
      costo_omision: COPY_LANDING_NEUTRAL.costo_omision,
    };
  }

  return {
    pitch: giro.pitch,
    dolor: giro.dolor,
    beneficios,
    costo_omision: giro.costo_omision,
  };
}

// ─── Filtro de contenido por funciones declinadas ───────────────────

/** Palabras clave por función: si el cliente la DECLINÓ, se retira cualquier
 *  ítem que la prometa de funcionalidades/entregables/recomendaciones/stack,
 *  para no contradecir lo que el cliente dijo en la conversación. */
const DECLINED_FILTERS: Array<{
  campo: keyof Pick<
    ChatContext,
    | "mapas" | "baseDeDatos" | "dashboard" | "autenticacion"
    | "pagos" | "citas" | "documentos" | "pwa" | "chat"
  >;
  keywords: string[];
}> = [
  {
    campo: "mapas",
    keywords: [
      "mapa", "google maps", "google my business", "my business", "en el mapa",
      "lleguen sin perderse", "cómo llegar", "como llegar", "mapa para",
      "mapa con tu", "te ubiquen en el mapa",
    ],
  },
  {
    campo: "baseDeDatos",
    keywords: [
      "base de datos", "supabase", "postgres", "guardar datos",
      "guardar información", "almacenar", "guardar pedidos", "guardar citas",
    ],
  },
  {
    campo: "dashboard",
    keywords: [
      "panel", "dashboard", "panel de control", "administrar pedidos",
      "administrar citas", "ver todos los mensajes", "todos los mensajes",
      "ver pedidos", "ver citas", "panel para",
    ],
  },
  {
    campo: "autenticacion",
    keywords: [
      "crear cuenta", "cuenta de", "cuentas de", "registrarse", "login",
      "iniciar sesión", "área de clientes", "usuario con", "usuarios con",
      "historial",
    ],
  },
  {
    campo: "pagos",
    keywords: [
      "pago con", "pagar en", "pagos en", "pago en", "tarjeta", "stripe",
      "paypal", "pasarela", "cobrar", "cobro", "cobros", "checkout",
    ],
  },
  {
    campo: "citas",
    keywords: [
      "cita", "citas", "agenda", "agendar", "reservar", "reserva",
      "calendario", "turno", "horario en línea",
    ],
  },
  {
    campo: "documentos",
    keywords: [
      "pdf", "cotización", "cotizaciones", "recibos", "reportes", "factura",
      "facturas",
    ],
  },
  {
    campo: "pwa",
    keywords: [
      "instalable", "como app", "pwa", "instalar en el celular",
      "se sienta como una app",
    ],
  },
  {
    campo: "chat",
    keywords: ["mensajería interna", "chat interno", "mensajes internos"],
  },
];

/**
 * Retira de la propuesta (funcionalidades, entregables, recomendaciones y
 * stack) cualquier ítem que prometa una función que el cliente DECLINÓ.
 * Ej: si dijo "no quiero mapa", se quita "Alta en Google Maps / My Business".
 */
export function filtrarPorDeclinados<T extends {
  funcionalidades?: string[];
  entregables?: string[];
  recomendaciones?: string[];
  stack_tecnico?: string[];
}>(analysis: T, ctx: ChatContext): T {
  const prohibido: string[] = [];
  for (const f of DECLINED_FILTERS) {
    if (ctx[f.campo] === false) prohibido.push(...f.keywords);
  }
  if (prohibido.length === 0) return analysis;
  const clean = (arr: string[] | undefined): string[] | undefined =>
    arr
      ? arr.filter((s) => !prohibido.some((kw) => normalize(s).includes(kw)))
      : arr;
  return {
    ...analysis,
    funcionalidades: clean(analysis.funcionalidades),
    entregables: clean(analysis.entregables),
    recomendaciones: clean(analysis.recomendaciones),
    stack_tecnico: clean(analysis.stack_tecnico),
  };
}

/** Explicación del precio con contexto de industria */
export function generarExplicacionPrecio(
  giro: Giro,
  min: number,
  max: number,
  alcanceAjustado: boolean
): string {
  const [gMin, gMax] = giro.presupuesto;
  const base = `Lo calculé pensando en tu tipo de negocio: un ${giro.nombre.toLowerCase()} normalmente invierte entre $${gMin.toLocaleString("es-MX")} y $${gMax.toLocaleString("es-MX")} MXN en algo así, y te dejé en un rango cómodo de $${min.toLocaleString("es-MX")}–$${max.toLocaleString("es-MX")} MXN.`;
  const extra = alcanceAjustado
    ? " Para que te sientas tranquilo, ajusté el alcance a ese rango sin tocar lo esencial: nada de inflar el precio para que 'quepa' en tu presupuesto."
    : " El rango incluye todo lo que acordamos, con margen para detalles reales que siempre aparecen en el camino.";
  return base + extra;
}
