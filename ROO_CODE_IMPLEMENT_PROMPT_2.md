# Prompt para Roo Code + DeepSeek — Bot "Alex": menos turnos, sin preguntas repetidas, autollenado y ahorro de tokens

> Pega TODO este bloque en un CHAT NUEVO de Roo Code (modo Code, con DeepSeek) dentro del workspace `bot_cotizador`. Trabaja en lote pequeño: UNA tarea a la vez, con la regresión en verde al final de cada una. Ejecuta los comandos desde la raíz del proyecto.

---

Actúa como consultor senior y QA riguroso del proyecto **bot_cotizador** (el bot "Alex"). El objetivo de esta tanda: **reducir la redundancia del chat y el gasto de tokens** sin perder datos ni romper la arquitectura. Implementa las tareas A–E, cada una protegida con asserts de regresión.

## 0) Contexto (NO reinventar)

- **Arquitectura HÍBRIDA (NO romper)**: DeepSeek redacta el TEXTO de cada turno (`lib/chat-llm.ts` + `app/api/chat/route.ts`, con `fallbackReply`); el ESTADO lo decide la máquina determinista (`lib/conversation-flow.ts` + `lib/chat-store.ts`).
- **Regla de oro del precio (NO romper)**: precio exacto = `quoteTotal` (motor `calculateQuote` en `lib/quote-engine.ts`); cuota "Desde $X/mes" = `total/24`; copy y PDF citan el MISMO total. Nunca mezclar `precio_min` (clamp por giro) con `quoteTotal`.
- **Archivos clave** (léelos de forma acotada antes de tocar):
  - `lib/conversation-flow.ts` → grafo: `extractSections`, `cutBeforeSections`, `SECTION_LEAD_IN`, nodos `pages`, `scope_deadline`, `budget`, `scope_content`, `scope_services`, `scope_reference`, `technical_pwa`, `technical_pdfs`, `makeBooleanNode`, `isNoSé`.
  - `lib/personality.ts` → `classifyIntent`, `extractBudgetAmount`, `extractDeadline`, `extractName`, `extractEmail`, `extractSignals`, `SIGNAL_PATTERNS`.
  - `lib/types.ts` → `ChatContext`, `createEmptyContext`.
  - `scripts/regression-test.ts` → regresión (actualmente **172 asserts OK**), helpers `fireOnReceive`, `simulate`, `checkLanding`.
- **Comandos**: `npm run test:regression` (DEBE quedar en 0 fallos tras CADA tarea), `npm run lint`, `npx tsc --noEmit`. OJO: NO corras `npm run build` mientras `npm run dev` esté activo en el mismo workspace (corrompe `.next`); si pasa, `rm -rf .next` y reinicia.

## 1) Reglas de eficiencia de tokens (obligatorias para DeepSeek/Roo)

1. **Lee solo lo necesario**: `grep`/`read_file` acotado a las funciones y nodos de la tarea. NO leas archivos completos de 500+ líneas si basta un rango.
2. **Edita quirúrgico**: `replace_string_in_file` sobre el fragmento exacto. Prohibido reescribir archivos completos, añadir comentarios decorativos o `console.log`.
3. **Reutiliza helpers existentes** (`extractBudgetAmount`, `extractDeadline`, `extractName`, `extractEmail`, `isNoSé`, `makeBooleanNode`, `fireOnReceive`, `simulate`). No dupliques lógica.
4. **Una tarea a la vez** y tras cada una corre SOLO: `npm run test:regression` → `npm run lint` → `npx tsc --noEmit`. No corras `build`.
5. **No vuelques código en tu respuesta**: entrega solo un resumen corto por tarea (archivo/función, causa raíz, fix en 1 línea) + asserts agregados + conteo final. Nada de pegar archivos completos.
6. Si una tarea requiere muchas ediciones o cambia las listas de respuestas de la regresión F, avísame ANTES de seguir (puede haber trade-off de datos).

## 2) TAREA A — `extractSections`: introductores libres y ":" no introductor (pendiente P1)

Mejora `cutBeforeSections`/`SECTION_LEAD_IN` (`lib/conversation-flow.ts`) para dos huecos que siguen vivos:

- **A1 · Introductor libre SIN lead-in conocido** → el prefijo de opinión aún se cuela como sección:
  `"La página que sueño para mi negocio es: inicio, servicios y contacto"` debe dar `"Inicio, Servicios, Contacto"` (hoy deja "La página que sueño para mi negocio es" como sección).
  Propuesta idiomática: cuando hay un `:` y lo anterior NO contiene un lead-in conocido, cortar igual si la parte anterior termina en verbo de intención (`es|será|quiero|imagino|necesito|pienso|deseo|sueño con|me gustaría`). Valida que no rompa los casos ya fijados.
- **A2 · ":" que cierra la lista en vez de abrirla** → no debe colar relleno final como sección:
  `"inicio, servicios y contacto: con eso me basta"` debe dar `"Inicio, Servicios, Contacto"` (hoy el ":" no se corta por falta de lead-in y "con eso me basta" puede colarse). Trata el texto tras un ":" no introductor como relleno final (misma familia que `con eso me conformo`).

**Regla**: NO romper FASE E1, E1b y K (asserts ya existentes). Agrega asserts A1/A2 (fase E1c).

## 3) TAREA B — Presupuesto capturado en el plazo: verbos de dinero SIN capturar plazos (pendiente P2)

En `scope_deadline.onReceive` (`lib/conversation-flow.ts`) el guard de señal de presupuesto es conservador: una cifra con verbo de dinero sin palabra clave ("para marzo, tengo 10000") NO captura → vuelve a preguntar. Amplía la señal de presupuesto SIN introducir falsos positivos de plazo:

- **B1** → `"para marzo, tengo 10000"` (sin "pesos"/"mil") debe capturar `"10000"` (hoy no).
- **B2 (sin regresión)** → `"en 3 meses"` y `"para el próximo mes, en unas 3 semanas"` NO deben capturar nada. NO rompas la conversación F de María ("en unas 3 semanas").
- Propuesta: agregar verbos de intención de dinero (`tengo|contaba|ando pensando|pensaba invertir|le puedo dar|tengo pensado`) al regex de señal, y/o exigir que la cifra esté en la misma cláusula que la señal.

**Regla**: asserts en fase P2 (B1 captura; B2 no captura; el flujo sigue saltando `budget` solo cuando hay monto real).

## 4) TAREA C — Chat menos redundante: filtrar preguntas poco relevantes por categoría

El discovery dura ~18 turnos incluso para una landing básica, con preguntas poco relevantes para ese tipo de web. Revisa los nodos en `lib/conversation-flow.ts` y agrega `condition` (o ajusta las existentes) para que, según la categoría ya resuelta (`ctx.category` vía `resolverCategoria`), se salten los nodos poco relevantes. Candidatos a evaluar (NO los apliques todos a ciegas; valida cada uno contra la regresión):

- `technical_pwa` (instalable como app) → poco relevante para landing básica.
- `scope_reference` (página de referencia) → irrelevante para landing; saltar si el cliente ya dijo "ninguna/no tengo".
- `technical_pdfs` → ya tiene condition; confirma que para landing se salta.
- `scope_content`/`scope_services` → si el cliente ya dio contenido/servicios en otra respuesta, no volver a preguntar (liga con TAREA D).

**CRÍTICO**: al saltar nodos cambia la lista de respuestas de la regresión F (las 5 conversaciones `checkLanding` y la K de Carlos). Actualiza ESAS listas quitando las respuestas de los nodos saltados, para que `simulate` consuma exactamente las respuestas restantes (`used === answers.length`). No rompas el resto de asserts.

**Regla**: tras cada nodo que saltes, agrega un assert que pruebe que el nodo NO aparece en `asked[]` de `simulate` para esa categoría.

## 5) TAREA D — No preguntar lo que ya sabe: captura temprana en cualquier respuesta

Haz que los datos que el cliente suelta en una respuesta CUALQUIERA (no solo en su nodo) queden capturados, y que el nodo se salte si el dato ya está:

- Extiende `extractSignals` (o agrega captura en `discovery_business`/`discovery_confirm`/`scope_reference`/`scope_deadline`) para detectar y guardar, si aún son `null`: nombre (`extractName`), email (`extractEmail`), presupuesto (`extractBudgetAmount` + guard de señal de dinero), plazo (`extractDeadline`), servicios, estructura.
- Cada nodo cuyo dato ya esté capturado se **salta por `condition`** (mismo patrón que `budget` en P2), con el guard obligatorio: su `nextNode` debe devolver el siguiente ante respuesta vacía (el skip del engine llama `nextNode("", ctx)`; si no, cae en la clarificación).
- **No guardes basura**: "no sé / no me acuerdo / ninguno" sigue sin capturar (respeta FASE G y A3).

**Regla**: asserts que fijen, p. ej., un cliente que en `discovery_business` dice "Soy Laura, tengo una clínica… quiero que agenden citas, para marzo y tengo unos 20 mil" → `clientName`/`presupuesto`/`fechaEntrega` capturados y los nodos `budget`/`scope_deadline`/`contact_name` no re-preguntan. Ajusta la regresión F si hace falta.

## 6) TAREA E — El formulario/propuesta se llena solo (verificación)

- Verifica que la propuesta (`/results`, `ProposalView`) y el PDF se autollenan con TODO lo capturado en `ChatContext` (nombre, email, teléfono, presupuesto, servicios, estructura, fecha) sin que el cliente repita nada. Si falta algún dato que el chat SÍ capturó, corrígelo en la vista.
- **NO tocar los CTAs de contacto**: siguen con PLACEHOLDERS (`wa.me/52833`, `mailto:tu@correo.com`, "Tu Nombre") porque las env vars reales las pone el usuario en Vercel (`NEXT_PUBLIC_DEVELOPER_WHATSAPP/EMAIL/NAME/AGENCY_NAME`). NUNCA pidas ni escribas credenciales/API keys.
- **Regla**: assert que verifique que un flujo completo con datos (fase F o K) deja todos los campos de contacto/negocio poblados y que ningún dato capturado se vuelve a preguntar.

## 7) NO tocar (fuera de alcance)

- Precios, categorías, motor `calculateQuote`, `lib/industry-pricing.ts` (ajustes por giro), ni el comportamiento ya fijado en FASE G/E1/E1b/K.
- Nada de secretos/env vars (ver TAREA E).

## 8) Formato de entrega (resumen corto al terminar)

- Por tarea: archivo/función cambiado · causa raíz · fix en 1 línea · asserts agregados.
- Conteo final de `npm run test:regression` (0 fallos) + resultados de `lint` y `tsc`.
- Tabla corta: nodo → categorías donde ahora se salta, y cuántos turnos se ahorran aprox.
- Nueva mejora detectada (sin implementarla) con prioridad P0/P1/P2.
