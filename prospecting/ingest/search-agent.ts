/**
 * AGENTE DE DESCUBRIMIENTO DE LEADS (LangChain + DeepSeek).
 *
 * - Orquestación LangChain: `createToolCallingAgent` + `AgentExecutor`.
 * - Modelo: DeepSeek vía ChatOpenAI (API OpenAI-compatible) — env `DEEPSEEK_API_KEY`.
 * - Herramientas:
 *     · search_local_businesses → SerpAPI (Google Maps).
 *     · check_website            → hasWebsite().
 * - Salida: JSON estricto `[{name, phone, address, category, has_website: false}]`.
 *
 * Fallbacks (alineados al patrón del repo):
 *  - Sin LLM configurado o error del agente → pipeline determinista
 *    (search → hasWebsite → filtrar) con la MISMA forma de salida.
 *  - Cache 24 h (Supabase + memoria) antes de llamar al LLM.
 */

import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import { hasWebsite } from "./has-website";
import { searchLocalBusinesses, type LocalBusinessCandidate } from "./search-local";
import { cacheKey, getCachedSearch, setCachedSearch } from "./search-cache";
import { getLlmProvider } from "../../lib/llm-client";

export interface DiscoveryInput {
  business_type: string;
  location: string;
  max_results: number;
}

export interface LeadCandidate {
  name: string;
  phone: string | null;
  address: string | null;
  category: string | null;
  website: string | null;
  has_website: false;
}

export type DiscoverySource = "agent" | "deterministic" | "cache";

export interface DiscoveryResult {
  leads: LeadCandidate[];
  source: DiscoverySource;
  cached: boolean;
}

const LeadCandidateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().nullish().catch(null),
  address: z.string().nullish().catch(null),
  category: z.string().nullish().catch(null),
  website: z.string().nullish().catch(null),
  has_website: z.boolean().optional(),
});

type ParsedLead = z.infer<typeof LeadCandidateSchema>;

const AGENT_SYSTEM_PROMPT = `You are a market researcher specializing in local business discovery.
Find local businesses WITHOUT an official website.

Workflow:
1. Use search_local_businesses to find candidates for the requested business type and location.
2. For every candidate that has a website URL, use check_website to confirm it is live (not parked / under construction).
3. Keep ONLY businesses with NO live website.

Return a STRICT JSON array and nothing else. No markdown, no code fences, no prose.
Schema of each item (do not include the schema itself in your answer):
[{{"name": string, "phone": string | null, "address": string | null, "category": string | null, "has_website": false}}]`;

async function runAgent(input: DiscoveryInput): Promise<LeadCandidate[]> {
  const llm = buildModel();
  const tools = [searchTool, websiteTool];
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", AGENT_SYSTEM_PROMPT],
    ["human", "Find {business_type} in {location}. Return up to {max_results} results."],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const agent = createToolCallingAgent({ llm, tools, prompt });
  const executor = AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    maxIterations: 3,
    returnIntermediateSteps: false,
  });

  const result = await executor.invoke({
    business_type: input.business_type,
    location: input.location,
    max_results: input.max_results,
  });

  return parseAgentOutput(String(result.output ?? ""), input.max_results);
}

function parseAgentOutput(output: string, maxResults: number): LeadCandidate[] {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("El agente no devolvió un arreglo JSON válido");
  }
  const parsed: unknown = JSON.parse(output.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error("El JSON devuelto no es un arreglo");
  }

  return parsed
    .map((item) => LeadCandidateSchema.safeParse(item))
    .filter(
      (r): r is z.SafeParseSuccess<ParsedLead> =>
        r.success && r.data.has_website !== true
    )
    .map((r) => ({
      name: r.data.name,
      phone: r.data.phone ?? null,
      address: r.data.address ?? null,
      category: r.data.category ?? null,
      website: r.data.website ?? null,
      has_website: false as const,
    }))
    .slice(0, maxResults);
}

/** Pipeline determinista (sin LLM): search → hasWebsite → filtrar. */
async function runDeterministic(input: DiscoveryInput): Promise<LeadCandidate[]> {
  const candidates = await searchLocalBusinesses(input);
  const liveFlags = await mapLimit(candidates, 5, (c) =>
    c.website ? hasWebsite(c.website) : Promise.resolve(false)
  );

  return candidates
    .map((c, i) => ({ c, live: liveFlags[i] }))
    .filter(({ live }) => !live)
    .slice(0, input.max_results)
    .map(({ c }) => toLeadCandidate(c));
}

function toLeadCandidate(c: LocalBusinessCandidate): LeadCandidate {
  return {
    name: c.name,
    phone: c.phone ?? null,
    address: c.address ?? null,
    category: c.category ?? null,
    website: c.website ?? null,
    has_website: false as const,
  };
}

export interface DiscoveryOptions {
  /** true → usar el agente LLM (LangChain). default: pipeline determinista (0 tokens). */
  use_agent?: boolean;
}

/**
 * Punto de entrada principal. Revisa cache → (opcional) agente LLM si
 * use_agent=true y hay key → pipeline determinista (ruta por defecto).
 *
 * TOKEN SAVER: por defecto NO se llama al LLM; la búsqueda es SerpAPI +
 * hasWebsite (determinista). El agente solo si lo pides explícitamente.
 */
export async function runDiscovery(
  input: DiscoveryInput,
  opts: DiscoveryOptions = {}
): Promise<DiscoveryResult> {
  const key = cacheKey(input.business_type, input.location, String(input.max_results));

  const cached = await getCachedSearch<LeadCandidate[]>(key);
  if (cached) {
    return { leads: cached.slice(0, input.max_results), source: "cache", cached: true };
  }

  let leads: LeadCandidate[];
  let source: DiscoverySource;
  if (opts.use_agent === true && getLlmProvider() === "deepseek") {
    try {
      leads = await runAgent(input);
      source = "agent";
    } catch (err) {
      console.warn(
        `[search-agent] agente LLM falló → pipeline determinista: ${(err as Error).message}`
      );
      if (process.env.DEBUG_PROSPECTING) console.warn((err as Error).stack);
      leads = await runDeterministic(input);
      source = "deterministic";
    }
  } else {
    leads = await runDeterministic(input);
    source = "deterministic";
  }

  await setCachedSearch(key, leads);
  return { leads, source, cached: false };
}

function buildModel(): ChatOpenAI {
  return new ChatOpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY ?? "missing",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    },
    temperature: 0.2,
    maxTokens: 1024,
  });
}

const searchTool = tool(
  async ({ business_type, location, max_results }) => {
    try {
      const candidates = await searchLocalBusinesses({
        business_type,
        location,
        max_results,
      });
      return JSON.stringify(candidates);
    } catch (err) {
      return JSON.stringify({ error: (err as Error).message });
    }
  },
  {
    name: "search_local_businesses",
    description:
      "Search Google Maps for local businesses of a given type in a location. Returns a JSON array with name, phone, address, category and optional website for each candidate.",
    schema: z.object({
      business_type: z.string().describe("Type of business, e.g. restaurant, dentist"),
      location: z
        .string()
        .describe("City and country, e.g. Monterrey, Mexico"),
      max_results: z
        .number()
        .int()
        .min(1)
        .max(10)
        .describe("Maximum results to return (1-10)"),
    }),
  }
);

const websiteTool = tool(
  async ({ url }) => {
    const exists = await hasWebsite(url);
    return JSON.stringify({ url, has_website: exists });
  },
  {
    name: "check_website",
    description:
      "Check whether a website URL exists and is live (not parked / under construction). Returns JSON with a has_website boolean.",
    schema: z.object({
      url: z.string().describe("Full URL to verify, e.g. https://example.com"),
    }),
  }
);

/** Ejecuta `fn` sobre `items` con límite de concurrencia. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }
  );
  await Promise.all(workers);
  return results;
}
