/**
 * ANALÍTICA DEL CHAT (UX/CxD) — lado cliente
 *
 * Recolecta datos REALES de la conversación para medir el funnel:
 *   - session_start / node / user_message / no_se / skip / conversion
 *   - duración, número de preguntas, nodo donde abandonó
 *
 * Diseño:
 *  - sessionId y estado de la sesión viven en sessionStorage para SOBREVIVIR
 *    al full reload de /results (sessionStorage persiste en la misma pestaña).
 *  - Los eventos se acumulan en una cola y se envían con sendBeacon (o fetch
 *    keepalive) — fire-and-forget, nunca bloquean la UX ni el análisis.
 *  - Todo acceso a sessionStorage/navigator está guardado (SSR-safe).
 */

const SESSION_KEY = "bot_cotizador:session_id";
const SESSION_STATE_KEY = "bot_cotizador:session_state";
const QUEUE_KEY = "bot_cotizador:analytics_queue";
const FLUSH_THRESHOLD = 5;

export interface AnalyticsEvent {
  event: string;
  nodeId?: string;
  ts: number;
  payload?: Record<string, unknown>;
}

export interface AnalyticsSession {
  sessionId: string;
  startedAt: number;
  lastNodeId: string | null;
  nodeCount: number;
  questionCount: number;
  noSeCount: number;
  completed: boolean;
  category: string | null;
  nivel: string | null;
  precio: number | null;
  fallback: boolean | null;
  referrer: string;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

function removeKey(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function getSessionId(): string {
  const existing = readJson<{ id: string }>(SESSION_KEY);
  if (existing?.id) return existing.id;
  const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  writeJson(SESSION_KEY, { id });
  return id;
}

function queue(): AnalyticsEvent[] {
  return readJson<AnalyticsEvent[]>(QUEUE_KEY) ?? [];
}

export function getSessionState(): AnalyticsSession | null {
  return readJson<AnalyticsSession>(SESSION_STATE_KEY);
}

function saveSessionState(s: AnalyticsSession): void {
  writeJson(SESSION_STATE_KEY, s);
}

/**
 * Crea o reutiliza la sesión analítica. Se reutiliza si la sesión sigue viva
 * (no completada) — p. ej. tras un reload del /chat; si ya se completó la
 * propuesta, empieza una sesión nueva (una conversación = una sesión).
 */
export function startAnalyticsSession(): AnalyticsSession {
  const existing = getSessionState();
  if (existing && !existing.completed) return existing;
  const s: AnalyticsSession = {
    sessionId: getSessionId(),
    startedAt: Date.now(),
    lastNodeId: null,
    nodeCount: 0,
    questionCount: 0,
    noSeCount: 0,
    completed: false,
    category: null,
    nivel: null,
    precio: null,
    fallback: null,
    referrer: typeof document !== "undefined" ? document.referrer : "",
  };
  saveSessionState(s);
  track("session_start");
  return s;
}

/** Registra un nodo visitado (pregunta del bot). Devuelve el estado actualizado. */
export function trackNode(
  s: AnalyticsSession,
  nodeId: string,
  isQuestion: boolean
): AnalyticsSession {
  const next: AnalyticsSession = {
    ...s,
    lastNodeId: nodeId,
    nodeCount: s.nodeCount + 1,
    questionCount: s.questionCount + (isQuestion ? 1 : 0),
  };
  saveSessionState(next);
  track("node", nodeId);
  return next;
}

/** Registra la respuesta del cliente (longitud y si fue "no sé"). */
export function trackUserMessage(nodeId: string, text: string): void {
  const noSe = /no s[ée]|ni idea|no estoy segur[oa]|no me acuerdo/i.test(text);
  const s = getSessionState();
  if (s && noSe) saveSessionState({ ...s, noSeCount: s.noSeCount + 1 });
  track("user_message", nodeId, { length: text.length, noSe });
}

/** Registra un nodo saltado por inferencia (se sabía la respuesta). */
export function trackSkip(nodeId: string, field: string): void {
  track("skip", nodeId, { field });
}

/** Marca la sesión como completada (propuesta generada) y la envía. */
export function completeSession(patch: Partial<AnalyticsSession>): void {
  const s = getSessionState() ?? startAnalyticsSession();
  const next: AnalyticsSession = {
    ...s,
    ...patch,
    completed: true,
  };
  saveSessionState(next);
  track("conversion", next.lastNodeId ?? undefined, {
    categoria: next.category,
    nivel: next.nivel,
    precio: next.precio,
    fallback: next.fallback,
  });
  void flushAnalytics();
}

/** Cierre de sesión (abandono / salida de la pestaña): envía lo pendiente. */
export function endSession(): void {
  const s = getSessionState();
  if (s) saveSessionState({ ...s });
  void flushAnalytics();
}

/** Reinicia la analítica (nueva conversación con el botón "Nueva conversación"). */
export function resetAnalytics(): void {
  removeKey(SESSION_STATE_KEY);
  removeKey(QUEUE_KEY);
}

function track(event: string, nodeId?: string, payload?: Record<string, unknown>): void {
  const q = queue();
  q.push({ event, nodeId, ts: Date.now(), payload });
  writeJson(QUEUE_KEY, q);
  if (q.length >= FLUSH_THRESHOLD) void flushAnalytics();
}

/** Envía la cola a /api/analytics (sendBeacon, no bloquea la navegación). */
export async function flushAnalytics(): Promise<void> {
  const events = queue();
  if (!events.length) return;
  writeJson(QUEUE_KEY, []);
  const session = getSessionState();
  const body = JSON.stringify({ sessionId: getSessionId(), events, session });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        "/api/analytics",
        new Blob([body], { type: "application/json" })
      );
      return;
    }
  } catch {
    /* cae al fetch */
  }
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* noop: fire-and-forget */
  }
}
