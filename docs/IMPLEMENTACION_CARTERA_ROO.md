# 🧭 Plan de Implementación por Fases · Roo Code + DeepSeek

## Cartera completa de 28 tipos de página · Agencia Vibecoder

> **Documento ejecutivo del CEO / Director General / AI Strategist** — v1.0 · ago 2026
>
> **Qué es:** un **pack de prompts por fases y roles** para que Roo Code + DeepSeek
> implementen **poco a poco** la evaluación de mercado
> (`docs/MERCADO_PAGINAS_VIBECODER.md`) dentro del bot cotizador "Alex": ampliar la
> detección, los precios, los giros, los bots y el pack técnico hasta cubrir la
> cartera completa (del menú QR al ERP).
>
> **Cómo se usa:** cada fase es un **prompt autocontenido** para **un chat NUEVO de
> Roo Code**. Se copia completo, se pega, se deja trabajar y se valida antes de pasar
> a la siguiente. El orden importa: cada fase construye sobre la anterior.

---

## 0. Reglas globales (aplica en TODAS las fases)

1. **Lee primero `AGENTS.md`** (§0 estado de la rama, §11 "tareas → dónde tocar") y
   `docs/MERCADO_PAGINAS_VIBECODER.md` (§5 detalle por tipo, §6 mapa de archivos).
2. **Regla #7 (precio único):** UI, PDF, copy y fallback citan el MISMO total, siempre
   vía `calcularTotalDeterminista()` en `lib/quote-engine.ts`. **Nunca** hardcodear
   montos en componentes, copys ni prompts.
3. **No rompas lo que ya funciona:** el bot cotiza hoy 6 categorías (landing, ecommerce,
   citas, webapp, blog, portafolio) validadas con `npm run test:eval` (15 personas,
   cobertura 6/6) y `npm run test:regression` (346 asserts). Toda adición debe pasar
   ambos sin regresiones.
4. **Keywords con palabra completa** (regex con límites, no subcadena: "WhatsApp" no
   contiene "app") y **conscientes de negación** (`isNegated`: "no quiero menú digital"
   no activa la señal). Reglas 5-6 de `AGENTS.md`.
5. **El LLM pinta, la máquina decide:** los cambios de detección van en la máquina de
   estados (`conversation-flow.ts`/`pricing-catalog.ts`), no en el texto del LLM.
6. **Validar SIEMPRE al terminar una fase:** `npm run test:regression`,
   `npm run test:eval`, `npm run lint`. Y **no correr `next build` con `next dev`
   activo** en el mismo workspace (corrompe `.next`).
7. **No tocar `prospecting/closing/negotiation-agent.ts`** (roto, preexistente — §0 de
   AGENTS.md). Los errores de tsc de ese archivo no son tuyos.

---

## 1. Mapa de fases (resumen)

| Fase | Rol (sombrero)                | Contenido                                                                         | Prioridad | Archivos clave                                     |
| ---- | ----------------------------- | --------------------------------------------------------------------------------- | --------- | -------------------------------------------------- |
| 0    | QA Engineer                   | Auditoría base + línea de partida                                                 | —         | (lectura + tests)                                  |
| 1    | Backend Engineer + Bot Tester | Nivel 0-1 · Entrada (menú QR, tarjeta, link-in-bio, cotizador)                    | ⭐⭐⭐    | pricing-catalog, agency-catalog, conversation-flow |
| 2    | Conversation Designer         | Nivel 2 · Negocio (corporativo, multilingüe, PWA, reservas)                       | ⭐⭐      | conversation-flow, chat-llm, pricing-catalog       |
| 3    | E-commerce Specialist         | Nivel 3 · Venta (ecommerce-pro, reservas con pago)                                | ⭐⭐      | pricing-catalog, agency-catalog, bots-catalog      |
| 4    | Solutions Architect           | Nivel 4 · Plataforma (inmobiliaria, membresías, cursos, telemedicina, directorio) | ⭐        | pricing-catalog, industry-pricing                  |
| 5    | Enterprise Architect          | Nivel 5 · Ecosistema (marketplace, SaaS, ERP — cotización formal)                 | ⭐        | agency-catalog, propuesta formal                   |
| 6    | AI Strategist                 | Cross-sell de bots por giro ampliado                                              | ⭐⭐⭐    | bots-catalog, conversation-flow                    |
| 7    | Prompt Engineer               | Pack técnico por tipo nuevo (`CATEGORY_BRIEFS`)                                   | ⭐⭐      | prompt-builder                                     |
| 8    | QA Lead + CEO                 | Validación integral + actualizar AGENTS.md                                        | —         | AGENTS.md, docs, tests                             |

---

## FASE 0 · Auditoría base

**Rol:** QA Engineer / Data Analyst

```text
Actúa como QA Engineer senior del proyecto "Bot Cotizador Alex" (Next.js 14 + TS
estricto). Objetivo: establecer la LÍNEA DE PARTIDA antes de ampliar la cartera.

TAREAS:
1. Lee AGENTS.md (§0 estado de la rama) y docs/MERCADO_PAGINAS_VIBECODER.md (§5-§6).
2. Verifica que el repo compila y los tests verdes:
   - npm run test:regression   (debe dar ~346 asserts OK)
   - npm run test:eval         (debe dar 15 personas, 273 asserts, 0 warnings)
   - npm run lint              (0 errores)
   - npx tsc --noEmit          (solo deben existir los errores preexistentes de
                                prospecting/closing/negotiation-agent.ts)
3. Lista las 6 categorías actuales de lib/pricing-catalog.ts (PRICING_CATALOG) y los
   18 tipos de lib/agency-catalog.ts (AGENCY_WEB_TYPES). Compara con los 28 tipos del
   doc de mercado y devuelve la lista exacta de: ✅ ya detecta el motor / 🔶 en
   agency-catalog pero SIN detección / 🆕 propuesto nuevo.
4. Documenta en /tmp o en un comentario breve del chat el estado de cada categoría
   (base por nivel, features, keywords) para que las fases siguientes lo usen.

RESTRICCIONES: NO modifiques código todavía. Solo lectura y medición.

OUTPUT ESPERADO:
- Tabla con el estado de las 6 categorías del motor (categoría → base b/p/a → features).
- Lista de brechas: qué tipos del mercado NO detecta el motor hoy.
- Confirmación de que los tests pasan (o los fallos exactos si no).
```

---

## FASE 1 · Nivel 0-1 · Productos de entrada ⭐⭐⭐

**Rol:** Backend Engineer + Bot Tester

```text
Actúa como Backend Engineer + QA Bot Tester del "Bot Cotizador Alex". Objetivo:
enseñarle al bot a DETECTAR y COTIZAR los productos de entrada del mercado: menú
digital con QR, tarjeta digital/minisitio, link-in-bio premium y cotizador en línea
(flagship de la agencia). Basado en docs/MERCADO_PAGINAS_VIBECODER.md §5 (niveles 0-1).

CONTEXTO: hoy inferCategory() solo detecta 6 categorías. Menú QR y tarjeta ya existen
en AGENCY_WEB_TYPES pero el motor no los detecta (inferCategory no los mapea); link-in-
bio y cotizador son nuevos.

TAREAS (en este orden):
1. lib/pricing-catalog.ts:
   a. Añade la categoría "menu_digital" a PRICING_CATALOG con base
      { basico: 3500, profesional: 6000, avanzado: 9000 }, tiempo 2-4/3-6/5-8 días,
      features modulares (promociones +800, pedido por WhatsApp +1000, multi-idioma
      +1500) y stack [Next.js, Tailwind, Vercel]. `categoriaBase` → "landing" NO: debe
      ser su propia categoría (su base es menor que landing).
   b. Añade "tarjeta_digital" (base {3500,6000,9000}; features: WhatsApp +500, mapa
      +800, galería +1000).
   c. Añade "link_in_bio" (base {2500,4500,7000}; features: QR +500, mini-catálogo
      +1000).
   d. Añade "cotizador" (base {15000,25000,40000}; features: formulario multi-paso
      +3000, cálculo automático +3500, PDF de cotización +2000, notificación WhatsApp
      +1500). `categoriaBase` → "webapp" NO: el cotizador es un producto propio.
   e. Amplía las keywords de "landing" con las de entrada ("menú", "carta",
      "tarjeta digital", "link", "me encuentren", etc.) SOLO si no colisionan con las
      nuevas categorías (menú/carta deben favorecer a menu_digital).
2. lib/agency-catalog.ts: asegura que AGENCY_WEB_TYPES tenga los 4 tipos con su
   `precioDesde` correcto (3500 / 4500 / 2500 / 15000) y `categoriaBase` apuntando a
   las nuevas categorías.
3. lib/conversation-flow.ts:
   a. Añade las señales a SIGNAL_PATTERNS/NEGATIVE_SIGNAL_PATTERNS para menu_digital,
      tarjeta_digital, link_in_bio y cotizador (conscientes de negación).
   b. En recommendedFeatures() añade las recomendaciones por estas categorías.
   c. En quickRepliesFor() de technical_bots, para restaurante sugiere el bot FAQ +
      la opción "menú digital" como escalera.
4. lib/chat-llm.ts: añade TURN_GOALS para los nodos que toquen estas categorías
   (que el LLM hable de "menú con código QR" / "tarjeta digital" sin prometer montos).
5. PRUEBAS: añade 2 personas nuevas a scripts/eval.ts (PERSONAS): una restaurante que
   pide "menú con código QR para que escaneen y vean mi carta" (expectedCategory:
   "menu_digital") y una de servicios que pide "una tarjeta digital para compartir mi
   información por WhatsApp" (expectedCategory: "tarjeta_digital").

RESTRICCIONES:
- No romper las 15 personas existentes ni las 6 categorías (corre test:eval).
- "menú"/"carta" sueltos NO deben activar ecommerce ni landing: deben favorecer a
  menu_digital solo con señales de restaurante/comida (giro vía detectarGiro).
- Total exacto vía calcularTotalDeterminista(): si creas categoría nueva, derívala en
  quote-engine (derivarTipoWeb) o mapea a una existente sin inflar.
- Los niveles básico/profesional/avanzado deben existir en las 4 categorías nuevas.

VALIDACIÓN:
- npm run test:regression  (346 asserts + nuevos, sin regresiones)
- npm run test:eval        (15 + 2 personas, 0 warnings, cobertura 6/6 + nuevas)
- npm run lint
- npx tsc --noEmit         (sin errores nuevos)

OUTPUT ESPERADO: 4 categorías nuevas detectables y cotizables, 2 personas nuevas en
eval, y un reporte corto de qué se tocó en cada archivo.
```

---

## FASE 2 · Nivel 2 · Negocio ⭐⭐

**Rol:** Conversation Designer

```text
Actúa como Conversation Designer + Ingeniero del "Bot Cotizador Alex". Objetivo:
enseñarle al bot a detectar y cotizar los productos de NEGOCIO del nivel 2: sitio
corporativo, sitio multilingüe, PWA instalable y reservas de restaurante (como
producto, no solo como feature). Basado en docs/MERCADO_PAGINAS_VIBECODER.md §5.

CONTEXTO: "corporativo", "multilingue", "pwa_app" y "reservas_restaurante" ya existen
en AGENCY_WEB_TYPES pero el motor no los detecta como categorías propias (se cotizan
como landing/citas). El objetivo NO es crear 4 categorías nuevas del motor si rompen
el flujo: evalúa y decide por tipo si merece categoría propia o basta mapeo + features.

TAREAS:
1. Diagnóstico (lee lib/pricing-catalog.ts y lib/conversation-flow.ts):
   - corporativo: hoy cae en landing. Decide: ¿categoría "corporativo" con base
     {15000,25000,40000} o se queda como landing + features "multi-página"?
   - reservas_restaurante: hoy cae en citas (base 15000). Es correcto; añade features
     propias de restaurante (pago para grupos, integración con menú QR, recordatorios).
   - multilingue y pwa_app: son features (multilingue 3000 en landing, pwa 3000-4000).
     NO crear categorías; asegurar que se ofrecen como feature en el flujo actual.
2. lib/conversation-flow.ts:
   a. Si creas "corporativo": añade keywords (empresa, nosotros, equipo, quienes somos,
      despacho, constructora, "varias secciones", "más de una página") a inferCategory
      con palabra completa, y maneja el conflicto con "landing" (empates → landing).
   b. SIGNAL_PATTERNS: añade "reservar mesa/reservaciones/apartar mesa" → señales de
      reservas; "en inglés y español/bilingüe/turistas" → multilingue; "como app/
      instalar en el celular" → pwa.
   c. quickRepliesFor: para restaurante añade chip "menú digital + reservas".
   d. buildRecap: si se detectó nivel 2, el recap debe decir el tipo (ej. "sistema de
      reservas para tu restaurante") para que el cliente confirme.
3. lib/chat-llm.ts: TURN_GOALS coherentes con las decisiones anteriores.
4. lib/industry-pricing.ts: si hace falta, ajusta el presupuesto del giro "restaurante"
   para que el clamp no rompa las reservas ($12,000-30,000 ya está bien: valida).
5. PRUEBAS: añade 1 persona a scripts/eval.ts: una empresa que pide "una página para
   mi constructora con quienes somos, proyectos y contacto, varias secciones"
   (expectedCategory: "corporativo" o "landing" según tu decisión, y 1 persona de
   restaurante que pide "que tomen reservas de mesa" (expectedCategory: "citas").

RESTRICCIONES:
- Mantén el flujo consolidado (technical_bundle, budget fusionado, contact_name con 3
  datos): NO regresiones de flujo.
- No dupliques features que ya existen (pwa y multilingue ya están en varias categorías).
- Precio único vía calcularTotalDeterminista().

VALIDACIÓN: npm run test:regression · npm run test:eval · npm run lint · npx tsc --noEmit.

OUTPUT ESPERADO: decisiones documentadas por tipo (categoría propia vs. feature),
cambios aplicados y personas nuevas en eval pasando.
```

---

## FASE 3 · Nivel 3 · Venta ⭐⭐

**Rol:** E-commerce Specialist

```text
Actúa como E-commerce Specialist del "Bot Cotizador Alex". Objetivo: cubrir el nivel
3 de venta: e-commerce pro (cuentas + panel + facturación) y reservas con pago por
adelantado. El e-commerce básico YA existe; aquí se añade el escalón premium y el pago
al reservar.

CONTEXTO: ecommerce ya cotiza (base 20000/35000/60000) con features pagos, cuentas,
panel, envíos, facturación, SEO, PWA. "ecommerce_pro" y "reservas con pago" son
escalones superiores (desde 28000 y 18000 en el doc de mercado).

TAREAS:
1. lib/pricing-catalog.ts (ecommerce):
   a. Revisa que las features de ecommerce cubran el "pro": inventario avanzado
      (+6000), reportes de ventas (+4000), facturación CFDI (+5000), multi-vendedor
      interno (+8000). Si falta alguna, añádela al catálogo (id única, labelCliente en
      lenguaje de dueño de negocio, precio).
   b. Asegura que inferNivel() con muchas features activas llegue a "avanzado"
      (base 60000) — el "pro" se cotiza por features acumuladas, no con categoría
      duplicada.
   c. Keywords: añade señales de "inventario/reportes de venta/facturar/mayoreo/
      varios vendedores" que suban el nivel sin degradar ecommerce.
2. lib/pricing-catalog.ts (citas / reservas con pago):
   a. La feature "pagos" de citas (+6000) ya cubre el "pago por adelantado". Verifica
      que el copy lo comunique ("pagan al reservar para no perder la cita").
   b. Añade feature "política de cancelación" (+1500) si no existe.
3. lib/bots-catalog.ts: detectarBotsRecomendados para ecommerce ya sugiere
   bot_dudas/bot_ventas. Verifica que para citas con pago sugiera bot_citas (ya debe).
4. lib/conversation-flow.ts: SIGNAL_PATTERNS para "anticipo", "no show", "que no me
   fallen las citas", "reservar y pagar" → marcan pagos=true en citas.
5. PRUEBAS: añade 1 persona a scripts/eval.ts: una tienda que quiere "vender por
   internet con carrito y pagos, y administrar inventario y facturar"
   (expectedCategory: "ecommerce") y valida que las features pro se activen.

RESTRICCIONES:
- No crear categorías "ecommerce_pro" duplicadas: usa features + nivel avanzado.
- "tienda de ropa que solo quiere que la encuentren" sigue siendo LANDING (no
  ecommerce): no ampliar las keywords de ecommerce a "tienda" suelto.
- Precio único vía calcularTotalDeterminista().

VALIDACIÓN: npm run test:regression · npm run test:eval · npm run lint · npx tsc --noEmit.

OUTPUT ESPERADO: features pro añadidas al catálogo, señales nuevas, persona nueva en
eval, y confirmación de que el ticket "pro" se alcanza por features (no inflando base).
```

---

## FASE 4 · Nivel 4 · Plataforma ⭐

**Rol:** Solutions Architect

```text
Actúa como Solutions Architect del "Bot Cotizador Alex". Objetivo: cubrir el nivel 4
de plataforma: portal inmobiliario, portal de membresías, plataforma de cursos online,
portal de citas para salud (telemedicina) y directorio. Son proyectos de ticket alto
que hoy no se detectan ni se cotizan bien.

CONTEXTO: webapp ya cotiza (base 25000/45000/80000) con features (roles, panel, PDFs,
pagos, mensajería, mapas, SEO, PWA). Los 5 tipos de este nivel son casos de webapp con
necesidades específicas. Estrategia recomendada: NO crear 5 categorías nuevas del
motor; en su lugar:
  - Añadir keywords específicas a inferCategory que los detecten y devuelvan "webapp",
  - Añadir features específicas al catálogo de webapp (expediente paciente, videollamada,
    cobro recurrente, lecciones en video, progreso, certificado, filtros por zona/precio,
    leads por propiedad, fichas autogestionables, comisiones),
  - Subir el nivel vía features (inferNivel).

TAREAS:
1. lib/pricing-catalog.ts (webapp):
   a. Añade features específicas por vertical (cada una con id única, labelCliente,
      precio del doc de mercado §5):
      - inmobiliaria: filtros por zona/precio (+4000), leads por propiedad (+3500),
        panel de publicación (+5000)
      - membresías: cobro recurrente Stripe (+6000), área privada (+4500), gestión de
        planes (+4000), reportes de retención (+3000)
      - cursos: lecciones en video (+5000), progreso del alumno (+3500), certificado
        (+2500), comunidad/foros (+5000)
      - telemedicina: expediente del paciente (+6000), videollamada (+8000), recetas
        (+3000)
      - directorio: fichas autogestionables (+5000), búsqueda y mapa (+3500), pagos por
        ficha premium (+6000)
   b. Keywords en inferCategory para que "propiedades/casas/departamentos/inmobiliaria"
      → webapp; "membresía/suscripción/pago recurrente/gimnasio" → webapp; "curso/
      clases en línea/alumnos/lecciones" → webapp; "expediente/pacientes/telemedicina/
      videollamada" → webapp; "directorio/listado de negocios/asociación" → webapp.
      Con palabra completa y sin romper los casos actuales (revisa que "cita(s)" siga
      dando citas y "blog/noticias" siga dando blog).
2. lib/industry-pricing.ts: verifica que los giros nuevos (inmobiliaria ya existe,
   gimnasio/academia existe, coach/instructor existe, clínica existe) tengan
   presupuestos que no rompan el clamp de estos tickets (inmobiliaria [25000,70000],
   gimnasio [10000,28000]).
3. lib/agency-catalog.ts: confirma los `precioDesde` de inmobiliaria (25000),
   membresías (28000), cursos (30000), telemedicina (26000), directorio (22000) con
   `categoriaBase: "webapp"` (o el id que decidas).
4. lib/bots-catalog.ts: en detectarBotsRecomendados asegura:
   - inmobiliaria → bot_ventas + bot_leads
   - gimnasio/academia → bot_membresias + bot_leads
   - coach/instructor → bot_membresias + bot_ventas
   - clínica/consultorio → bot_citas + bot_faq
5. PRUEBAS: añade 2 personas a scripts/eval.ts: una inmobiliaria que quiere "un portal
   con propiedades, filtros y que cada propiedad genere leads" (expectedCategory:
   "webapp") y un gimnasio que quiere "membresías con cobro recurrente y área de
   miembros" (expectedCategory: "webapp").

RESTRICCIONES:
- Respetar resolverCategoria(): si el cliente rechaza panel/BD/login, webapp se
  degrada a landing. NO romper esa lógica.
- Los features nuevos no deben inflar el fallback si el cliente no los pidió.
- Precio único vía calcularTotalDeterminista().

VALIDACIÓN: npm run test:regression · npm run test:eval · npm run lint · npx tsc --noEmit.

OUTPUT ESPERADO: webapp con features por vertical y keywords ampliadas, 2 personas
nuevas en eval, y documentación de qué vertical se detecta con qué señales.
```

---

## FASE 5 · Nivel 5 · Ecosistema ⭐

**Rol:** Enterprise Architect

```text
Actúa como Enterprise Architect del "Bot Cotizador Alex". Objetivo: cubrir el nivel 5
de ecosistema: marketplace multi-vendedor, marketplace con split de pagos, SaaS
multi-tenant B2B y ERP/CRM a medida. Son proyectos de $40,000-$90,000+.

DECISIÓN ESTRATÉGICA (importante): estos proyectos NO deben cotizarse a ciegas por el
bot. El bot debe:
  1) DETECTAR la intención (keywords → webapp con nivel avanzado),
  2) COTIZAR un "desde" honesto (precioDesde del doc de mercado),
  3) Y en el copy/recap indicar que "estos proyectos se cotizan con una propuesta
     formal detallada" (el bot califica, no cierra a ciegas).

TAREAS:
1. lib/pricing-catalog.ts (webapp):
   a. Añade features de nivel 5: split de pagos/escrow (+12000), multi-tenant/
      aislamiento (+15000), planes y billing (+10000), API pública (+10000), módulos
      ERP (compras/ventas/almacén/nómina) (+12000 c/u), integraciones contables
      (+15000), reportes ejecutivos (+10000).
   b. Keywords: "marketplace/varios vendedores/comisión por venta" → webapp;
      "software como servicio/saas/plataforma para mis clientes" → webapp;
      "erp/crm/facturación/control de almacén/nómina/logística" → webapp.
2. lib/agency-catalog.ts: precioDesde marketplace (40000), marketplace-split (70000),
   SaaS (60000), ERP (90000) con categoriaBase "webapp".
3. lib/industry-pricing.ts: para giros empresa/negocio (si no existe, crea un giro
   "Empresa / operación" con presupuesto [40000, 150000] tier alto) para que el clamp
   no recorte el ticket.
4. lib/conversation-flow.ts: en extra_comments/buildRecap, si la categoría es webapp y
   se detectaron señales de nivel 5, el recap debe decir "esto es una plataforma a
   medida: te preparo una propuesta formal con alcance detallado".
5. lib/chat-llm.ts: TURN_GOALS que prohíban prometer precio cerrado para nivel 5
   (el LLM debe decir "desde $X, según módulos").
6. PRUEBAS: añade 1 persona a scripts/eval.ts: un emprendedor que quiere "montar un
   marketplace con varios vendedores y cobrar comisión por venta"
   (expectedCategory: "webapp").

RESTRICCIONES:
- No crear categoría "marketplace" separada: es webapp con features de nivel 5.
- El bot NUNCA promete precio exacto cerrado para estos tickets (solo "desde").
- Precio único: el "desde" lo da calcularTotalDeterminista() con base avanzado;
  verifica que no produzca números absurdos para webapp con 6+ features.

VALIDACIÓN: npm run test:regression · npm run test:eval · npm run lint · npx tsc --noEmit.

OUTPUT ESPERADO: webapp ampliada a nivel 5, giro nuevo "Empresa", persona nueva en
eval, y el flujo de "propuesta formal" implementado en el recap/copy.
```

---

## FASE 6 · Cross-sell de bots por giro ⭐⭐⭐

**Rol:** AI Strategist

```text
Actúa como AI Strategist del "Bot Cotizador Alex". Objetivo: maximizar el ingreso
recurrente (MRR) afinando la recomendación de bots por giro y por tipo de página.
Fuente: docs/MERCADO_PAGINAS_VIBECODER.md §6.5.

CONTEXTO: lib/bots-catalog.ts ya tiene 12 bots y detectarBotsRecomendados (máx 3,
reglas 0 LLM). Hoy recomienda por categoría (landing/citas) y por giro. El objetivo es
ampliar la matriz para cubrir los nuevos tipos de las Fases 1-5 y los giros del doc.

TAREAS:
1. lib/bots-catalog.ts (detectarBotsRecomendados):
   a. Amplía/verifica la matriz del doc §6.5:
      - restaurante → bot_faq · bot_citas · bot_recomendador
      - estética/barbería → bot_citas · bot_leads · bot_faq
      - clínica/consultorio → bot_citas · bot_faq · bot_ventas
      - gimnasio/academia → bot_membresias · bot_leads · bot_faq
      - tienda/retail → bot_dudas · bot_ventas · bot_leads
      - inmobiliaria → bot_ventas · bot_leads · bot_faq
      - coach/instructor → bot_membresias · bot_ventas · bot_leads
      - mecánico/servicios → bot_faq · bot_leads · bot_cotizacion
   b. Si la categoría es menu_digital/tarjeta_digital/link_in_bio → bot_faq + bot_leads.
   c. Si la categoría es cotizador → bot_cotizacion (es el mismo producto; no
      recomendarlo como add-on, pero sí bot_faq).
2. lib/conversation-flow.ts (technical_bots / quickRepliesFor):
   a. Verifica que los chips de bots (BOT_CHIP_VALUES) parseen bien con los bots nuevos
      y que "Ninguno" → [] (no romper el regex de rechazo).
   b. Añade al copy del nodo una línea de escalera: tras ofrecer los bots, sugiere el
      siguiente producto de la escalera (ej. restaurante: "y si quieres, en vez de solo
      el menú, podemos agregar que tomen reservas").
3. PRUEBAS: en scripts/regression-test.ts (o eval.ts) valida que para cada giro la
   recomendación sea la esperada y no exceda 3 bots.

RESTRICCIONES:
- Respeta el tope de 3 bots (no abrumar).
- bot_faq NO debe desplazar a bots más valiosos (bot_recomendador, bot_ventas,
  bot_cotizacion) cuando el giro lo amerita — regla aprendida en memoria.
- Los precios de bots NO cambian aquí (están bien calibrados).

VALIDACIÓN: npm run test:regression · npm run test:eval · npm run lint · npx tsc --noEmit.

OUTPUT ESPERADO: matriz de recomendación por giro verificada/ampliada, chips correctos,
y una persona de eval que seleccione los bots recomendados en el nodo technical_bots.
```

---

## FASE 7 · Pack técnico por tipo ⭐⭐

**Rol:** Prompt Engineer

```text
Actúa como Prompt Engineer + Technical Writer del "Bot Cotizador Alex". Objetivo:
ampliar el pack de prompts técnicos para Roo Code (lib/prompt-builder.ts) para que los
tipos nuevos de las Fases 1-5 tengan su brief por giro y el pack sea coherente con la
propuesta y el precio.

CONTEXTO: lib/prompt-builder.ts genera el pack de 20-26 prompts (fases ⭐ obligatorias
/ ✨ opcionales) usando CATEGORY_BRIEFS (rol líder, conversión #1, criterios de éxito,
riesgos) y buildCompactContext. El pack se regenera con scripts/generate-pack-samples.ts
→ docs/prompts/PACK-*.md.

TAREAS:
1. lib/prompt-builder.ts (CATEGORY_BRIEFS):
   a. Añade/verifica briefs para: menu_digital (restaurante), tarjeta_digital,
      link_in_bio, cotizador (flagship), corporativo, reservas_restaurante,
      ecommerce-pro, inmobiliaria, membresías, cursos, telemedicina, directorio,
      marketplace, SaaS, ERP.
   b. Cada brief: leadRole (rol que conduce el proyecto), primaryGoal (conversión #1),
      successCriteria (qué define éxito) y risks (riesgos del giro). En lenguaje de
      dueño de negocio, sin prometer precios.
2. buildCompactContext: añade una línea que nombre el tipo de página detectado
   (ej. "Tipo: menú digital con QR para restaurante") para que cada chat del pack
   asuma el contexto correcto.
3. Regenera los packs: npx tsx scripts/generate-pack-samples.ts (genera los PACK-*.md
   de los escenarios que cubre el script). Si un tipo nuevo no está en el script,
   añade su escenario siguiendo el patrón existente.
4. Verifica que el pack no cita montos contradictorios (regla #7): el pack habla de
   alcance, no de precios; los precios viven en UI/PDF.

RESTRICCIONES:
- El pack es "acabado premium" y mobile-first: no degradar los estándares actuales.
- NO tocar las 6 categorías existentes (landing/citas/ecommerce) salvo para corregir.
- Los packs generados deben verse en docs/prompts/ y compilar con tsc.

VALIDACIÓN:
- npx tsc --noEmit lib/prompt-builder.ts
- npx tsx scripts/generate-pack-samples.ts
- npm run prompt:preview
- npm run test:regression

OUTPUT ESPERADO: CATEGORY_BRIEFS ampliado, packs regenerados con los tipos nuevos y
sin contradicciones de precio.
```

---

## FASE 8 · Validación integral + documentación

**Rol:** QA Lead + CEO

```text
Actúa como QA Lead y CEO del proyecto. Objetivo: validar que toda la cartera (28
tipos) se cotiza de forma coherente y dejar el repo documentado para la siguiente
iteración.

TAREAS:
1. Validación integral:
   - npm run test:regression  (346 asserts + todas las personas nuevas)
   - npm run test:eval        (15 personas originales + las nuevas, 0 warnings)
   - npm run test:eval:llm    (opcional, ~$0.05/corrida, con DEEPSEEK_API_KEY)
   - npm run lint
   - npx tsc --noEmit         (solo errores preexistentes de negotiation-agent.ts)
   - npm run prompt:preview   y  npm run quote:preview
2. Coherencia de precios (regla #7): abre una corrida de cada nueva categoría en el
   navegador (o con un script temporal en scripts-tmp/) y verifica que UI, PDF, copy y
   prompt citan el MISMO total. Corrige discrepancias en la fuente de verdad, nunca en
   los componentes.
3. Actualiza AGENTS.md: añade/actualiza en §4/§5/§11 las categorías nuevas, los tipos
   de la agencia y las tareas → archivos. Mantén el §0 de estado de la rama al día.
4. Actualiza docs/MERCADO_PAGINAS_VIBECODER.md si algún precio/keyword cambió durante
   la implementación (que el doc refleje el código, no al revés).
5. Lista de pendientes: documenta en un comentario del chat qué tipos quedaron como
   "venta manual" (nivel 5) y qué se medirá en el dashboard (MRR, attach, churn).

RESTRICCIONES:
- Si un test falla, NO lo "arregles" debilitando el assert: corrige la causa raíz
  (normalmente una keyword o un precio en la fuente de verdad).
- No dejar scripts temporales en el repo (borra scripts-tmp/ al terminar).

OUTPUT ESPERADO: todos los tests verdes, AGENTS.md y los docs actualizados, y un
resumen ejecutivo (2-3 frases) del estado final de la cartera: qué detecta el bot,
qué queda manual, y próximos pasos.
```

---

## 2. Anexo · Cheat-sheet de comandos y reglas

### Comandos de validación

| Comando                                    | Qué valida                                                      |
| ------------------------------------------ | --------------------------------------------------------------- |
| `npm run test:regression`                  | Motor determinista del bot (346 asserts + nuevas personas)      |
| `npm run test:eval`                        | Personas + cobertura de categorías (15 + nuevas, 0 tokens)      |
| `npm run test:eval:llm`                    | test:eval + DeepSeek real y LLM-as-judge (~$0.05/corrida)       |
| `npm run lint`                             | ESLint (Next)                                                   |
| `npx tsc --noEmit`                         | Type-check (solo errores preexistentes de negotiation-agent.ts) |
| `npm run prompt:preview`                   | Previsualiza el pack técnico                                    |
| `npm run quote:preview`                    | Previsualiza el PDF de cotización                               |
| `npx tsx scripts/generate-pack-samples.ts` | Regenera los PACK-\*.md de docs/prompts/                        |

### Reglas críticas (resumen de AGENTS.md)

1. **Precio único** (`calcularTotalDeterminista()`) en UI/PDF/copy/prompt — regla #7.
2. **No `next build` con `next dev` activo** (corrompe `.next` → `rm -rf .next`).
3. **Keywords con palabra completa + negación consciente** (`isNegated`).
4. **Todo nodo con `condition` devuelve su `next` ante respuesta vacía** (el skip llama
   `nextNode("", ctx)`).
5. **No tocar `prospecting/closing/negotiation-agent.ts`** (roto, preexistente).
6. **Validar tests al terminar cada fase** antes de pasar a la siguiente.

### Definition of Done por tipo nuevo

- [ ] `precioDesde` + `categoriaBase` en `agency-catalog.ts`.
- [ ] Base por nivel + features en `pricing-catalog.ts` (si aplica).
- [ ] Keywords en `inferCategory` + señales en `conversation-flow.ts` (negación OK).
- [ ] Giro → presupuesto/copy en `industry-pricing.ts` (si es giro nuevo).
- [ ] Bots recomendados en `bots-catalog.ts` (`detectarBotsRecomendados`).
- [ ] Brief en `prompt-builder.ts` (`CATEGORY_BRIEFS`) + pack coherente.
- [ ] Persona nueva en `scripts/eval.ts` y tests verdes.
- [ ] `AGENTS.md` y `docs/MERCADO_PAGINAS_VIBECODER.md` actualizados.
