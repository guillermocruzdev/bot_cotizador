# Prompt para Roo Code + DeepSeek — Implementar mejoras P1/P2 del Bot Cotizador "Alex"

> Pega TODO este bloque en un CHAT NUEVO de Roo Code (modo Code, con DeepSeek) dentro del workspace `bot_cotizador`, y ejecuta los comandos desde la raíz. Este prompt solo implementa las 2 mejoras ya diagnosticadas; NO pide probar un cliente ficticio.

---

Actúa como consultor senior de desarrollo web y QA riguroso del proyecto **bot_cotizador** (el bot "Alex"). Tu tarea: implementar 2 mejoras ya diagnosticadas (P1 y P2), sin tocar nada más y respetando la arquitectura existente.

## 0) Contexto de arquitectura (NO reinventar)

- **Arquitectura HÍBRIDA (NO romper)**: DeepSeek redacta el TEXTO de cada turno (`lib/chat-llm.ts` + `app/api/chat/route.ts`); el ESTADO lo decide la máquina determinista (`lib/conversation-flow.ts` + `lib/chat-store.ts`). El LLM solo pinta el mensaje; si falla o tarda usa `fallbackReply`.
- **Regla de oro del precio (NO romper)**: precio exacto = `quoteTotal` (motor `calculateQuote` en `lib/quote-engine.ts`); cuota "Desde $X/mes" = `total/24`; copy y PDF citan el MISMO total. Nunca mezclar `precio_min` (clamp por giro) con `quoteTotal`.
- **Mapa de archivos** (léelos antes de tocar): `lib/conversation-flow.ts` → grafo (aquí vive `extractSections` y los nodos `pages`/`scope_deadline`/`budget`) · `lib/personality.ts` → `classifyIntent`/`extractBudgetAmount` · `lib/pricing-catalog.ts` · `lib/industry-pricing.ts` · `lib/quote-engine.ts` · `scripts/regression-test.ts` → regresión (actualmente **156 asserts OK**).
- **Comandos**: `npm run test:regression` (DEBE quedar en 0 fallos tras cada cambio), `npm run lint`, `npx tsc --noEmit`. OJO: NO corras `npm run build` mientras `npm run dev` esté activo en el mismo workspace (corrompe `.next`); si pasa, `rm -rf .next` y reinicia.

## 1) TAREA P1 — Hacer robusto `extractSections` (estructuraWeb)

**Problema (ya diagnosticado):** en `lib/conversation-flow.ts`, `extractSections` deja residuos en `context.estructuraWeb` cuando la respuesta mezcla la estructura con otra idea. Ejemplo real (produjo basura):
`"La primera, algo minimalista con fotos grandes. Pues imagino una sola página de corrido: inicio, mis productos, cómo llegar y el contacto."`
→ resultado actual: `"Algo minimalista con fotos grandes. Pues imagino : inicio, Mis productos, Cómo llegar, Contacto"` (sobra TODO lo que está antes de la primera sección real).

**Qué hacer:**

- Investiga `extractSections` (ya quita prefijos de opinión/muletilla, frases de estructura y relleno final) y hazlo más robusto para **descartar lo que está antes de la primera sección real** (p. ej. "Algo minimalista con fotos grandes. Pues imagino" no debe quedar; toma las secciones desde "inicio, mis productos, cómo llegar y el contacto").
- Conserva las secciones reales capitalizadas y limpias (Inicio, Mis productos, Cómo llegar, Contacto).
- NO rompas los casos que YA funcionan (ver FASE E1 y FASE K del test: `"Sí, así una sola página: inicio, mis servicios, la ubicación con el mapa y el contacto. Con eso me conformo"` → `"Inicio, Mis servicios, Ubicación con el mapa, Contacto"`).
- NO rompas `pages.onReceive` (guarda `estructuraWeb` solo si hay secciones válidas).

**Regla de entrega:** agrega a `scripts/regression-test.ts` una sección nueva con asserts que fijen:

- el ejemplo problemático → sin residuo (que capture las 4 secciones reales, ignorando el prefijo),
- que los casos de FASE E1 y K sigan iguales.

## 2) TAREA P2 — No re-preguntar el presupuesto si el cliente ya lo dijo

**Problema (ya diagnosticado):** si el cliente menciona su monto al responder la pregunta de plazo (nodo `scope_deadline`), la máquina guarda `fechaEntrega` pero el monto se pierde, y luego el nodo `budget` le vuelve a preguntar ("¿qué inversión tienes en mente?") aunque ya lo dijo → pregunta redundante en el chat.

**Qué hacer (propuesta; valida la forma más idiomática):**

- En `scope_deadline.onReceive` (o donde sea más limpio), captura también el monto con `extractBudgetAmount(response)` y guárdalo en `ctx.presupuesto` si aún es `null` y la respuesta trae un monto. Ejemplo real: `"Para mediados del próximo mes está bien. Y de presupuesto, la verdad no sé cuánto cobran, pero yo pensaba en unos 10 mil pesos, no más."` → `ctx.presupuesto = "10000"`.
- Haz que el nodo `budget` se **SALTE** si `ctx.presupuesto` ya está capturado (usa su `condition`, igual que otros nodos booleanos) para no repetir la pregunta; el flujo debe continuar a `contact_name`.
- Respeta el comportamiento ya fijado en FASE G: "no sé cuánto cobran" + monto SÍ captura y avanza; una frase de duda SIN monto NO guarda basura y sí pregunta (NO rompas eso).

**Regla de entrega:** agrega asserts que fijen:

- respuesta de plazo + monto a `scope_deadline` → `ctx.presupuesto` queda con el monto Y `budget` se salta (el siguiente nodo es `contact_name`),
- respuesta de plazo SIN monto → `budget` SÍ se pregunta (sin regresión).

## 3) Reglas de trabajo (obligatorio)

1. Lee el archivo y su flujo antes de editar; investiga la causa raíz, no parchees a ciegas.
2. Corrige de forma idiomática; mantén la voz de "señor" del bot (consultor senior, sin tecnicismos, español de México).
3. **Agrega SIEMPRE asserts** a `scripts/regression-test.ts` que fijen cada comportamiento corregido (usa `fireOnReceive`, `extractSections` o conversación con `simulate`/`checkLanding`).
4. Tras cada fix: `npm run test:regression` (0 fallos), `npm run lint` y `npx tsc --noEmit`.
5. Si el fix involucra texto que ve el cliente, valídalo en navegador con `npm run dev` (http://localhost:3000/chat) respondiendo de forma natural.

## 4) NO tocar (fuera de alcance)

- **Nada de secretos/env vars**: los CTAs de contacto usan PLACEHOLDERS (`wa.me/52833`, `mailto:tu@correo.com`, "Tu Nombre") porque las env vars reales las pone el usuario en Vercel (`NEXT_PUBLIC_DEVELOPER_WHATSAPP/EMAIL/NAME/AGENCY_NAME`). NUNCA pidas ni escribas credenciales/API keys; si algo las requiere, dile al usuario que las agregue él mismo en el dashboard.
- No modifiques precios, categorías, ni el motor `calculateQuote` (solo se tocan las tareas P1/P2).

## 5) Formato de entrega

Al terminar, entrégame:

- Por cada tarea: archivo/función cambiado, causa raíz y fix aplicado.
- Asserts de regresión agregados y conteo final (debe quedar en 0 fallos).
- Resultado de `lint` y `tsc`.
- Cualquier nueva mejora detectada (sin implementarla) con prioridad (P0/P1/P2).
