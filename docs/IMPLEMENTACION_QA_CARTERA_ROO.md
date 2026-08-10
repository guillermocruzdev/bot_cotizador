# 🧭 Plan de QA Integral de la Cartera · Personas de Eval + Pack Técnico · Roo Code + DeepSeek

## Bot Cotizador "Alex" · 11 categorías + Nivel 4/5

> **Documento ejecutivo del Señor CEO + CTO** — v1.0 · ago 2026
>
> **Qué es:** un **pack de prompts por fases y roles** para que Roo Code + DeepSeek
> garanticen que el bot cotizador "Alex" **funciona perfecto con el nuevo flujo de la
> cartera** (11 categorías + verticales N4 + ecosistema N5) y que el **prompt técnico
> (pack de 20-26 chats) que entrega a cada cliente refleje TODO lo que se acaba de
> agregar** en las FASES 1-8 de `docs/IMPLEMENTACION_CARTERA_ROO.md`.
>
> **Cómo se usa:** cada fase es un **prompt autocontenido** para un **chat NUEVO de
> Roo Code**. Se copia completo, se pega, se deja trabajar y se valida antes de pasar
> a la siguiente. El orden importa: primero se cierra la cobertura de personas, luego
> la robustez, luego el pack, y al final la validación integral.

---

## 0. Reglas globales (aplica en TODAS las fases)

1. **Lee primero `AGENTS.md`** (§0 estado de la rama, §10 trampas, §11 "tareas → dónde
   tocar") y los docs de la cartera (`docs/IMPLEMENTACION_CARTERA_ROO.md` +
   `docs/MERCADO_PAGINAS_VIBECODER.md`).
2. **Regla #7 (precio único):** UI, PDF, copy y pack citan el MISMO total, siempre vía
   `calcularTotalDeterminista()` en `lib/quote-engine.ts`. El motor manda
   (`precio_min = totalExacto` SIEMPRE). **Nunca** hardcodear montos.
3. **No rompas lo que ya funciona:** la línea base hoy es regresión **417 asserts**,
   eval **23 personas / 423 asserts / 0 fallos / 0 warnings**, lint 0, tsc SOLO los 28
   errores preexistentes de `prospecting/closing/negotiation-agent.ts`. Toda adición
   debe pasar ambos sin regresiones.
4. **Keywords con palabra completa** (regex con límites, no subcadena) y **conscientes
   de negación** (`isNegated`: "no quiero un portal de propiedades" NO activa la
   vertical). Reglas 5-6 de `AGENTS.md`.
5. **El LLM pinta, la máquina decide:** los cambios de detección/flujo van en la
   máquina de estados (`conversation-flow.ts`/`pricing-catalog.ts`), no en el texto
   del LLM.
6. **Validar SIEMPRE al terminar una fase:** `npm run test:regression`,
   `npm run test:eval`, `npm run lint`, y `npx tsc --noEmit` (solo errores
   preexistentes de negotiation-agent.ts). Y **no correr `next build` con `next dev`
   activo** en el mismo workspace (corrompe `.next`).
7. **No tocar `prospecting/closing/negotiation-agent.ts`** (roto, preexistente — §0 de
   AGENTS.md). Los errores de tsc de ese archivo no son tuyos.
8. **Patrón de personas en `scripts/eval.ts`:** respuestas realistas con "no sé" /
   delegación; el presupuesto DEBE usar fecha reconocible por `extractDeadline`
   ("para el próximo mes", NO "para los próximos tres meses"); evitar "sus" en
   respuestas neutras (`detectTrato` lo toma como usted); si la persona va a elegir
   bots, decirlo con las keywords de `BOT_CHIP_VALUES`.

---

## 1. Mapa de fases (resumen)

| Fase | Rol (sombrero)                        | Contenido                                                                               | Prioridad | Archivos clave                                          |
| ---- | ------------------------------------- | --------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------- |
| 0    | QA Lead + CEO                         | Auditoría de línea base + lista exacta de brechas                                       | —         | (lectura + tests)                                       |
| 1    | Bot Tester (Conversation Designer)    | Personas de categorías faltantes: **link_in_bio, cotizador** → eval 25, cobertura 11/11 | ⭐⭐⭐    | scripts/eval.ts, conversation-flow, chat-llm            |
| 2    | Solutions Architect                   | Personas de verticales N4: **cursos, telemedicina, directorio** → eval 28               | ⭐⭐      | scripts/eval.ts, pricing-catalog, bots-catalog          |
| 3    | Enterprise Architect                  | Personas de ecosistema N5: **saas, erp** → eval 30 (11/11 + 5 verticales + 3 ecos)      | ⭐        | scripts/eval.ts, openrouter, chat-llm                   |
| 4    | QA Engineer (Bot Tester)              | Robustez del nuevo flujo: negación de verticales, degradación, N5 sin precio cerrado    | ⭐⭐      | scripts/regression-test.ts, conversation-flow, chat-llm |
| 5    | Prompt Engineer + Technical Writer    | Auditoría del pack contra la cartera (huecos RF/data model por vertical y N5)           | ⭐⭐      | lib/prompt-builder.ts (lectura), docs/prompts/\*.md     |
| 6    | Prompt Engineer + Solutions/Ent. Arch | **Agregar al pack lo que falta**: RF por vertical/N5/pro/multilingüe + data model       | ⭐⭐⭐    | lib/prompt-builder.ts, scripts/generate-pack-samples.ts |
| 7    | QA Lead + CEO/CTO                     | Validación integral + coherencia de precios + documentación (AGENTS.md/memoria)         | —         | AGENTS.md, docs, memoria                                |

---

## FASE 0 · Auditoría de línea base

**Rol:** QA Lead + CEO

```text
Actúa como QA Lead + CEO del proyecto "Bot Cotizador Alex" (Next.js 14 + TS
estricto). Objetivo: establecer la LÍNEA DE PARTIDA de QA antes de cerrar la
cobertura de personas y el pack técnico de la cartera.

CONTEXTO: el bot ya cotiza 11 categorías (landing, corporativo, ecommerce,
citas, webapp, blog, portafolio, menu_digital, tarjeta_digital, link_in_bio,
cotizador) y webapp se amplió a Nivel 4 (inmobiliaria/membresías/cursos/
telemedicina/directorio) y Nivel 5 (marketplace/SaaS/ERP) por features + señales
pasivas (FASES 1-8 de docs/IMPLEMENTACION_CARTERA_ROO.md).

TAREAS:
1. Lee AGENTS.md (§0 estado de la rama) y docs/IMPLEMENTACION_CARTERA_ROO.md.
2. Verifica la línea base con comandos EXACTOS:
   - npm run test:regression   (debe dar 417 OK)
   - npm run test:eval         (debe dar 23 personas, 423 asserts, 0 warnings)
   - npm run lint              (0 errores)
   - npx tsc --noEmit          (solo los 28 errores preexistentes de
                                prospecting/closing/negotiation-agent.ts)
3. Levanta la COBERTURA REAL de scripts/eval.ts:
   - Lista las 23 personas y su expectedCategory.
   - Devuelve la tabla de cobertura: qué categorías/verticales/ecosistemas TIENEN
     persona y cuáles NO.
   - Confirmado hoy: FALTAN personas para link_in_bio y cotizador (categorías),
     cursos/telemedicina/directorio (verticales N4 — solo cubiertas a nivel
     unitario en la FASE QA10 de regression-test.ts) y saas/erp (ecosistema N5 —
     solo marketplace tiene persona).
4. Audita el PACK TÉCNICO (lib/prompt-builder.ts) contra la cartera:
   - buildFunctionalRequirements() (RF-01..RF-17): ¿hay RF para multilingüe,
     ecommerce-pro (inventario/reportes/CFDI/multi-vendedor), las 17 features de
     vertical N4 y las 10 de ecosistema N5? Documenta los que FALTAN.
   - El spec de webapp (pages/dataModel/userFlow): ¿es genérico o refleja cada
     vertical/N5? Documenta qué le falta.
   - Verifica que buildTipoPagina / VERTICAL_BRIEFS / resolveBrief ya nombran el
     tipo N4/N5 (debe estar hecho de la FASE 7).
5. Documenta en un comentario breve del chat: la tabla de brechas de personas y
   la tabla de huecos del pack, para que las fases siguientes las usen.

RESTRICCIONES: NO modifiques código todavía. Solo lectura y medición.

OUTPUT ESPERADO:
- Confirmación de la línea base (tests verdes o fallos exactos).
- Tabla de brechas de personas (categoría/vertical/ecosistema → falta persona).
- Tabla de huecos del pack (RF/data model faltantes por tipo).
```

---

## FASE 1 · Personas de categorías faltantes: link_in_bio + cotizador ⭐⭐⭐

**Rol:** Bot Tester (Conversation Designer)

```text
Actúa como Bot Tester + Conversation Designer del "Bot Cotizador Alex". Objetivo:
cerrar la cobertura de CATEGORÍAS del eval añadiendo las 2 personas que faltan:
link_in_bio y cotizador. Hoy eval cubre 9/11 categorías; con esto llega a 11/11.

CONTEXTO: lib/pricing-catalog.ts ya detecta y cotiza link_in_bio (base
2500/4500/7000, features qr/mini_catalogo) y cotizador (base 15000/25000/40000,
features formulario_multipaso/calculo_automatico/pdf_cotizacion/
notificacion_whatsapp). El harness de scripts/eval.ts ya soporta expectedCategory
y expectsBots. El objetivo es añadir personas REALISTAS que recorran el flujo
completo (greeting → discovery → bundle → design → bots → contenido → servicios →
budget → contacto → cierre) sin warnings ni preguntas redundantes.

TAREAS:
1. scripts/eval.ts → PERSONAS:
   a. PERSONA 24 · link_in_bio: un creador/influencer o marca personal que dice
      "quiero una página con todos mis enlaces para mi bio de Instagram, con mi
      WhatsApp y mis redes". expectedCategory: "link_in_bio", maxAsked razonable.
      Verifica que inferCategory no lo robe (keywords: link en mi bio / links de
      mis redes / una página con mis enlaces) y que el flujo NO pregunte cosas
      pesadas (auth/db/pagos/pwa se saltan para CATEGORIAS_SIMPLES).
   b. PERSONA 25 · cotizador: un oficio/servicio (p. ej. mecánico o imprenta) que
      dice "quiero un cotizador para que mis clientes me pidan presupuesto en
      línea y les llegue por WhatsApp". expectedCategory: "cotizador". Verifica
      que technical_pdfs se salte o se ofrezca bien (el cotizador genera PDFs) y
      que el nodo technical_bots NO recomiende bot_cotizacion (es el producto).
2. Si alguna persona falla por flujo (pregunta redundante, categoría equivocada,
   nodo que no se salta), corrige la CAUSA RAÍZ en la fuente de verdad:
   - lib/conversation-flow.ts (conditions de nodos pesados para estas categorías,
     señal en SIGNAL_PATTERNS si hace falta, quickRepliesFor para los chips).
   - lib/chat-llm.ts (TURN_GOALS de los nodos que toquen estas categorías para que
     el LLM hable de "página de enlaces" / "cotizador en línea" sin prometer
     montos). NO cambiar precios.
3. PRUEBA: corre npm run test:eval (debe dar 25 personas, cobertura 11/11, 0
   warnings) y npm run test:regression (417+ sin regresiones).

RESTRICCIONES:
- Mantén el flujo consolidado (technical_bundle, budget fusionado, contact_name con
  3 datos): NO regresiones de flujo.
- Los presupuestos de las personas deben usar fecha reconocible ("para el próximo
  mes") y evitar "sus" en respuestas neutras (patrón de AGENTS.md §10.21).
- Precio único vía calcularTotalDeterminista(); no tocar quote-engine salvo que una
  persona revele un bug real.

VALIDACIÓN:
- npm run test:eval  → 25 personas, 11/11 categorías, 0 fallos, 0 warnings
- npm run test:regression · npm run lint · npx tsc --noEmit (sin errores nuevos)

OUTPUT ESPERADO: 2 personas nuevas (link_in_bio + cotizador) pasando, cobertura
11/11, y un reporte corto de qué se tocó en cada archivo.
```

---

## FASE 2 · Personas de verticales N4: cursos, telemedicina, directorio ⭐⭐

**Rol:** Solutions Architect

```text
Actúa como Solutions Architect + Bot Tester del "Bot Cotizador Alex". Objetivo:
cerrar la cobertura de VERTICALES de nivel 4 del eval añadiendo 3 personas que hoy
solo están cubiertas a nivel unitario (FASE QA10 de regression-test.ts): cursos,
telemedicina y directorio. Con esto eval llega a 28 personas y cubre las 5
verticales (inmobiliaria y membresías ya tienen persona).

CONTEXTO: webapp detecta cada vertical con señales pasivas
(inmobiliaria/membresias/cursos/telemedicina/directorio en ChatContext) y mapea sus
features (lecciones_video/progreso_alumno/certificado/comunidad_foros para cursos;
expediente_paciente/videollamada/recetas para telemedicina; fichas_autogestionables/
busqueda_mapa/pagos_ficha_premium para directorio). El harness de eval ya tiene el
campo expectsVertical con las 5 opciones.

TAREAS:
1. scripts/eval.ts → PERSONAS (todas expectedCategory: "webapp" + expectsVertical):
   a. PERSONA 26 · cursos: una academia/coach que dice "quiero una plataforma de
      cursos en línea con lecciones en video, progreso del alumno y certificados".
      expectsVertical: "cursos". Verifica que los bots recomendados sean
      bot_membresias + bot_ventas (detectarBotsRecomendados).
   b. PERSONA 27 · telemedicina: una clínica que dice "queremos un portal de
      telemedicina con expediente del paciente y videollamadas para consultas en
      línea". expectsVertical: "telemedicina". Verifica que recomiende
      bot_citas + bot_faq.
   c. PERSONA 28 · directorio: una asociación/cámara que dice "quiero un directorio
      de negocios de mi zona con fichas autogestionables y búsqueda por mapa".
      expectsVertical: "directorio". Verifica que recomiende bot_faq + bot_leads.
2. OJO con el GIRO en estas personas: la descripción debe activar el giro correcto
   (cursos → consultor/coach o academia; telemedicina → médico/clínica; directorio
   → tienda/comercio o empresa) para que el clamp de industry-pricing no rompa el
   ticket (ver §5 de AGENTS.md: inmobiliaria [25000,70000], gym [10000,28000],
   consultor/coach [15000,45000], médico/clínica [20000,60000]).
3. Si una persona falla (señal no activada, categoría distinta a webapp, bot
   equivocado), corrige la CAUSA RAÍZ:
   - lib/pricing-catalog.ts / lib/conversation-flow.ts (patrón de señal pasiva).
   - lib/bots-catalog.ts (matriz por vertical) — verificar que el orden manda.
   - NO tocar los precios de las features ni la base.
4. PRUEBA: npm run test:eval (28 personas, 0 warnings) y npm run test:regression.

RESTRICCIONES:
- Respetar resolverCategoria(): si el cliente rechaza panel/BD/login, webapp se
  degrada a landing. Las personas deben pedir la vertical para no degradarse.
- No inflar el fallback: las features verticales entran SOLO si la señal se activa.
- Precio único vía calcularTotalDeterminista().

VALIDACIÓN:
- npm run test:eval  → 28 personas, 5/5 verticales, 0 fallos, 0 warnings
- npm run test:regression · npm run lint · npx tsc --noEmit

OUTPUT ESPERADO: 3 personas nuevas de vertical (cursos, telemedicina, directorio)
pasando, y confirmación de que la matriz de bots por vertical está correcta.
```

---

## FASE 3 · Personas de ecosistema N5: saas + erp ⭐

**Rol:** Enterprise Architect

```text
Actúa como Enterprise Architect + Bot Tester del "Bot Cotizador Alex". Objetivo:
cerrar la cobertura del ECOSISTEMA de nivel 5 del eval añadiendo 2 personas que
faltan: saas y erp (marketplace ya tiene persona, Andrés). Con esto eval llega a 30
personas y cubre las 3 señales N5.

CONTEXTO: webapp detecta el ecosistema con señales pasivas N5
(marketplace/saas/erp en ChatContext) y mapea sus features (multi_tenant/
planes_billing/api_publica para SaaS; modulo_compras/modulo_ventas/modulo_almacen/
modulo_nomina/integracion_contable/reportes_ejecutivos para ERP). El harness de
eval ya tiene expectsEcosystem con las 3 opciones. El giro nuevo empresa_operacion
[40000,150000] protege el ticket del clamp.

TAREAS:
1. scripts/eval.ts → PERSONAS (expectedCategory: "webapp" + expectsEcosystem):
   a. PERSONA 29 · saas: un emprendedor que dice "quiero montar un software como
      servicio (SaaS) para que mis clientes se registren y paguen una suscripción
      mensual, con sus datos aislados". expectsEcosystem: "saas". Verifica que la
      señal saas NO se confunda con marketplace ni ERP.
   b. PERSONA 30 · erp: un dueño de empresa que dice "necesito un sistema que
      controle mis compras, ventas, almacén y nómina, con reportes ejecutivos e
      integración contable". expectsEcosystem: "erp". OJO: "facturación"/"inventario"
      sueltos NO deben caer a ecommerce ni a ecommerce-pro; ERP exige contexto de
      operación (compras/ventas/almacén/nómina).
2. Verifica el flujo "propuesta formal" para N5:
   - buildRecap (lib/conversation-flow.ts) debe decir "tipo: plataforma a medida
     (marketplace, SaaS o ERP) — te preparo una propuesta formal con alcance
     detallado" para webapp + señal N5.
   - En el modo --llm, el compactContext (lib/chat-llm.ts) prohíbe prometer precio
     cerrado. En el determinista, el recap y el pack deben citar "desde" (precio del
     motor) sin rango cerrado contradictorio (regla #7).
3. Si una persona falla, corrige la causa raíz en conversation-flow/pricing-catalog
   (patrón de señal N5 con retorno temprano decisivo) — NUNCA en el texto del LLM.
4. PRUEBA: npm run test:eval (30 personas, 0 warnings) y npm run test:regression.

RESTRICCIONES:
- NO crear categorías "saas"/"erp" separadas: son webapp con features N5.
- El bot NUNCA promete precio exacto cerrado para estos tickets (solo "desde").
- Precio único vía calcularTotalDeterminista().

VALIDACIÓN:
- npm run test:eval  → 30 personas, 3/3 ecosistemas, 0 fallos, 0 warnings
- npm run test:regression · npm run lint · npx tsc --noEmit

OUTPUT ESPERADO: 2 personas nuevas N5 (saas, erp) pasando, cobertura total
(11 categorías + 5 verticales + 3 ecosistemas = 30 personas), y confirmación del
flujo "propuesta formal" para N5.
```

---

## FASE 4 · Robustez del nuevo flujo (casos límite) ⭐⭐

**Rol:** QA Engineer (Bot Tester)

```text
Actúa como QA Engineer del "Bot Cotizador Alex". Objetivo: blindar el flujo de la
cartera contra los casos límite REALES del nuevo flujo, añadiendo una FASE nueva a
scripts/regression-test.ts. El motor ya tiene FASE 6 (bots por giro), QA9
(ecommerce pro), QA10 (verticales). Falta QA11: robustez fina de las nuevas
categorías y de N4/N5.

TAREAS (añade una fase QA11 en scripts/regression-test.ts, ~15-20 asserts):
1. Negación de verticales/N5: "no, no quiero un portal de propiedades, solo una
   página sencilla" → NO activa inmobiliaria y cae a landing (guarda SIMPLE_PAGE_RE
   + resolverCategoria). Igual para marketplace con "no, solo una página".
2. Degradación por rechazo: webapp vertical + cliente que rechaza panel/BD/login →
   resolverCategoria degrada a landing (assert existente en QA10, amplíalo a
   membresías/cursos si hace falta).
3. Categorías de entrada NO preguntan cosas pesadas: menu_digital/tarjeta_digital/
   link_in_bio/cotizador saltan technical_auth/db/payments/pwa y scope_reference
   (CATEGORIAS_SIMPLES). Assert de nodos preguntados (asked[]) para una persona de
   cada categoría nueva.
4. N5 sin precio cerrado: para webapp+marketplace/saas/erp, el buildRecap contiene
   "propuesta formal" y el pack (buildTechnicalPrompt con analysis del motor) NO
   cita un rango que contradiga el "desde" (min==max → un solo valor, regla #7).
5. Bots: cotizador NO recomienda bot_cotizacion (es el producto) pero sí bot_faq;
   link_in_bio/tarjeta_digital/menu_digital recomiendan bot_faq (+leads según
   giro). Assert con detectarBotsRecomendados.
6. Cross-sell escalera: restaurante con menú digital ve la escalera "y si quieres,
   en vez de solo el menú podemos agregar que aparten mesa" (sugerirEscaleraProducto).
7. Precios: calcularTotalDeterminista de link_in_bio (5800) y cotizador (20300)
   coincide con buildFallbackProposal.precio_min (regla #7) — misma base que la
   verificación de la FASE 8 del plan de cartera.
8. Presupuesto ajustado: persona de link_in_bio con presupuesto menor al total →
   mensaje_alcance honesto presente (sin romper el cierre).

RESTRICCIONES:
- Si un assert falla, corrige la CAUSA RAÍZ (keyword, condición o precio en la
  fuente de verdad), NUNCA debilitando el assert.
- No tocar prospecting/ ni los tests que ya pasan sin motivo.
- OJO tsconfig: NO iterar Set con for...of (TS2802) → usar Array.from.

VALIDACIÓN:
- npm run test:regression  (417 + QA11, sin regresiones)
- npm run test:eval · npm run lint · npx tsc --noEmit

OUTPUT ESPERADO: fase QA11 con ~15-20 asserts de robustez del nuevo flujo, todo
verde, y el reporte de qué trampas del flujo reveló cada caso.
```

---

## FASE 5 · Auditoría del pack técnico contra la cartera ⭐⭐

**Rol:** Prompt Engineer + Technical Writer

```text
Actúa como Prompt Engineer + Technical Writer del "Bot Cotizador Alex". Objetivo:
AUDITAR (solo lectura) que el prompt técnico (lib/prompt-builder.ts → pack de 20-26
chats) refleje TODO lo que se agregó en las FASES 1-8 de la cartera, y dejar una
lista exacta de huecos para la FASE 6.

CONTEXTO: FASE 7 ya añadió CATEGORY_BRIEFS + VERTICAL_BRIEFS + resolveBrief +
TIPO_LABEL + buildTipoPagina (línea "TIPO DE PÁGINA:" en buildCompactContext).
FASE 8 alineó el "Presupuesto estimado" con el motor (regla #7). Falta verificar
que el pack EN EL CUERPO (requerimientos funcionales, modelo de datos, contexto por
chat) conozca las features verticales y N5.

TAREAS (auditoría, NO editar todavía):
1. buildFunctionalRequirements() (lib/prompt-builder.ts): lista los RF-01..RF-17.
   Documenta cuáles NO existen y deberían:
   - multilingüe (RF para "versión en inglés y español" cuando ctx.multilingue).
   - ecommerce-pro: inventario_avanzado, reportes_ventas, facturacion_cfdi,
     multi_vendedor (solo si category==="ecommerce" y la señal está activa).
   - verticales N4 (solo si category==="webapp"): inmobiliaria (filtros/leads/
     panel_publicacion), membresías (cobro_recurrente/area_privada/gestion_planes/
     reportes_retencion), cursos (lecciones_video/progreso_alumno/certificado/
     comunidad_foros), telemedicina (expediente/videollamada/recetas), directorio
     (fichas/busqueda_mapa/pagos_ficha_premium).
   - ecosistema N5 (solo si category==="webapp"): split_pagos/multi_tenant/
     planes_billing/api_publica, módulos ERP, integracion_contable, reportes_ejecutivos.
2. Spec de webapp (pages/dataModel/userFlow): hoy es genérico ("módulos según el
   proceso del cliente"). Documenta qué falta por vertical/N5:
   - inmobiliaria: páginas de listado/filtros/propiedad/lead; tablas propiedades,
     leads, agentes.
   - cursos: páginas catálogo/lección/progreso/certificado; tablas cursos,
     lecciones, inscripciones, progreso, certificados.
   - telemedicina: expediente/videollamada/recetas; tablas pacientes, citas,
     expedientes, recetas.
   - directorio: fichas/búsqueda-mapa/premium; tablas negocios, fichas, pagos.
   - marketplace/SaaS/ERP: tenants, vendedores, productos, pedidos, split de pagos,
     planes/billing, módulos compras/ventas/almacén/nómina.
3. Verifica el preámbulo/ficha del pack: "TIPO DE PÁGINA", "🎭 Rol que conduce el
   proyecto" (resolveBrief), "Presupuesto estimado" (motor), y que los packs de
   N5 digan "se cotiza con propuesta formal detallada, no a ciegas".
4. Regenera los packs solo si algo salió mal en la FASE 7 (verificar que los 18
   PACK-*.md no tengan literales "CHAT undefined" ni rangos contradictorios).
5. Documenta en el chat la TABLA DE HUECOS del pack (qué RF / qué data model / qué
   página de spec faltan por tipo) — la FASE 6 la ejecutará.

RESTRICCIONES:
- NO edites lib/prompt-builder.ts en esta fase (es solo auditoría).
- NO tocar las 6 categorías originales salvo para corregir un hueco documentado.
- El pack es "acabado premium" y mobile-first: el criterio de revisión es que cada
  chat del pack asuma el contexto correcto del tipo detectado.

VALIDACIÓN:
- npx tsc --noEmit (sin errores nuevos) · npm run prompt:preview (solo inspección)

OUTPUT ESPERADO: tabla de huecos del pack (RF faltantes + data model faltantes +
spec por vertical/N5) lista para implementar en la FASE 6.
```

---

## FASE 6 · Agregar al pack lo que falta ⭐⭐⭐

**Rol:** Prompt Engineer + Solutions/Enterprise Architect

```text
Actúa como Prompt Engineer + Solutions/Enterprise Architect del "Bot Cotizador
Alex". Objetivo: IMPLEMENTAR los huecos que documentó la FASE 5 para que el prompt
técnico (pack de 20-26 chats) refleje las features de ecommerce-pro, verticales N4
y ecosistema N5, y el multilingüe. Usa la tabla de huecos de la FASE 5 como checklist.

TAREAS (en este orden, todo en lib/prompt-builder.ts):
1. buildFunctionalRequirements(): añade los RF que faltan, respetando el patrón de
   "solo si la señal está activa" (como los RF-04..RF-14 existentes) y que NO
   inflen categorías que no corresponden:
   - multilingüe → "Versión en inglés y español (i18n) con selector de idioma y SEO
     hreflang" (si si(ctx.multilingue)).
   - ecommerce-pro → 1 RF por feature pro (solo si category==="ecommerce" y la
     señal activa): inventario avanzado, reportes de ventas, facturación CFDI,
     multi-vendedor interno.
   - verticales N4 → 1 RF por feature de la vertical (solo si category==="webapp"
     y ctx.<vertical>): p. ej. inmobiliaria "Filtros por zona/precio + formulario
     de interés por propiedad (leads)", membresías "Cobro recurrente (Stripe) +
     área privada + gestión de planes", cursos "Lecciones en video + progreso +
     certificados + foros", telemedicina "Expediente digital + videollamada +
     recetas", directorio "Fichas autogestionables + búsqueda/mapa + ficha premium".
   - ecosistema N5 → 1 RF por feature N5 (solo si category==="webapp" y la señal
     activa): split de pagos/escrow, multi-tenant, planes/billing, API pública,
     módulos ERP (compras/ventas/almacén/nómina), integración contable, reportes
     ejecutivos. Para N5 añade un RF extra: "El proyecto se cotiza con propuesta
     formal detallada (alcance por módulos) — el pack NO debe fijar un precio
     cerrado" (refuerza la regla del bot).
2. Spec de webapp (pages/dataModel/userFlow): enriquece la entrada webapp con
   páginas, tablas y flujos por vertical y N5 (SIN romper el caso genérico). Sigue
   el formato actual: pages[], dataModel[] (convención "col tipo" de
   dataModelSql), userFlow[] e integrations[]. Los sketches alimentan
   dataModelSql() para el CHAT de modelo de datos (CHAT ${phases.datos}).
3. buildDataModelSql()/dataModelSql(): verifica que los sketches nuevos se
   conviertan a CREATE TABLE correctos (la convención ya descarta "..." y maneja
   "slug unique"/"detalle jsonb"/"fk"). Corrige si un sketch nuevo rompe el parseo.
4. Verifica que la fila "TIPO DE PÁGINA:" (buildTipoPagina) y el brief
   (resolveBrief → VERTICAL_BRIEFS) ya cubren los tipos N4/N5; si algún vertical
   no tiene TIPO_LABEL/buildTipoPagina, añádelo.
5. Regenera los packs: npx tsx scripts/generate-pack-samples.ts → 18 PACK-*.md.
   Añade escenarios nuevos si el script no cubre algún tipo que tocaste (sigue el
   patrón de los existentes).
6. Verifica la coherencia de precios del pack (regla #7): el "Presupuesto estimado"
   cita el total del motor (min==max → un solo valor), NUNCA un rango que
   contradiga UI/PDF.

RESTRICCIONES:
- El pack es "acabado premium" y mobile-first: no degradar los estándares actuales.
- Las features verticales/N5 en RF SOLO para webapp con la señal activa (no inflan
  otras categorías ni el webapp genérico).
- OJO esbuild: NO mezclar `??` con `||` sin paréntesis (error de TRANSFORM que
  get_errors no ve). OJO interpolación: dentro de ${bullets([...])}, los elementos
  con ${phases.X} van con backtick PLANO (delimitador), no con \`.
- OJO: al editar template literals grandes, validar con `npx tsc --noEmit
  lib/prompt-builder.ts` y `grep -c '\\`' <output>` = 0 (sin artefactos de backslash).

VALIDACIÓN:
- npx tsc --noEmit lib/prompt-builder.ts (sin errores nuevos de lib/)
- npx tsx scripts/generate-pack-samples.ts (18 packs regenerados)
- npm run prompt:preview (inspección visual: TIPO DE PÁGINA + RF nuevos presentes)
- npm run test:regression · npm run test:eval (sin regresiones)
- grep "CHAT undefined" docs/prompts/ = 0

OUTPUT ESPERADO: buildFunctionalRequirements con RF de multilingüe/pro/N4/N5, spec
webapp ampliado por vertical y N5, data model por vertical/N5, packs regenerados
coherentes con regla #7, y el reporte de qué se agregó en cada función.
```

---

## FASE 7 · Validación integral + documentación

**Rol:** QA Lead + CEO/CTO

```text
Actúa como QA Lead y CEO/CTO del proyecto. Objetivo: validar que el bot funciona
perfecto con el nuevo flujo (cobertura de personas total) y que el prompt técnico
refleja la cartera completa, y dejar el repo documentado.

TAREAS:
1. Validación integral:
   - npm run test:regression  (417 + QA11, 0 fallos)
   - npm run test:eval        (30 personas, 11/11 + 5 verticales + 3 ecosistemas,
                               0 fallos, 0 warnings)
   - npm run test:eval:llm    (opcional, ~$0.05/corrida, con DEEPSEEK_API_KEY:
                               correr las personas nuevas 24-30 para validar que el
                               LLM pinta bien los turnos de las categorías nuevas)
   - npm run lint             (0 errores)
   - npx tsc --noEmit         (solo errores preexistentes de negotiation-agent.ts)
   - npm run prompt:preview   y  npm run quote:preview
2. Coherencia de precios (regla #7): con un script temporal en scripts-tmp/
   (BORRAR al terminar) verifica que para las 11 categorías + verticales + N5 el
   total del motor (calcularTotalDeterminista) coincide con buildFallbackProposal.
   precio_min y con la fila "Presupuesto estimado" del pack. Corrige en la fuente
   de verdad, nunca en componentes.
3. Actualiza AGENTS.md: §0 (eval 30 personas / cobertura total), §2 (test:eval),
   §5 (prompt-builder con RF por vertical/N5), §11 si hace falta. Mantén el §0 al día.
4. Actualiza docs/IMPLEMENTACION_CARTERA_ROO.md SOLO si un precio/keyword cambió
   durante estas fases (que el doc refleje el código, no al revés).
5. Lista de pendientes: documenta en el chat (y en la memoria del repo) qué quedó
   pendiente (p. ej. si el --llm reveló deriva del LLM en alguna categoría nueva,
   qué se medirá en el dashboard: MRR, attach, churn).

RESTRICCIONES:
- Si un test falla, NO lo "arregles" debilitando el assert: corrige la causa raíz
  (keyword, condición o precio en la fuente de verdad).
- No dejar scripts temporales en el repo (borra scripts-tmp/ al terminar).
- No tocar prospecting/closing/negotiation-agent.ts.

OUTPUT ESPERADO: todos los tests verdes (30 personas / 11-11 + 5 + 3), packs
coherentes con la cartera, AGENTS.md y docs actualizados, y un resumen ejecutivo
(2-3 frases) del estado final: qué detecta y cotiza el bot, qué cubre el pack, y
próximos pasos.
```

---

## 2. Anexo · Cheat-sheet de comandos y reglas

### Comandos de validación

| Comando                                    | Qué valida                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `npm run test:regression`                  | Motor determinista (417 asserts + QA11 + personas nuevas)        |
| `npm run test:eval`                        | Personas + cobertura (23 → 30, 0 tokens)                         |
| `npm run test:eval:llm`                    | test:eval + DeepSeek real y LLM-as-judge (~$0.05/corrida)        |
| `npm run lint`                             | ESLint (Next)                                                    |
| `npx tsc --noEmit`                         | Type-check (solo errores preexistentes de negotiation-agent.ts)  |
| `npm run prompt:preview`                   | Previsualiza el pack técnico (inspección de TIPO DE PÁGINA y RF) |
| `npm run quote:preview`                    | Previsualiza el PDF de cotización                                |
| `npx tsx scripts/generate-pack-samples.ts` | Regenera los PACK-\*.md de docs/prompts/                         |

### Reglas críticas (resumen de AGENTS.md)

1. **Precio único** (`calcularTotalDeterminista()`) en UI/PDF/copy/pack — regla #7.
2. **No `next build` con `next dev` activo** (corrompe `.next` → `rm -rf .next`).
3. **Keywords con palabra completa + negación consciente** (`isNegated`).
4. **Todo nodo con `condition` devuelve su `next` ante respuesta vacía** (el skip
   llama `nextNode("", ctx)`).
5. **No tocar `prospecting/closing/negotiation-agent.ts`** (roto, preexistente).
6. **Patrón de personas en eval**: presupuesto con fecha reconocible ("para el
   próximo mes"), evitar "sus" en neutras, bots con keywords de `BOT_CHIP_VALUES`.
7. **Validar tests al terminar cada fase** antes de pasar a la siguiente.

### Definition of Done por persona nueva en eval

- [ ] Persona realista (con "no sé"/delegación donde aplique) y `expectedCategory`
      correcta.
- [ ] `expectsVertical`/`expectsEcosystem`/`expectsBots`/`expectsProFeatures`
      cuando aplique.
- [ ] Flujo cierra sin nodos redundantes ni ciclos de clarificación, discovery ≤
      `maxAsked`.
- [ ] Email + teléfono + presupuesto limpios (asserts estándar).
- [ ] eval 0 warnings (sin deriva de tema ni promesa de monto en fallback).
- [ ] Regresión sin regresiones y lint limpio.

### Definition of Done por hueco del pack (FASE 6)

- [ ] RF añadido en `buildFunctionalRequirements` SOLO si la señal está activa.
- [ ] Spec de webapp ampliado por vertical/N5 (pages/dataModel/userFlow).
- [ ] `dataModelSql` convierte los sketches nuevos a CREATE TABLE válidos.
- [ ] `TIPO DE PÁGINA:` y brief (`resolveBrief`) nombran el tipo N4/N5.
- [ ] Packs regenerados (18) sin "CHAT undefined" ni rangos contradictorios.
- [ ] `npx tsc --noEmit lib/prompt-builder.ts` + `grep '\\`'` = 0.
