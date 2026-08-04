# Prompt para Roo Code + DeepSeek — Seguir probando y corrigiendo el Bot Cotizador "Alex"

> Copia TODO este bloque en un CHAT NUEVO de Roo Code (modo Code, con DeepSeek) dentro del workspace `bot_cotizador`, y ejecuta los comandos desde la raíz del proyecto. Este prompt prueba **UN SOLO cliente ficticio**: primero te preguntará qué tipo de página quieres que ese cliente esté considerando.

---

Actúa como un consultor senior con años cerrando proyectos de páginas web en México y, a la vez, como QA riguroso del proyecto **bot_cotizador** (el bot "Alex" que entrevista a clientes y arma propuestas comerciales + PDF).

MÉTODO DE TRABAJO (muy importante):

1. **ANTES de probar nada, pregúntame qué tipo de página quiero que esté considerando el cliente ficticio** (elige UNA de las opciones del punto 3). No lo inventes por tu cuenta.
2. Con mi respuesta defines **UN solo cliente ficticio** coherente y me lo confirmas.
3. Pruebas el bot interpretando a ESE único cliente, de forma natural y realista.
4. Detectas errores de lógica/precios/copy, los corriges en el código y proteges cada fix con un assert de regresión.

No inventes requisitos; respeta la arquitectura existente.

## 1) Contexto del proyecto (LÉELO ANTES DE TOCAR NADA)

- **Stack**: Next.js 14 (App Router) + TypeScript estricto + Tailwind + shadcn/ui + Zustand + Framer Motion + Supabase + DeepSeek (vía OpenRouter). Deploy en Vercel (https://botcotizador.vercel.app).
- **Arquitectura HÍBRIDA**: el TEXTO de cada turno lo redacta DeepSeek (`lib/chat-llm.ts` + `app/api/chat/route.ts`), pero el **ESTADO lo decide una máquina determinista** (`lib/conversation-flow.ts` + `lib/chat-store.ts`). El LLM solo "pinta" el mensaje; nunca decide el flujo → el bot es robusto (si la API falla o tarda, usa mensaje determinista `fallbackReply`; hay circuit breaker).
- **Archivos clave**:
  - `lib/conversation-flow.ts` — grafo de nodos y condiciones de salto.
  - `lib/chat-store.ts` — motor (`sendUserMessage`), persistencia en `sessionStorage` (clave `bot_cotizador:result`) porque navega con `window.location.href="/results"`.
  - `lib/personality.ts` — personalidad "consultor senior" + `classifyIntent`, `extractBudgetAmount`, `extractDeadline`, `normalizePhone`, `extractEmail`, `extractSignals`.
  - `lib/pricing-catalog.ts` — `inferCategory` (categorías), `resolverCategoria(ctx)`, `buildFallbackProposal` (fallback sin IA).
  - `lib/industry-pricing.ts` — giros con presupuestos típicos, `ajustarPrecio`, `adaptarCopyGiro`, `filtrarPorDeclinados`, `generarValorNegocio`.
  - `lib/quote-engine.ts` — motor determinista: landing 8500 / corporativo 15000 / +agenda 5600 / +dominioHosting 2500 / +branding 3500, IVA 16% → `calculateQuote` (subtotal/iva/total/anticipo).
  - `lib/openrouter.ts` — `analyzeWithOpenRouter` (DeepSeek) → `enrichCommercial` (clampa por giro, rellena copy) → prompt técnico determinista.
  - `components/results/ProposalView.tsx` — UI de resultados; **fuente de verdad del precio**: `calculateQuote(buildClientData({tipoWeb: derivarTipoWeb(resolverCategoria(ctx), paginas)}))` y `cuotaMensual = total/24`.
  - `components/results/PriceCard.tsx`, `ValueSelling.tsx`, `WhyThisPrice.tsx`, `ContactCTA.tsx`.
  - `scripts/regression-test.ts` — prueba de regresión (tsx), hoy ~95 asserts.
- **Regla de oro del precio (NO la rompas)**: el número que ve el cliente debe ser **UNO SOLO** y coherente de punta a punta: precio exacto = `quoteTotal` (motor determinista); la cuota "Desde $X/mes" = `total/24`; el copy "Piensa en esto" y "¿Por qué este precio?" citan ese mismo total; el PDF (`lib/generate-proposal.ts`) usa `calculateQuote` con el mismo `clientData`. Nunca mezclar el `precio_min` del clamp por giro con el `quoteTotal` determinista.

## 2) Cómo correr y validar

- `npm run dev` → servidor en http://localhost:3000 (probar /chat y /results).
- `npm run test:regression` → prueba de regresión (DEBE quedar en 0 fallos tras cada cambio).
- `npm run build` → build de producción (valida tipado, incluidos los scripts). **IMPORTANTE: NO corras `npm run build` mientras `npm run dev` esté activo en el MISMO workspace** (corrompe `.next`); si pasa, `rm -rf .next` y reinicia.
- `npm run lint`.
- Para ver la propuesta sin navegador, puedes simular la conversación con `tsx` y llamar `buildFallbackProposal(...)` (ver asserts de la fase G del test).

## 3) PRIMERO: pregúntame qué tipo de página considera el cliente ficticio

Antes de abrir el navegador, pregúntame con opciones claras qué tipo de página quieres que esté considerando el cliente ficticio. Elige UNO:

- **Landing / página de presentación** (p. ej. tienda de ropa, restaurante, taller, barbería).
- **Tienda online / ecommerce** (carrito y pagos en línea).
- **Sistema de citas / reservaciones** (clínica, estética, dentista).
- **Plataforma o sistema web a medida** (panel, usuarios, base de datos).
- **Blog / sitio de contenido**.
- **Portafolio profesional**.

Cuando me respondas, arma **UNA ficha de cliente ficticio** coherente con ese tipo y confírmamela antes de probar: giro, ciudad, presupuesto típico, funciones que quiere y cuáles declinará. Guiones de apertura según el tipo:

- Landing: "Hola, tengo una tienda de ropa en Guadalajara y quiero una página sencilla para que la gente me encuentre por internet. Algo básico, no muy caro."
- Ecommerce: "Quiero una tienda online con carrito, pagos con tarjeta y envíos para vender mis productos por internet."
- Citas: "Tengo una clínica dental y quiero que la gente agende sus citas en línea."
- Webapp: "Necesito un sistema para administrar clientes, inventario y reportes."

## 3b) Cómo ejecutar la prueba de ESE único cliente

- Abre `/chat` → "Nueva conversación" y responde como el cliente ficticio, de forma natural y con muletillas (nada de respuestas de una palabra si el personaje no lo amerita).
- Recorre hasta la propuesta final y verifica la checklist del punto 4.
- El foco es UN solo cliente por sesión. Si quieres probar además un caso borde (cliente indeciso o que cambia de opinión a mitad), dímelo y se hace como segunda vuelta después de cerrar la principal.

## 4) Checklist de invariantes (VERIFICA EN CADA PRUEBA)

- [ ] Categoría correcta y coherente con lo que pidió (landing/citas/ecommerce/webapp/portafolio/blog).
- [ ] **Precio único y coherente**: el precio mostrado, la cuota ($/24), el copy de valor, "¿Por qué este precio?" y el PDF citan el MISMO total exacto. Sin rangos que contradigan.
- [ ] **Nada que el cliente declinó** aparece en funcionalidades/entregables/stack (mapa, Supabase, panel, cuentas, pagos, citas, PDFs, PWA). En landings básicas el stack debe ser Next.js + Tailwind + Vercel (sin Supabase).
- [ ] Si el cliente dio presupuesto < total, aparece el **mensaje honesto** ("dijiste hasta $X y parte de $Y; dime y ajusto alcance").
- [ ] Los datos de contacto se guardan LIMPIOS (nombre real, email válido, teléfono normalizado "+52 ..."); la duda "no sé" NO guarda basura y re-pregunta (máx 2); "no tengo/no doy" avanza sin forzar.
- [ ] El flujo NO hace preguntas redundantes ni ciclos de clarificación; para landing no debe preguntar por pagos/PDFs (se saltan por categoría).
- [ ] El chat NO promete montos exactos ni confirma que el presupuesto del cliente alcanza (regla del system prompt).
- [ ] Cierre completo: nombre → correo → teléfono → comentarios → propuesta → PDF descargable.

## 5) Bugs ya corregidos (NO reintroducir — respeta estos comportamientos)

- `inferCategory`: "tienda de ropa" + "página sencilla/catálogo/me encuentren" → **landing**, NO ecommerce. Ecommerce requiere señales de venta en línea real (carrito, checkout, pagar en línea, "vender por internet", "tienda online", envíos).
- `resolverCategoria(ctx)`: ecommerce→landing si `pagos===false`; webapp→landing si no hay panel+BD+login.
- `cuota_mensual` se deriva SIEMPRE de `quoteTotal/24` en `ProposalView` (nunca del clamp del giro).
- `filtrarPorDeclinados` retira ítems que prometen funciones declinadas.
- `budget.nextNode` avanza si hay monto aunque la frase tenga "no sé cuánto cobran" (antes se perdía el monto).
- `ProposalView` muestra mensaje honesto cuando el presupuesto dicho < total.
- chat-llm: prohibido prometer/confirmar montos en el turno de presupuesto.
- No usar `new RegExp(re.source, flags)` sin flag `"g"` (loop infinito en `exec()`).

## 6) Pendientes conocidos (fuera del alcance del código — NO tocar secretos)

- Los CTAs de contacto usan PLACEHOLDERS (`wa.me/52833`, `mailto:tu@correo.com`, "Tu Nombre") porque las env vars reales las pone el usuario en Vercel (`NEXT_PUBLIC_DEVELOPER_WHATSAPP/EMAIL/NAME/AGENCY_NAME`). **NUNCA pidas ni escribas credenciales/API keys**; si algo las requiere, dile al usuario que las agregue él mismo en el dashboard.

## 7) Reglas de trabajo al corregir

1. Investiga la causa raíz (lee el archivo y su flujo) antes de editar; no parchees a ciegas.
2. Corrige en el lugar correcto y de forma idiomática; mantén el tono "consultor senior" del bot y el español de México.
3. **Agrega SIEMPRE un assert** a `scripts/regression-test.ts` que fije el comportamiento corregido (usa `fireOnReceive`, `inferCategory`, `resolverCategoria`, `filtrarPorDeclinados`, `calculateQuote`, o una conversación `checkLanding` completa como las 5 existentes).
4. Tras cada fix: `npm run test:regression` (0 fallos) y `npm run build` (limpio).
5. Si el fix involucra texto que ve el cliente, valídalo en el navegador con `npm run dev` (persona de prueba).

## 8) Formato de entrega

Al terminar la prueba de ESE cliente, entrégame:

- La ficha del cliente ficticio probado (tipo de página, giro, ciudad, presupuesto, funciones queridas/declinadas).
- Resultado de la prueba: categoría que detectó el bot, precio exacto, cuota al mes, y si cumplió la checklist del punto 4.
- Errores encontrados (archivo/función) y el fix aplicado.
- Asserts de regresión agregados y conteo final (debe ser ≥ 95 y 0 fallos).
- Cualquier mejora propuesta (no implementada) con prioridad (P0/P1/P2).
