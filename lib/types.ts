/**
 * Tipos centrales de la aplicación de cotización.
 * Definidos aquí para evitar dependencias circulares entre
 * el flujo conversacional, el catálogo de precios y los componentes.
 */

// ─── Roles del chat ────────────────────────────────────────────────

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  /** true cuando el mensaje viene del engine con retraso "humano" */
  isStreamed?: boolean;
}

// ─── Contexto de conversación ──────────────────────────────────────

/**
 * El contexto acumula todo lo que el bot sabe del cliente.
 * Cada clave se llena de forma incremental conforme avanza la charla.
 */
export interface ChatContext {
  /** Nombre del cliente (o negocio) */
  clientName: string | null;
  /** Email del cliente */
  clientEmail: string | null;
  /** WhatsApp / teléfono */
  clientPhone: string | null;
  /** Categoría inferida: 'ecommerce' | 'landing' | 'citas' | 'webapp' | ... */
  category: string | null;
  /** Nivel inferido: 'basico' | 'profesional' | 'avanzado' */
  nivel: string | null;
  /** Estimación de páginas / secciones */
  paginas: number | null;
  /** ¿Los usuarios crean cuentas? */
  autenticacion: boolean | null;
  /** ¿Se guardan datos (DB)? */
  baseDeDatos: boolean | null;
  /** ¿Pasarela de pagos? */
  pagos: boolean | null;
  /** ¿Panel de administración / dashboard? */
  dashboard: boolean | null;
  /** ¿Mapas / sucursales? */
  mapas: boolean | null;
  /** ¿Generación de PDFs / documentos? */
  documentos: boolean | null;
  /** ¿Chat / mensajería? */
  chat: boolean | null;
  /** ¿Citas / reservas? */
  citas: boolean | null;
  /** ¿Animaciones / modo oscuro / moderno? */
  animaciones: boolean | null;
  /** ¿SEO? */
  seo: boolean | null;
  /** ¿PWA instalable? */
  pwa: boolean | null;
  /** ¿El cliente tiene el contenido listo? */
  contenidoListo: boolean | null;
  /** Servicios / oferta que el cliente quiere mostrar en la web (texto libre) */
  servicios: string | null;
  /** Estructura/secciones acordada para la web (texto libre del cliente) */
  estructuraWeb: string | null;
  /** Rango de presupuesto (texto libre, p.ej. "$10k - $20k") */
  presupuesto: string | null;
  /** Fecha límite / fecha de entrega */
  fechaEntrega: string | null;
  /** ¿Mantenimiento mensual? */
  mantenimiento: boolean | null;
  /** Referencia de estilo: página o app que le gusta */
  referencia: string | null;
  /** Comentarios extra del cliente */
  comentarios: string | null;
  /** Descripción inicial del negocio (fuente para inferencia) */
  negocioDescripcion: string | null;
  /** Transcript completo (útil para la API de análisis) */
  transcript: string;
  /** Contador de veces que dijo "no sé" (para no abusar de ejemplos) */
  noSeContador: number;
  /** Intentos fallidos pidiendo el teléfono (máx 2 antes de continuar) */
  phoneIntentos: number;
  /** Intentos fallidos pidiendo el email (máx 2 antes de continuar) */
  emailIntentos: number;
}

export function createEmptyContext(): ChatContext {
  return {
    clientName: null,
    clientEmail: null,
    clientPhone: null,
    category: null,
    nivel: null,
    paginas: null,
    autenticacion: null,
    baseDeDatos: null,
    pagos: null,
    dashboard: null,
    mapas: null,
    documentos: null,
    chat: null,
    citas: null,
    animaciones: null,
    seo: null,
    pwa: null,
    contenidoListo: null,
    servicios: null,
    estructuraWeb: null,
    presupuesto: null,
    fechaEntrega: null,
    mantenimiento: null,
    referencia: null,
    comentarios: null,
    negocioDescripcion: null,
    transcript: "",
    noSeContador: 0,
    phoneIntentos: 0,
    emailIntentos: 0,
  };
}

// ─── Flujo conversacional ──────────────────────────────────────────

export type ExpectedResponseType =
  | "text"
  | "choice"
  | "boolean"
  | "number"
  | "url";

export type NodeType =
  | "greeting"
  | "discovery"
  | "clarification"
  | "technical"
  | "budget"
  | "closing";

export interface ChoiceOption {
  label: string;
  value: string;
  /** Mensaje de seguimiento opcional que el bot agrega tras elegir */
  followUp?: string;
}

export interface ConversationNode {
  id: string;
  type: NodeType;
  /**
   * Genera el mensaje que el bot muestra. Recibe el contexto actual,
   * por lo que puede personalizar la pregunta (p.ej. "Perfecto, [nombre]...").
   */
  generateMessage: (context: ChatContext) => string;
  expectedResponseType: ExpectedResponseType;
  choices?: ChoiceOption[];
  /** Devuelve el id del siguiente nodo según la respuesta */
  nextNode: (response: string, context: ChatContext) => string;
  /** Side effects: guardar datos en el contexto, etc. */
  onReceive?: (response: string, context: ChatContext) => void;
  /** Solo se muestra si la condición se cumple */
  condition?: (context: ChatContext) => boolean;
}

// ─── Resultado de análisis ─────────────────────────────────────────

export interface AnalysisResult {
  /** Nombre del cliente para la propuesta */
  clientName: string;
  /** Categoría legible, p.ej. "Sistema de Citas para Consultorio Dental" */
  categoria: string;
  /** "Básico" | "Profesional" | "Avanzado" */
  nivel: string;
  precio_min: number;
  precio_max: number;
  /** p.ej. "4-7 días de desarrollo" */
  tiempo_estimado: string;
  /** Stack técnico legible, p.ej. ["Next.js", "Tailwind CSS"] */
  stack_tecnico: string[];
  /** Funcionalidades en lenguaje humano */
  funcionalidades: string[];
  /** Explicación del precio en 2-3 líneas */
  explicacion_precio: string;
  recomendaciones: string[];
  entregables: string[];
  /** Prompt técnico detallado para Roo Code (se genera en background) */
  prompt_tecnico: string;
  /** Metadatos extra para debugging */
  meta?: {
    modelo: string;
    generado_en: string;
  };

  // ── Campos comerciales (venta de valor por industria) ──
  /** Giro del negocio detectado, p.ej. "Consultorio dental" */
  giro?: string;
  /** Pitch de venta: por qué este negocio necesita la web */
  punto_venta?: string;
  /** El problema/dolor que la web resuelve al cliente */
  dolor?: string;
  /** Beneficios de negocio concretos (lenguaje de dueño) */
  beneficios?: string[];
  /** Párrafo de valor: por qué es una inversión, no un gasto */
  valor_negocio?: string;
  /** "desde $X al mes" (plazo de 24 meses) para reencuadrar el precio */
  cuota_mensual?: number;
  /** true si se ajustó el alcance para caber en el presupuesto del giro */
  alcance_ajustado?: boolean;
  /** Mensaje honesto cuando se ajustó el alcance */
  mensaje_alcance?: string | null;
  /** Costo de omisión: qué pierde el cliente si no lo hace */
  costo_omision?: string;
}

// ─── Resultado crudo de la API ─────────────────────────────────────

export interface AnalyzeRequest {
  messages: ChatMessage[];
  context: ChatContext;
  botName: string;
}

export interface AnalyzeResponse {
  ok: boolean;
  result?: AnalysisResult;
  error?: string;
  /** Cuando la API falla, se usa el catálogo local como respaldo */
  fallback?: boolean;
}

export interface SaveRequest {
  clientName: string;
  clientEmail: string;
  context: ChatContext;
  result: AnalysisResult;
  transcript: string;
}

export interface SaveResponse {
  ok: boolean;
  id?: string;
  error?: string;
}
