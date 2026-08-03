# 🤖 Bot Cotizador — Chatbot de cotización web

> 🚀 **En producción:** https://botcotizador.vercel.app — conectado a GitHub (`main`): cada push se despliega automáticamente en Vercel.

Aplicación full-stack (Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui + Supabase) que entrevista a clientes potenciales de forma **conversacional** (no como formulario), analiza sus respuestas con **DeepSeek vía OpenRouter** y genera una propuesta personalizada con precio estimado en MXN, alcance, tecnología y un **prompt técnico listo para Roo Code**.

---

## ✨ Funcionalidades

- 🗣️ **Bot "Alex" con personalidad**: saluda, reacciona a lo que dice el cliente, usa frases de transición variadas y emojis con moderación.
- 🧠 **Flujo conversacional en árbol**: si el cliente dice "no sé", el bot da ejemplos y pide clarificación en vez de avanzar mecánicamente. Recuerda lo dicho hace 2-3 mensajes.
- 💬 **Chat estilo WhatsApp**: burbujas, typing indicator animado, scroll suave, 100% responsive.
- 🧾 **Pantalla de resultados tipo propuesta**: precio grande en MXN, "¿Qué incluye?", "¿Por qué este precio?", tags de tecnología, entregables y CTAs (PDF, WhatsApp, ajustar alcance).
- 🤖 **Prompt técnico para Roo Code**: se genera en segundo plano y se descarga como `.txt`. Es un **brief técnico de nivel senior** (17 secciones: resumen ejecutivo, ficha del proyecto, alcance, requisitos funcionales/no funcionales, stack, arquitectura, modelo de datos SQL, flujo de usuario, integraciones, diseño, despliegue en Vercel, Definition of Done y criterios de aceptación) pensado para que Roo Code + DeepSeek entreguen trabajo profesional listo para producción.
- 🗄️ **Supabase**: guarda leads y propuestas.
- 🔁 **Fallback local**: si no hay `OPENROUTER_API_KEY` o la IA falla, la propuesta se genera con un motor local de precios (útil para desarrollo).

---

## 🚀 Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Configura al menos:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor)
- `OPENROUTER_API_KEY` (https://openrouter.ai/keys) — opcional, sin ella se usan precios locales
- `NEXT_PUBLIC_DEVELOPER_WHATSAPP` (formato `+52...`), `NEXT_PUBLIC_DEVELOPER_EMAIL`, `NEXT_PUBLIC_DEVELOPER_NAME`

### 3. Base de datos

Ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor de Supabase.

### 4. Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000 → **Iniciar cotización**.

### 5. Producción

```bash
npm run build
npm run start
```

---

## ☁️ Deploy en Vercel

1. Sube el repo a GitHub.
2. En [vercel.com](https://vercel.com) → **New Project** → importa el repo.
3. Framework: **Next.js** (se detecta solo).
4. Añade las variables de entorno del `.env.example`.
5. **Deploy**. ✅

---

## 🧠 Cómo funciona la IA

El flujo conversacional es **local y determinista** (rápido, sin costo). Solo al final se llama a la API:

`POST /api/analyze` → arma un prompt con la conversación completa + el catálogo de precios → DeepSeek (vía OpenRouter) genera un JSON con `categoria`, `precio_min/max`, `funcionalidades` en lenguaje humano, `explicacion_precio`, `stack_tecnico` y `prompt_tecnico`.

Si algo falla, el servidor responde con una propuesta local (`lib/pricing-catalog.ts` → `buildFallbackProposal`) para que el flujo nunca se rompa.

---

## 📁 Estructura

```
app/
  page.tsx                    # Landing con CTA
  chat/page.tsx               # Chat principal
  results/page.tsx            # Pantalla de propuesta
  api/analyze/route.ts        # DeepSeek vía OpenRouter
  api/save/route.ts           # Guarda en Supabase
components/
  chat/                       # ChatContainer, ChatMessage, ChatInput, TypingIndicator, ConversationEngine, MessageAnimator, RichText, BotAvatar
  results/                    # ProposalView, PriceCard, FeatureList, TechStackTags, WhyThisPrice, PromptDownloader, ContactCTA
  ui/                         # shadcn/ui (button, card, input, badge, avatar, separator)
lib/
  personality.ts              # Personalidad, frases, emojis, detección de intención
  conversation-flow.ts        # Árbol de decisión conversacional
  pricing-catalog.ts          # Catálogo de precios MXN + fallback local
  prompt-builder.ts           # Generador del brief técnico profesional para Roo Code
  openrouter.ts               # Cliente OpenRouter (DeepSeek)
  supabase.ts                 # Clientes Supabase
  chat-store.ts               # Store Zustand del chat
  proposal-pdf.ts             # Genera la propuesta en PDF (jsPDF)
  types.ts                    # Tipos centrales
scripts/sample-prompt.ts      # Previsualiza el prompt técnico (npm run prompt:preview)
supabase/schema.sql           # Esquema de base de datos
```

---

## 🔧 Personalización rápida

- **Nombre / personalidad del bot**: `lib/personality.ts`
- **Preguntas y flujo**: `lib/conversation-flow.ts`
- **Precios y categorías**: `lib/pricing-catalog.ts`
- **Prompt técnico (brief para Roo Code)**: `lib/prompt-builder.ts` — previsualízalo con `npm run prompt:preview`
- **Colores**: variables CSS en `app/globals.css`
- **Modelo de IA**: `DEFAULT_MODEL` en `lib/openrouter.ts`

> El `prompt_tecnico` se genera **siempre** de forma determinista en `lib/prompt-builder.ts` (calidad garantizada), tomando el alcance refinado por DeepSeek cuando la API está configurada, o el catálogo local como respaldo.
