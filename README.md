# 🤖 Bot Cotizador — Chatbot de cotización web

> 🚀 **En producción:** https://botcotizador.vercel.app — conectado a GitHub (`main`): cada push se despliega automáticamente en Vercel.

Aplicación full-stack (Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui + Supabase) que entrevista a clientes potenciales de forma **conversacional** (no como formulario), analiza sus respuestas con **DeepSeek vía OpenRouter** y genera una propuesta personalizada con precio estimado en MXN, alcance, tecnología y un **prompt técnico listo para Roo Code**.

---

## ✨ Funcionalidades

- 🗣️ **Bot "Alex" con personalidad**: saluda, reacciona a lo que dice el cliente, usa frases de transición variadas y emojis con moderación.
- 🧠 **Flujo conversacional en árbol**: si el cliente dice "no sé", el bot da ejemplos y pide clarificación en vez de avanzar mecánicamente. Recuerda lo dicho hace 2-3 mensajes.
- 💬 **Chat estilo WhatsApp**: burbujas, typing indicator animado, scroll suave, 100% responsive.
- 🧾 **Pantalla de resultados tipo propuesta que vende**: explica el problema que resuelve, el valor para el negocio, beneficios concretos y costo de omisión; reencuadra el precio ("desde $X al mes") y cierra con CTAs (PDF, WhatsApp, ajustar alcance).
- 💰 **Precios ajustados por industria**: detecta el giro (dentista, mecánico, abogado, restaurante, clínica...) y ajusta el rango a lo que ese giro normalmente invierte (datos configurables en `lib/industry-pricing.ts`). Precio con "gancho" alcanzable + cuota mensual + explicación honesta si se ajusta el alcance.
- 🤖 **Pack de prompts para Roo Code + DeepSeek (mobile-first, por fases)**: se genera en segundo plano y se descarga como `.txt`. En lugar de un solo documento enorme, es un **pack de 5 prompts secuenciales** (fundación + tokens, shell + componentes UI, secciones de contenido, lógica/API/integraciones, y QA + despliegue en Vercel). Cada fase se pega en un **chat nuevo** con su propio contexto compacto para **ahorrar tokens**, y todas construyen la web **primero para celular (360px)** y luego la escalan a tablet/escritorio. Al final (CHAT 5) la página queda probada en todos los tamaños y desplegada al 100%.
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
- **Precios por industria (giros, presupuestos, copy de venta)**: `lib/industry-pricing.ts` ← ajusta aquí los rangos de inversión por giro con tus datos reales de mercado
- **Pack de prompts (brief para Roo Code, mobile-first por fases)**: `lib/prompt-builder.ts` — previsualízalo con `npm run prompt:preview`
- **Colores**: variables CSS en `app/globals.css`
- **Modelo de IA**: `DEFAULT_MODEL` en `lib/openrouter.ts`

> El precio final = estimado técnico (catálogo) **ajustado al presupuesto típico del giro**, con un mínimo "gancho" alcanzable, cuota mensual (÷24) y copy de venta de valor. Si el estimado excede lo que el giro suele invertir, se reduce el alcance y se comunica con honestidad.

> El `prompt_tecnico` (pack de 5 chats mobile-first) se genera **siempre** de forma determinista en `lib/prompt-builder.ts` (calidad garantizada), tomando el alcance refinado por DeepSeek cuando la API está configurada, o el catálogo local como respaldo.
