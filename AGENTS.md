---
description: >-
  Mapa compacto del repo Bot Cotizador "Alex" (Next.js 14 + DeepSeek).
  Léelo ANTES de explorar: describe arquitectura, módulos, comandos y trampas
  para responder sin gastar tokens escaneando archivos.
version: 1.1.0
alwaysApply: true
---

# AGENTS.md — Contexto del repositorio para Roo Code + DeepSeek

> **LEE ESTE ARCHIVO ANTES DE EXPLORAR EL REPOSITORIO.** Roo Code lo carga
> automáticamente en cada conversación. Es el mapa del proyecto: úsalo para
> responder sin escanear archivo por archivo (ahorra tokens). Solo abre un
> archivo concreto cuando necesites su lógica exacta.

## ⚡ Cómo usar este archivo (reglas de ahorro de tokens)

1. Empieza SIEMPRE aquí. **No** hagas `list_dir`/`find` recursivos "para explorar": lo esencial ya está abajo.
2. Para saber qué tocar, ve a **§11 Tareas → dónde tocar** y abre SOLO ese archivo.
3. Para responder de arquitectura/precios/flujo, usa este archivo (no abras los módulos).
4. Antes de afirmar que algo "existe/compila", checa **§0 Estado de la rama** — en `prospecting-wip` hay piezas rotas o ausentes.
5. Si un archivo citado no aparece en disco, NO lo inventes: confírmalo y avísalo.

---

## 0. Estado actual de la rama (IMPORTANTE)

- **Rama actual:** `prospecting-wip` (commit `b6b0c9d`). En producción (Vercel) corre `main` = cotizador core, sin prospección.
- **✅ Cotizador "Alex" (`app/`, `components/`, `lib/` del cotizador):** completo y validado (regresión 227+ asserts). Es lo que corre en prod.
- **⚠️ Prospección (`prospecting/`):** parcial. En esta rama:
  - **Compila y existe:** `ingest/` (búsqueda determinista + agente LangChain), `outreach/message-chain.ts`, `whatsapp/` (bot, anti-ban, state-manager, queue-service), `scheduler/`, `worker-entry.ts`, `discovery-queue.ts`, `redis.ts`, `store/` (`dashboard-repo.ts`, `leads-repo.ts`), `demo-leads.ts`, `config.ts` (solo `getAntiBanConfig`).
  - **ROTO (no compila):** `prospecting/closing/negotiation-agent.ts` — importa `getClosingConfig`/`getLlmDailyTokenBudget` (ausentes de `config.ts`) y `../store/llm-usage-repo` (no existe). No tocarlo salvo que pidan arreglarlo.
  - **NO existen aún** (no los busques en disco): migraciones `0004`/`0005`, ruta `/api/quote-complete`, `lib/alex-chat-chain.ts`, `lib/intent-llm.ts`, `prospecting/whatsapp/monitor.ts`, `prospecting/closing/{closing-queue,closing-pdf,link-sender,mockup-generator}.ts`.

---

## 1. Qué es este proyecto

**Bot Cotizador "Alex"** — Aplicación full-stack (Next.js 14 App Router + TypeScript estricto + Tailwind + shadcn/ui) que:

1. **Entrevista de forma conversacional** (NO formulario) a clientes potenciales de webs/landings para generar una **cotización**.
2. **Analiza las respuestas con DeepSeek** y genera una **propuesta personalizada** (precio MXN, alcance, stack, giro, asistentes IA) + un **prompt técnico descargable para Roo Code** (pack de 5 chats por fases, mobile-first).
3. Genera **PDF de propuesta comercial** (jsPDF) y **PDF de cotización**.
4. Tiene un **sistema de prospección parcial** (rama `prospecting-wip`): busca leads, les escribe por WhatsApp (Baileys) y los gestiona en un dashboard; el cierre/entrega (PDF/mockup/negociación) aún está incompleto o roto (ver §0).

- **En producción:** https://botcotizador.vercel.app (Vercel, GitHub `main` auto-deploy).
- **LLM:** DeepSeek (nativo `DEEPSEEK_API_KEY` o vía OpenRouter `OPENROUTER_API_KEY`). Sin keys → fallback determinista local (la app funciona igual).
- **Stack:** Next 14 · TS strict · Tailwind 3 · shadcn/ui · Zustand · Framer Motion · Supabase · LangChain · Baileys (WhatsApp) · BullMQ (Redis) · jsPDF · Zod.

---

## 2. Comandos útiles

| Comando                                      | Qué hace                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                | Dev server (localhost:3000).                                                                                  |
| `npm run build`                              | Build de producción. ⚠️ NO correr mientras `dev` está activo (corrompe `.next` → `rm -rf .next` y reiniciar). |
| `npm run lint`                               | ESLint (Next).                                                                                                |
| `npm run test:regression`                    | Regresión del motor del bot (227+ asserts, tsx).                                                              |
| `npm run test:prospecting`                   | Agente de descubrimiento de leads.                                                                            |
| `npm run test:message`                       | Generador de mensajes WhatsApp.                                                                               |
| `npm run test:bot`                           | Bot WhatsApp (Baileys, 32 asserts).                                                                           |
| `npm run prompt:preview`                     | Previsualiza el pack de 5 prompts técnicos para Roo.                                                          |
| `npm run proposal:preview` / `quote:preview` | Previsualiza PDF propuesta / cotización.                                                                      |

---

## 3. Mapa de carpetas (visión general)

```
app/
  page.tsx, layout.tsx          → Landing + root layout
  chat/page.tsx                 → El chatbot "Alex" (flujo conversacional)
  results/page.tsx              → Pantalla de resultados/propuesta (lee sessionStorage)
  demo/page.tsx                 → Demo pública de prospección en vivo (SSE)
  login/page.tsx                → Login del dashboard de prospección
  (prospecting)/dashboard|campaigns|conversations|leads  → Dashboard (route group auth)
  api/                          → Rutas serverless (ver §6)
components/
  chat/                         → UI del chat (ChatContainer, ChatInput, ConversationEngine, etc.)
  results/                      → UI de la propuesta (ProposalView, PriceCard, ValueSelling, etc.)
  dashboard/                    → UI del dashboard de prospección (LeadTable, CampaignBuilder, ChatView, StatsCards...)
  ui/                           → primitivas shadcn/ui
lib/                            → LÓGICA NUCLEO (ver §5) — el 90% de la lógica vive aquí
prospecting/                    → Sistema de prospección WhatsApp (ver §7)
scripts/                        → Tests y previews (tsx) — entran en tsconfig, deben ser type-safe
supabase/
  schema.sql                    → Esquema del cotizador (tabla leads)
  migrations/0001..0003*.sql    → Migraciones del sistema de prospección
docs/                           → Documentación (MERCADO_VIBECODER.md)
types/index.ts                  → Tipos compartidos
```

- Alias de imports: `@/*` → raíz del proyecto (tsconfig paths).
- Tipos de dominio: `lib/types.ts` + `types/index.ts` + `components/dashboard/types.ts`.

---

## 4. Arquitectura del flujo del bot (importante)

```
cliente → Chat (Zustand store: lib/chat-store.ts)
   │
   ├─ 1) Máquina de estados DETERMINISTA decide el nodo (lib/conversation-flow.ts, árbol)
   │     - Cada turno: node.nextNode(userText, ctx) → siguiente nodo o clarificación
   │     - Nodos con `condition` se SALTAN si el contexto ya lo resolvió (ej. pagos=false)
   │     - El ESTADO nunca se pierde: la máquina manda, el LLM solo pinta texto
   │
   ├─ 2) LLM redacta el mensaje del turno (lib/chat-llm.ts → /api/chat → DeepSeek)
   │     - TURN_GOALS por nodo, contexto compacto, tono "consultor senior"
   │     - Fallback determinista si no hay key / timeout 9s / circuit breaker
   │
   └─ 3) Al terminar → /api/analyze (DeepSeek) → enrichCommercial() (ajusta precio/copy)
         → resultado en sessionStorage (clave "bot_cotizador:result") → /results
         → /results renderiza propuesta + PDFs + prompt.txt descargable
```

**Regla de oro:** el LLM **nunca** decide el flujo; solo genera texto. La máquina de estados (`conversation-flow.ts` + `chat-store.ts`) garantiza robustez.

---

## 5. Módulos clave en `lib/` (uno-línea)

| Módulo                                                  | Rol                                                                                                                                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversation-flow.ts`                                  | Árbol de nodos del chat + `extractSignals`/`extractSections`/`extractBudgetAmount`/`extractDeadline`/`captureEarlyData` (parseo de intención, presupuesto, plazo, estructura web). |
| `chat-store.ts`                                         | Store Zustand + `sendUserMessage` (motor del turno), skip condicional, retry /api/analyze, persistencia sessionStorage.                                                            |
| `personality.ts`                                        | Personalidad "consultor senior" + `classifyIntent`/`hasSignal`/`extractName`/`extractEmail`/`normalizePhone`.                                                                      |
| `chat-llm.ts`                                           | LLM de redacción de turnos (DeepSeek vía `lib/llm-client.ts`), circuit breaker, fallback determinista.                                                                             |
| `llm-client.ts`                                         | Cliente LLM unificado: OpenRouter o DeepSeek directo (`chatCompletion`, retry backoff).                                                                                            |
| `openrouter.ts`                                         | Análisis del cliente (`/api/analyze`): `enrichCommercial()` (clamp precio por giro, copy adaptado, `filtrarPorDeclinados`, `normalizarArraysResultado`).                           |
| `pricing-catalog.ts`                                    | Catálogo de tipos de web + `inferCategory` (keyword-aware) + `buildFallbackProposal` (fallback determinista).                                                                      |
| `industry-pricing.ts`                                   | GIROS (abogado/médico… = alto; tienda/mecánico = ajustado), `detectarGiro`, `ajustarPrecio`, `adaptarCopyGiro`, `generarValorNegocio`, `filtrarPorDeclinados`.                     |
| `quote-engine.ts`                                       | Motor de cotización DETERMINISTA (Fase 1): tipos web + precios, IVA 16%, `calcularTotalDeterminista` (compartido server/UI).                                                       |
| `prompt-builder.ts`                                     | Genera el **pack de 5 prompts para Roo Code + DeepSeek** (mobile-first, por fases, acabado premium).                                                                               |
| `commercial-proposal.ts` + `commercial-proposal-pdf.ts` | Propuesta comercial formal (Directora de Ventas) + PDF jsPDF.                                                                                                                      |
| `generate-proposal.ts` + `proposal-pdf.ts`              | Cotización PDF (6 páginas, formato estricto).                                                                                                                                      |
| `bots-catalog.ts`                                       | 12 bots IA vendibles (add-on) con precios, `detectarBotsRecomendados`, `extraerBotsDeRespuesta`.                                                                                   |
| `agency-catalog.ts`                                     | ~20 tipos de web para la agencia.                                                                                                                                                  |
| `supabase.ts` / `prospecting-auth.ts`                   | Cliente Supabase (server) / auth del dashboard (cookie HMAC).                                                                                                                      |

---

## 6. Rutas API (`app/api/`)

- `chat` → redacta el mensaje del turno con DeepSeek (`llm:true`).
- `analyze` → analiza la conversación completa → propuesta JSON (`fallback:true/false`).
- `save` → persiste lead/propuesta en Supabase (tabla `leads`).
- `login` / `logout` → auth dashboard (ADMIN_PASSWORD + AUTH_SECRET).
- `search` → encola discovery de leads (BullMQ, 503 si no hay REDIS_URL).
- `campaign` → crea campaña + mensajes WhatsApp (memoizados por categoría).
- `stats` / `leads` / `leads/[id]` / `webhook` → dashboard + webhook WhatsApp.
- `demo` → SSE de la demo en vivo (EventSource), búsqueda + mensajes simulados.

---

## 7. Sistema de prospección (`prospecting/`)

Pipeline de ventas **parcial** (rama `prospecting-wip`). Solo las etapas 1-3 están operativas; las 4-6 incompletas o rotas (ver §0).

```
1. Prospección  ingest/search-agent.ts (agente LangChain + SerpAPI + hasWebsite) o ruta determinista (search-local, 0 tokens)
2. Ventas       outreach/message-chain.ts (mensajes WhatsApp personalizados, memoizados por categoría)
3. Diagnóstico  = el bot Alex (/chat) — el lead cotiza
4-6.           Cierre/entrega/resumen → PENDIENTE o ROTO (solo negotiation-agent.ts, sin compilar)
```

Módulos (los que existen en disco):

- `worker-entry.ts` → bootstrap de 2 colas: `whatsapp-outbound` + `discovery` (BullMQ si hay `REDIS_URL`; si no, memoria/noop).
- `whatsapp/` → `whatsapp-bot.ts` (Baileys v6, QR), `state-manager.ts` (estados `pending→sent→responded→interested→meeting→client` + `no_response`/`blacklist`), `anti-ban.ts` (daily_limit, horario, delay aleatorio), `queue-service.ts` (cola outbound). ⚠️ NO existe `monitor.ts`.
- `ingest/` → `search-agent.ts` (agente LangChain), `search-local.ts` (SerpAPI + `has-website.ts` determinista), `search-cache.ts` (cache 24h).
- `scheduler/` → node-cron: drena pendientes en horario hábil, marca stale (`no_response`).
- `closing/` → SOLO `negotiation-agent.ts` (híbrido máquina+LLM, escalera de tácticas) — **roto, no compila** (imports ausentes, ver §0).
- `store/` → `dashboard-repo.ts` (leads/campañas/mensajes con fallback en memoria) + `leads-repo.ts` (batch insert, upsert).
- `config.ts` → `getAntiBanConfig()` (horario/delay; solo lee `PROSPECT_TZ` del env).
- `discovery-queue.ts` / `redis.ts` / `demo-leads.ts` → cola discovery, conexión Redis, leads ficticios para la demo.

---

## 8. Datos / Supabase

- **Cotizador:** tabla `leads` (schema.sql).
- **Prospección:** migraciones existentes `supabase/migrations/0001..0003*.sql`:
  - `0001` → `prospect_leads` + `search_cache` (RLS cerrada).
  - `0002` → estados WhatsApp (`sent/responded/interested/…/client` + `no_response`/`blacklist`) + `wa_send_log`.
  - `0003` → `campaigns` + `campaign_leads` + `conversation_messages`.
  - ⚠️ `0004`/`0005` (client_quotes/negotiation_events, estados de cierre) NO existen en este checkout.
- Sin Supabase/Redis configurados → todo cae a fallbacks en memoria/deterministas (la app funciona en dev sin infra).

---

## 9. Variables de entorno (`.env.local`)

- **LLM:** `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` (deepseek-chat) · `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` · `NEXT_PUBLIC_LLM_CHAT=1` (0 = solo determinista). Override opcional `DEEPSEEK_BASE_URL`.
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
- **Marca/contacto (placeholders en prod):** `NEXT_PUBLIC_BOT_NAME`, `NEXT_PUBLIC_AGENCY_NAME`, `NEXT_PUBLIC_DEVELOPER_NAME`, `NEXT_PUBLIC_DEVELOPER_WHATSAPP`, `NEXT_PUBLIC_DEVELOPER_EMAIL`.
- **Prospección (verificadas en código):** `REDIS_URL` (vacío → colas en memoria), `SERPAPI_API_KEY` / `SERPAPI_ENDPOINT`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `WEBHOOK_SECRET`, `PROSPECT_TZ`, `BAILEYS_SESSION_DIR`, `WA_SENDER_NAME`, `DEBUG_PROSPECTING`.
- ⚠️ No usar vars de módulos que NO existen en este checkout: `OWNER_WHATSAPP`, `MOCKUP_PROVIDER`, `NEXT_PUBLIC_BOT_URL`, `PROSPECT_DAILY_LIMIT`, etc.

---

## 10. Patrones y trampas críticas (lecciones aprendidas)

1. **NO correr `npm run build` con `npm run dev` activo** en el mismo workspace → corrompe `.next` (errores "Cannot find module ./682.js"). Fijar: `rm -rf .next` y reiniciar dev.
2. **Nunca leer `sessionStorage`/`localStorage` durante el render SSR** (errores React #418/#423). Hidratar SOLO en `useEffect` + estado `ready` con spinner.
3. **Todo nodo con `condition`** en conversation-flow debe devolver su `next` ante respuesta vacía (`if (!response?.trim()) return next`), porque el skip del engine llama `nextNode("", ctx)` y `classifyIntent("")` → "no sé" → caería en clarificación.
4. **`classifyIntent`:** las palabras ambiguas ("eso/ya/bueno/claro/justo/dale/ok") NO cuentan como "sí" si hay negación fuerte (no/nunca/nada/ni/tampoco). "Sí, pero no quiero X" sigue siendo ambigua.
5. **`extractSignals` consciente de negación** (`isNegated`): "no necesito reservar mesas" NO activa citas. **Siempre usar flag `"g"` en `new RegExp`** con `exec()` o hay loop infinito.
6. **`inferCategory` / keywords con palabra completa** (regex con límites), no subcadena ("WhatsApp" contiene "app" → webapp falso).
7. **Precio coherente:** UI, PDF, copy y prompt deben citar el MISMO total. Usar `calcularTotalDeterminista()` + `resolverCategoria()` + `cuota_mensual = quoteTotal/24`. `filtrarPorDeclinados` quita de la propuesta lo que el cliente rechazó.
8. **import() dinámico de libs opcionales con VARIABLE**, nunca literal: `const lib="@sparticuz/chromium"; await import(lib)` — si la lib no está instalada y es literal, `next build` falla.
9. **DeepSeek vía SDK OpenAI:** el baseURL no debe incluir `/chat/completions` (el SDK lo añade); `AgentExecutor`/chains usan SSE (mockear con `data: {...}\n\n` + `data: [DONE]`); escapar llaves `{{ }}` en ChatPromptTemplate; no usar `.default()` en zod de un `tool()`.
10. **Modelos/chain se construyen bajo demanda** (memoizados) porque `process.env.*` se lee en tiempo de llamada (los const de módulo se resuelven al importar).
11. **`next build` exige type-safe total** porque `scripts/` entra en el tsconfig → los tests DEBEN compilar (onReceive opcional, `Array.from(Map.entries)`).
12. **jsPDF:** `doc.setTextColor` NO acepta tuplas → usar spread `...PRIMARIO`.
13. **ESLint de Next aplica react-hooks a TODO archivo** → renombrar imports `use*` de libs no-React (alias) en vez de deshabilitar reglas.
14. **Cookie `Secure` condicional a HTTPS**; `isAuthenticated(req)` → `decodeURIComponent` del token (el header raw no decodifica).
15. **En Vercel serverless**, rutas de bot/LLM: `export const runtime = "nodejs"` + `export const maxDuration = 60` (DeepSeek excede el timeout de 10s).
16. **Estado final del closer es `"client"` (inglés)** — el typo "cliente" rompe `canTransition`.

---

## 11. Tareas comunes → dónde tocar

| Tarea                               | Archivo(s)                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Cambiar preguntas/flujo del bot     | `lib/conversation-flow.ts` (+ `lib/chat-llm.ts` TURN_GOALS si toca texto LLM)              |
| Cambiar personalidad/tono           | `lib/personality.ts`                                                                       |
| Cambiar precios/tipos de web        | `lib/pricing-catalog.ts`, `lib/quote-engine.ts`, `lib/industry-pricing.ts` (GIROS)         |
| Cambiar el pack de prompts para Roo | `lib/prompt-builder.ts`                                                                    |
| Cambiar la propuesta/PDF            | `lib/commercial-proposal.ts`, `lib/commercial-proposal-pdf.ts`, `lib/generate-proposal.ts` |
| Cambiar UI del chat                 | `components/chat/`                                                                         |
| Cambiar UI de resultados            | `components/results/`                                                                      |
| Prospección/mensajes WhatsApp       | `prospecting/` (ver §7)                                                                    |
| Dashboard                           | `app/(prospecting)/` + `components/dashboard/`                                             |
| Schema/BD                           | `supabase/schema.sql`, `supabase/migrations/`                                              |
