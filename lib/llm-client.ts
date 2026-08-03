/**
 * CLIENTE LLM UNIFICADO
 *
 * Soporta dos proveedores para DeepSeek:
 * 1. OpenRouter   → OPENROUTER_API_KEY (modelo deepseek/* en https://openrouter.ai)
 * 2. DeepSeek nativo → DEEPSEEK_API_KEY (https://platform.deepseek.com — API directa)
 *
 * Prioridad: OpenRouter si está configurado; si no, DeepSeek directo.
 * Si ninguno tiene API key, `chatCompletion` devuelve null y los llamadores
 * usan su respaldo local/determinista.
 */

export type LlmProvider = "openrouter" | "deepseek";

export function getLlmProvider(): LlmProvider | null {
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  return null;
}

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

/** Modelo según proveedor (configurable por env). */
export function getModel(provider: LlmProvider): string {
  if (provider === "deepseek") {
    return process.env.DEEPSEEK_MODEL || "deepseek-chat";
  }
  return process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free";
}

function getApiKey(provider: LlmProvider): string | null {
  return provider === "openrouter"
    ? process.env.OPENROUTER_API_KEY || null
    : process.env.DEEPSEEK_API_KEY || null;
}

export interface ChatCompletionOptions {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  max_tokens?: number;
  /** true → pedir JSON estructurado (response_format json_object) */
  json?: boolean;
}

export interface ChatCompletionResult {
  content: string | null;
  model: string;
  provider: LlmProvider;
}

/**
 * Llama al proveedor LLM activo y devuelve el contenido de la respuesta.
 * Devuelve null si no hay proveedor/key configurados (el llamador decide el respaldo).
 */
export async function chatCompletion(
  opts: ChatCompletionOptions
): Promise<ChatCompletionResult | null> {
  const provider = getLlmProvider();
  if (!provider) return null;

  const apiKey = getApiKey(provider);
  if (!apiKey) return null;

  const model = getModel(provider);
  const url = provider === "deepseek" ? DEEPSEEK_URL : OPENROUTER_URL;

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    // DeepSeek nativo exige temperature <= 1.0 (los llamadores usan <=0.9)
    temperature: Math.min(opts.temperature ?? 0.7, 1.0),
  };
  if (opts.max_tokens) body.max_tokens = opts.max_tokens;
  if (opts.json) body.response_format = { type: "json_object" };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://bot-cotizador.vercel.app";
    headers["X-Title"] = "Bot Cotizador";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM ${provider} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return {
    content: data.choices?.[0]?.message?.content ?? null,
    model,
    provider,
  };
}
