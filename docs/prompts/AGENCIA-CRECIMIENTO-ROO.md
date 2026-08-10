---
description: >-
  Prompt maestro de crecimiento de la agencia Nexora (roles CEO / CTO / CPO / AI Strategist).
  Plan por FASES para Roo Code + DeepSeek: construye la vitrina de la agencia (sitio de venta),
  la identidad de marca completa y el motor de prospectos, gastando el mínimo de tokens.
version: 1.0.0
alwaysApply: true
---

# 🚀 NEXORA · PLAN DE CRECIMIENTO DE LA AGENCIA (prompt maestro para Roo Code + DeepSeek)

> **LEE ESTE DOCUMENTO ANTES DE EMPEZAR CUALQUIER FASE.** Es el plan ejecutivo (CEO/CTO/CPO/AI Strategist)
> de la agencia. Las decisiones de marca y arquitectura YA están tomadas aquí: **no las re-discutas ni
> las vuelvas a preguntar** (ahorra tokens). Cada fase es un prompt listo para pegar en un **chat NUEVO**
> de Roo Code + DeepSeek, en orden, esperando `FIN_DE_FASE_N` antes de abrir el siguiente chat.

---

## 0. Cómo usar este plan (reglas de ahorro de tokens)

1. **Empieza SIEMPRE aquí.** No explores el repo "por si acaso": el mapa está abajo.
2. **Una fase = un chat nuevo de Roo.** Pega SOLO el bloque `👉 PROMPT FASE N`, espera `FIN_DE_FASE_N`, abre chat nuevo.
3. **No re-decidas lo ya decidido** (§2 Marca y §3 Arquitectura). El modelo debe EJECUTAR, no deliberar.
4. Cada fase cita **exactamente qué archivos tocar** → el agente no escanea el repo completo.
5. Antes de afirmar que algo "existe/compila", checa **§1.2 Estado real** — no todos los módulos del
   repo padre están en este checkout (rama `prospecting-wip`).
6. **Fuente de verdad de precios:** SIEMPRE `lib/agency-catalog.ts` (`precioDesde`) y
   `scripts/generate-pack-samples.ts` (`REGISTRO_PACKS`). Nunca hardcodear precios en la UI.

---

## 1. Contexto ejecutivo

### 1.1 Qué somos (CEO)

**Nexora** es una agencia de **webs hechas con IA**: entregamos páginas y plataformas profesionales
en días, no en meses, a precios accesibles para PyMEs y emprendedores en México, con acabado premium
y proceso transparente. Somos **el nexo entre tu negocio y tus clientes**.

**Propuesta de valor:** velocidad de entrega + precio "desde" honesto + calidad profesional + apoyo
de asistentes IA recurrentes (moat DeepSeek: ~90% de margen en la mensualidad).

**Lo que ya existe y funciona (no rehacer):**

- **Bot cotizador "Alex"** (`app/`, `lib/`, motor determinista + DeepSeek): entrevista conversacional
  y genera cotización + pack técnico de 20–26 fases por tipo de web. Es nuestro **producto-demo y
  generador de leads**: cualquiera que entra a la vitrina puede cotizar su web en minutos.
- **Cartera de 28 tipos de web** (`lib/agency-catalog.ts`) con 11 categorías del motor, 5 verticales
  N4 y 3 ecosistemas N5, documentada en `docs/MERCADO_PAGINAS_VIBECODER.md`.
- **28 PACKs de prompts** (`docs/prompts/PACK-*.md`) con código de registro **PK-001..PK-029**
  (PK-005 es el servicio de Google Business, sin PACK), URL Vercel propuesta
  (`https://nexora-<tipo>.vercel.app`) y repo GitHub (`Nexora/pack-<tipo>`).
  Registro de despliegue en `docs/prompts/REGISTRO-DEPLOY.md` (manual).
- **Prospección parcial** (`prospecting/`): búsqueda de leads + mensajes WhatsApp + dashboard.

### 1.2 Estado REAL del disco (no inventar)

- Rama actual: `prospecting-wip` (limpia). Último commit: `c00a00a` (registro de despliegue Nexora).
- **La vitrina se construye DENTRO de la app del cotizador Alex** (una sola app, un solo deploy,
  un solo dominio). NO hay app separada `nexora/` ni "API de Alex": el bot ya vive aquí (`/chat`,
  `/results`, `/api/*`) y se reutiliza tal cual.
- **SÍ existe** `docs/prompts/INDICE-PACKS.md` (regenerado con `generate-pack-samples.ts`; FASE 5 lo verifica).
- **NO existe** `docs/prompts/AGENCIA-VITRINA-ROO.md` (este documento lo sustituye).
- `prospecting/closing/negotiation-agent.ts` está **roto** (no compila) — NO tocarlo.
- El bot/cotizador es **completo y validado** (regresión 436 asserts, eval 30 personas). No tocar el motor.

### 1.3 Objetivo de este plan (CEO)

Construir el **sitio vitrina de la agencia** (la "cara" que atrae por Google y genera confianza),
desplegarlo en Vercel con dominio propio, y conectarlo al **motor de prospección**, mientras seguimos
haciendo páginas de muestreo. El sitio debe: **atraer → mostrar lo que hacemos con precios honestos →
convertir a WhatsApp/cotización → alimentar el pipeline de ventas**.

---

## 2. Marca e identidad — DECISIONES FINALES (no re-discutir)

### 2.1 Nombre: **Nexora** ✅ (rebranding aplicado 2026-08-09)

- **Significado:** del latín _nexus_ ("nexo, vínculo") + sufijo _-ora_ ("la que conecta"): somos
  **el nexo entre tu negocio y sus clientes**. Corto, memorable, profesional, fácil de decir y
  escribir en español e inglés.
- **Por qué Nexora en vez de "VibeCoder":** "vibe" sonaba informal/creativo; Nexora transmite
  **seriedad, confianza y solidez** (perfil de empresa, no de proyecto). El cambio se aplica AHORA
  porque ninguna demo está desplegada (todo "⏳ Pendiente" en `REGISTRO-DEPLOY.md`): solo se
  regeneran los PACKs/URLs propuestas, sin romper nada publicado.
- **Alternativas evaluadas:** `Vértice` (el punto más alto), `Nexo` (simple, pero hay una fintech con
  ese nombre). Si prefieres otra, se cambia igual de fácil antes de desplegar.

### 2.2 Tagline (usar SIEMPRE)

> **"El nexo entre tu negocio y tus clientes."**

Línea de valor (hero/SEO): **"Webs que venden. Hechas con IA."** Variantes contextuales:
"Tu web profesional en días, no en meses" · "El vínculo entre tu negocio y el mundo digital".

### 2.3 Paleta de color (tokens Tailwind — copiar exacto)

| Token         | Hex         | Uso                                           |
| ------------- | ----------- | --------------------------------------------- |
| `brand-600`   | `#2563EB`   | Primario (azul eléctrico) — confianza/empresa |
| `brand-700`   | `#1D4ED8`   | Fin del gradiente primario                    |
| `night-900`   | `#0F172A`   | Tinta (texto sobre claro / fondo en dark)     |
| `night-700`   | `#1E293B`   | Texto secundario                              |
| `emerald-500` | `#10B981`   | Éxito / CTA secundario ("vende/crece")        |
| `surface-50`  | `#FAFAFA`   | Fondo claro de secciones                      |
| `whatsapp`    | `#25D366`   | Botón WhatsApp (nunca otro verde para WA)     |
| Semánticos    | slate scale | Bordes, grises, `error #EF4444`               |

Regla de uso: **gradiente primario `#2563EB → #1D4ED8`** para CTAs y acentos; azul = confianza
(corporativo), emerald = crecimiento/acción ("vende"); sin naranjas ni violetas llamativos (perfil
sobrio-profesional). Contraste mínimo AA (4.5:1).

### 2.4 Tipografía

| Rol             | Fuente                       | Nota                             |
| --------------- | ---------------------------- | -------------------------------- |
| Display/títulos | **Space Grotesk** (500–700)  | Personalidad tech-creativa       |
| Body/UI         | **Inter** (400–600)          | Legibilidad, cuerpo              |
| Mono/acento     | **JetBrains Mono** (400–700) | Código, badges, "N0–N5", precios |

Self-hosted con `next/font` (`display: swap`, sin FOIT). La tipografía "terminal/código" es un sello
de marca: úsala en eyebrows, badges de nivel y la línea de código del hero.

### 2.5 Logo — spec (para FASE 0)

**Concepto:** un **hexágono-nodo** (símbolo de red/conexión) con dos piezas: una **sólida** con
gradiente `#2563EB→#1D4ED8` y una de **contorno**, unidas por un **nodo central** que evoca un enlace
entre dos puntos ("el nexo") y que a la vez se lee como una **"N" estilizada**. Debe leerse bien a
16px (favicon) y 240px (header).

**Por qué SVG a mano y no un generador de imágenes:** escalable, coherente en cualquier tamaño,
funciona en mono-color, sin artefactos de IA, y es editable. (Opcional: explorar variaciones con
Recraft/Ideogram, pero la versión final SIEMPRE es el SVG geométrico.)

**Entregables** (en `public/brand/`):

- `logo-full.svg` — mark + wordmark "Nexora" (gradiente)
- `logo-mono.svg` — una sola tinta (para dark/footer)
- `mark.svg` — solo el símbolo (avatar, favicon)
- `favicon.svg` + `favicon.png` (32px) + `apple-touch-icon.png` (180px)
- `og.png` — 1200×630 para redes (mark + tagline sobre fondo night)
- `BRAND-SHEET.md` — documenta todo lo anterior (este §2 en un archivo vivo)

**Reglas de buen logo** (verificar en FASE 0): geometría sobre cuadrícula, espacio de respiro ≥
altura de la "N", versión mono-color legible, prueba en 16/32/64/240px y en fondo claro Y oscuro,
sin sombras ni degradados que "mueran" al reducir.

### 2.6 Voz de marca (copy de TODO el sitio)

- **Tono:** consultor senior, cercano, directo, sin jerga. Trata al cliente de **"tú"** en el sitio web.
- **Idioma:** español (México). **Nunca** "Lorem ipsum". Cero promesas no verificables (dark patterns).
- **Prueba social:** testimonios solo si son REALES; mientras no existan, usa secciones de "cómo
  trabajamos" y "qué incluye" en lugar de inventar reseñas. Los placeholders de testimonios van
  marcados `[EJEMPLO — reemplazar]`.
- **Precios:** siempre "Desde $X MXN" con IVA incluido, con anclaje a `precioDesde` (regla #7 del repo:
  UI = PDF = pack = copy, mismo total).

### 2.7 Checklist "lo que una empresa seria debe tener" (objetivo transversal)

- [ ] Nombre + tagline + logo + favicon + paleta + tipografía (FASE 0)
- [ ] Dominio propio `nexora.mx` + email `hola@nexora.mx` (FASE 8)
- [ ] Home / Servicios / Portafolio / Proceso / Precios / Preguntas / Contacto / Aviso de privacidad (FASES 3–7)
- [ ] SEO (meta por ruta, sitemap, robots, OG, LocalBusiness, Search Console) (FASE 8)
- [ ] Garantías y proceso de compra claros (FASE 6)
- [ ] Aviso de privacidad LFPDPPP (FASE 7)
- [ ] Formas de contacto: WhatsApp + email + cotizador Alex (FASES 7 y 11)
- [ ] Google Business Profile + NAP consistente (FASE 8)
- [ ] Analítica de conversión (FASE 10)
- [ ] Pipeline de leads → WhatsApp (FASE 12)

---

## 3. Arquitectura técnica (CTO) — decisiones

**Decisión: UNA sola app (vitrina + cotizador bajo el mismo techo).** La vitrina se construye
DENTRO de la app existente del cotizador Alex (este repo): el bot ya es una ruta de la misma app
(`/chat`, `/results`, `/api/*`) y se reutiliza tal cual. Un solo proyecto Vercel, un solo dominio
(`nexora.mx`), unas mismas llaves (DeepSeek/Supabase), cero CORS y cero piezas extra que operar.

- **¿Y la "API de Alex" + página aparte?** No por ahora. Separar exige auth, rate-limiting, CORS,
  dos deploys y más operación — coste que una agencia en arranque no necesita. El efecto buscado
  (vitrina + cotizador juntos) se logra gratis con rutas de la misma app. Solo se extrae una API
  pública cuando haya consumidores externos reales (portales de cliente, app móvil, multi-tenant).
- **Rutas:** la vitrina vive en el route group `app/(marketing)/` (home, servicios, portafolio,
  proceso, precios, preguntas, contacto, aviso-privacidad, blog, admin). El bot conserva `/chat` y
  `/results`; la landing actual de `/` se reemplaza por la vitrina (FASE 1/3). CTA "Cotiza con Alex" → `/chat`.
- **Dominio:** se conecta `nexora.mx` como dominio principal del MISMO proyecto Vercel
  (botcotizador.vercel.app queda como alias). La marca en las envs del bot:
  `NEXT_PUBLIC_AGENCY_NAME=Nexora`.
- **Vitrina data-driven:** un solo `data/portfolio.json` (validado con zod) alimenta Portafolio +
  Servicios. Lo genera el script `scripts/sync-agency-data.ts` (raíz del repo) leyendo
  `lib/agency-catalog.ts` (`AGENCY_WEB_TYPES`: id/nombre/descripcion/precioDesde/categoriaBase) +
  `REGISTRO_PACKS` de `scripts/generate-pack-samples.ts` (código PK, slugVercel, repoGitHub). Así,
  cuando se despliegue un PACK nuevo, la vitrina se actualiza regenerando el JSON — **cero hardcode de 28 tarjetas**.
- **Regla de oro de tokens:** cada fase construye sobre componentes reutilizables (FASE 2 crea el
  sistema; FASE 3–7 solo lo usan). Nunca repetir lógica ni copiar secciones a mano.
- **Rendimiento desde la base:** `next/font`, `next/image`, Core Web Vitals verdes (mismo estándar de los PACKs).

---

## 4. Sitemap del sitio vitrina (CPO)

```
nexora.mx
├── /                    Home de la vitrina (hero + prueba social + servicios + vitrina teaser + proceso + CTA)
├── /servicios           11 categorías + bots IA, con "Desde $X" (data-driven)
├── /portafolio          Vitrina de los 28 PACKs (códigos PK-001..029): tarjeta + "Desde $X" + link demo + link repo
├── /proceso             Cómo trabajamos (diagnóstico → propuesta → desarrollo → entrega) + garantías
├── /precios             Planes/packaging + "cuota desde $X/mes" (total/24) + FAQ de precio
├── /preguntas           FAQ (plazos, pagos, soporte, qué incluye)
├── /contacto            WhatsApp + email + form + aviso de privacidad
├── /aviso-privacidad    LFPDPPP
├── /chat                El cotizador Alex (bot) — se reutiliza tal cual; CTA "Cotiza con Alex"
├── /results             Resultado del cotizador (existente)
├── /blog/*              (FASE 9 opcional) artículos SEO "cuánto cuesta una web de X"
├── /demo                (FASE 11 opcional) demo de prospección / feed en vivo (existente)
└── 404                  con CTA a WhatsApp (vitrina en app/(marketing)/not-found)
```

**Niveles de producto para badges N0–N5** (consistente con la cartera):
`N0 Entrada` (link-in-bio, menú, tarjeta, micro-landing) · `N1 Presencia` (landing, portafolio, blog) ·
`N2 Negocio` (corporativo, citas, reservas, cotizador, multilingüe, PWA) · `N3 Venta` (e-commerce, e-commerce pro) ·
`N4 Plataforma` (webapp, inmobiliaria, directorio, telemedicina, membresías, cursos) · `N5 Ecosistema` (marketplace, split, SaaS, ERP).

---

## 5. LAS FASES

> Convención: cada fase cierra con `FIN_DE_FASE_N`. Las fases **⭐ OBLIGATORIAS** se ejecutan SIEMPRE y en orden.
> Las **✨ OPCIONALES** elevan el resultado y no bloquean la entrega (se hacen con presupuesto/tiempo).

---

### FASE 0 · Identidad y assets de marca — ⭐ OBLIGATORIA

**Rol para Roo:** Brand Designer + SVG Art Director.

👉 **PROMPT FASE 0**

```markdown
Actúa como Brand Designer senior + Art Director SVG. Vas a MATERIALIZAR la identidad de la agencia
Nexora (decisiones ya tomadas, NO las cambies):

- Marca: Nexora · Tagline: "El nexo entre tu negocio y tus clientes." · Línea de valor:
  "Webs que venden. Hechas con IA."
- Paleta: brand #2563EB→#1D4ED8 (gradiente azul), night #0F172A, emerald #10B981,
  surface #FAFAFA, whatsapp #25D366.
- Tipografía: Space Grotesk (display) + Inter (body) + JetBrains Mono (acento).
- Logo: hexágono-nodo (red/conexión) con dos piezas — una sólida con gradiente #2563EB→#1D4ED8 y
  una de contorno — unidas por un nodo central que evoca un enlace y una "N" estilizada.

Crea SOLO estos archivos en public/brand/ (crea la carpeta):

1. logo-full.svg (mark + wordmark "Nexora", 240x64 viewBox, texto como <text> con font-family
   "Space Grotesk", NUNCA convertir a paths)
2. logo-mono.svg (misma composición en una sola tinta blanca, para fondos oscuros)
3. mark.svg (solo el símbolo, 64x64, debe leerse a 16px)
4. favicon.svg (mark 32x32) + favicon.png (32px) + apple-touch-icon.png (180px)
5. og.png 1200x630 (mark + "El nexo entre tu negocio y tus clientes." sobre fondo night #0F172A)

Además crea docs/BRAND-SHEET.md con: nombre, tagline, paleta (hex + usos),
tipografía, versiones del logo, espacio de respiro, usos correctos/incorrectos y reglas de
accesibilidad (contraste AA).

Reglas: geometría sobre cuadrícula, degradado legible en mono, sin sombras que mueran al reducir,
prueba mental a 16/32/64/240px y sobre fondo claro Y oscuro.
Define FIN_DE_FASE_0 solo cuando los 6 archivos + BRAND-SHEET.md existan y sean válidos.
```

---

### FASE 1 · Fundación técnica de la vitrina — ⭐ OBLIGATORIA

**Rol para Roo:** Next.js senior full-stack.

👉 **PROMPT FASE 1**

```markdown
Actúa como desarrollador senior de Next.js. La app del cotizador Alex (este repo) es la que va a
alojar la vitrina de la agencia Nexora: NO se crea una app nueva ni una "API de Alex". Vas a
preparar la base EXISTENTE para las fases siguientes (home de vitrina, servicios, portafolio
data-driven) SIN tocar el motor del cotizador ni su flujo.

Contexto: una sola app Next.js 14 App Router + TS strict + Tailwind 3 + shadcn pattern que sirve la
vitrina (app/(marketing)/) y el bot (app/chat, app/results, app/api/\*). Debe quedar lista para las
siguientes fases.

Crea/ajusta SOLO lo siguiente (deja intactos app/chat, app/results, app/api/\*, components/chat y
lib/ del bot):

1. Route group app/(marketing)/ con layout propio: crea page.tsx (home placeholder; FASE 3 lo
   reemplaza), servicios/, portafolio/, proceso/, precios/, preguntas/, contacto/, aviso-privacidad/.
   Mueve la landing actual de app/page.tsx (hoy enlaza a /chat) a app/(marketing)/page.tsx y elimina
   app/page.tsx para no chocar en "/" (el bot vive en /chat y /results; su CTA será "Cotiza con
   Alex"). Si prefieres conservar la landing del bot en "/", dilo en FASE 3 y adapta las rutas.
2. app/(marketing)/not-found.tsx (404 de la vitrina con CTA a WhatsApp; el 404 del bot se conserva).
3. tailwind.config.ts: añade los tokens de marca EXACTOS sin romper los del bot: brand-600 #2563EB,
   brand-700 #1D4ED8, night-700 #1E293B, night-900 #0F172A, emerald-500 #10B981, surface-50 #FAFAFA,
   whatsapp #25D366; fontFamily: sans=Inter, heading=Space Grotesk, mono=JetBrains Mono.
4. layout.tsx: next/font/google con Space_Grotesk (500-700), Inter (400-600), JetBrains_Mono
   (400-700) y variables --font-heading/--font-sans/--font-mono si no están; metadata base de la
   vitrina: title "Nexora · Webs que venden. Hechas con IA.", description, canonical
   https://nexora.mx, openGraph 1200x630, twitter, icons desde /brand/, robots index,follow.
5. public/brand/ — copia/reutiliza los assets de FASE 0 (logo/favicon/og) en public/.
6. components/BrandLogo.tsx (next/image, variantes full/mono/mark) y lib/utils.ts (cn) para la vitrina.
7. lib/portfolio.ts (tipos zod: PortfolioItem { codigo, nombre, nivel, descripcion, precioDesde,
   categoriaBase, slugVercel, repoGitHub, estado }, PortfolioData).
8. data/portfolio.json en la raíz (array vacío; FASE 5 lo llena el script de sync).

NO escribas las secciones de contenido (solo la base). RENDIMIENTO: next/font display swap.

Verifica y reporta: npm run lint = 0, npx tsc --noEmit = 0 (solo los 28 errores preexistentes de
prospecting/closing/negotiation-agent.ts), npm run build OK, y que / (vitrina placeholder), /chat y
/results renderizan. Cierra con FIN_DE_FASE_1.
```

---

### FASE 2 · Shell + sistema de componentes UI — ⭐ OBLIGATORIA

**Rol para Roo:** UI Engineer (design system).

👉 **PROMPT FASE 2**

```markdown
Actúa como UI Engineer construyendo un design system para la vitrina Nexora (Next.js 14 + TS +
Tailwind 3, en la misma app del cotizador; las páginas de la vitrina van en app/(marketing)/).
Paleta/tipografía ya definidas en tailwind.config.ts (brand,
night, emerald, surface, whatsapp; Space Grotesk/Inter/JetBrains Mono). Usa cn() de lib/utils.

Construye SOLO componentes reutilizables (sin secciones de página):

- components/layout/Nav.tsx: sticky, blur, logo (BrandLogo), enlaces Servicios/Portafolio/
  Preguntas/Cotiza, CTA gradiente + botón WhatsApp (icono lucide MessageCircle, verde #25D366).
- components/layout/Footer.tsx: night-900, logo mono-white, columnas (Servicios, Portafolio,
  Legal: Aviso de privacidad, contacto), "Hecho por Nexora en México".
- components/ui/SectionHeader.tsx (eyebrow mono + título Space Grotesk + subtítulo)
- components/ui/CTAButton.tsx (variantes: primary [gradiente brand→brand-700 (azul)], whatsapp [verde #25D366],
  outline, ghost; tamaños; con iconos opcionales)
- components/ui/Badge.tsx (nivel N0–N5 con colores por nivel)
- components/ui/Card.tsx (base con hover lift), components/ui/PriceCard.tsx (Desde $X, lista de
  includes, CTA), components/ui/ServiceCard.tsx, components/ui/PortfolioCard.tsx (código PK, nivel,
  nombre, descripción, "Desde $X", enlace demo/repo)
- components/ui/Checklist.tsx, components/ui/FAQItem.tsx (acordeón accesible),
  components/ui/TestimonialCard.tsx (marcado [EJEMPLO — reemplazar])
- components/ui/FadeIn.tsx (framer-motion whileInView, respeta prefers-reduced-motion)
- components/ui/WhatsAppButton.tsx (float, reutilizable, wa.me placeholder)
- components/ui/Chip.tsx, components/ui/Stat.tsx (prueba social)

Reglas: mobile-first (360px → 1440px), focus rings visibles, estados hover/pressed/disabled en todo
lo interactivo, contraste AA, componentes tipados, props con cva. Cero estilos repetidos: todo por
tokens. Cierra con FIN_DE_FASE_2 cuando todos los componentes compilen (lint 0, tsc 0, build OK).
```

---

### FASE 3 · Home / Portada — ⭐ OBLIGATORIA

**Rol para Roo:** Frontend Lead + Copywriter de conversión.

👉 **PROMPT FASE 3**

```markdown
Actúa como Frontend Lead + Copywriter de conversión para la vitrina Nexora. Rellena
app/(marketing)/page.tsx usando SOLO los componentes de FASE 2 (Nav, Footer, SectionHeader,
CTAButton, Badge, FadeIn, Stat, WhatsAppButton). Mobile-first. NO inventes testimonios (usa secciones
que construyan confianza sin reseñas falsas).

Secciones en orden:

1. Hero: eyebrow mono "> nexora — webs hechas con IA", H1 Space Grotesk grande
   "Tu web profesional en días, no en meses.", subtítulo con propuesta de valor (precio desde honesto,
   acabado premium, entrega rápida), doble CTA (gradiente → /servicios, WhatsApp), y una tarjeta
   visual "línea de terminal" (JetBrains Mono) que muestre una cotización relámpago estilo
   "> cotiza tu web en 3 min → $8,500 MXN desde". El fondo usa el gradiente brand y night con
   partículas/mesh sutiles (framer-motion).
2. Prueba social (Stat): "28 tipos de web", "28 PACKs listos para desplegar", "entrega en días",
   "asistentes IA desde $199/mes" — honesto, sin inventar clientes.
3. Servicios (teaser): grid de ServiceCard con las 11 categorías + "ver todos" → /servicios.
4. Vitrina (teaser): 6 PortfolioCard de los PACKs más vendidos (lee data/portfolio.json si ya tiene
   datos, si no usa un array de ejemplo con los PK-008 landing, PK-017 ecommerce, PK-014 citas,
   PK-021 inmobiliaria, PK-025 marketplace, PK-029 psicólogo) + CTA "ver portafolio" → /portafolio.
5. Cómo trabajamos (4 pasos): Diagnóstico (bot Alex cotiza en minutos) → Propuesta → Desarrollo →
   Entrega con soporte.
6. CTA final: gradiente, "¿Listo para tu web?" + botón WhatsApp + botón "Cotizar con Alex".
7. Footer (componente).

Copy: voz consultor senior, trato "tú", español MX, cero lorem ipsum, precios SIEMPRE "Desde $X MXN".
Cierra con FIN_DE_FASE_3 cuando / se vea completa en 360px y 1440px (lint 0, tsc 0, build OK).
```

---

### FASE 4 · Página de Servicios — ⭐ OBLIGATORIA

**Rol para Roo:** Solutions Architect + Copywriter.

👉 **PROMPT FASE 4**

```markdown
Actúa como Solutions Architect. Crea app/(marketing)/servicios/page.tsx y /servicios/[slug]/
(también podrías hacerla de una sola página con anclas si es más simple) para la vitrina Nexora.

- /servicios: SectionHeader + grid de ServiceCard con las 11 categorías del motor: landing,
  corporativo, ecommerce (con nivel pro), citas/reservas, webapp (con N4 verticales y N5 ecosistemas),
  blog, portafolio, menú digital, tarjeta digital, link-in-bio, cotizador. Cada tarjeta: nombre,
  descripción 1 línea, badge N0–N5, "Desde $X MXN" usando data/portfolio.json (precioDesde) o el
  catálogo si el JSON está vacío. + CTA "Cotiza esta web" → link al bot Alex.
- Cada servicio con detalle (ancla o ruta): qué incluye (features), para quién, ejemplos reales,
  "Desde $X", tiempo estimado de entrega, y CTA WhatsApp.
- Sección de asistentes IA: los 12 bots (FAQ, citas, ventas, leads, membresías, etc.) con su
  propuesta de valor y "desde $3,500 + $199/mes" (catálogo de bots: lib/bots-catalog.ts del repo
  padre — léelo para copiar nombres y precios EXACTOS, no los inventes).
- Sección "Niveles N0–N5" explicando la escalera de productos (de link-in-bio a ERP).

Fuente de verdad de precios: lib/agency-catalog.ts (precioDesde). Nunca hardcodear.
Cierra con FIN_DE_FASE_4 cuando /servicios esté completa (lint 0, tsc 0, build OK, se ve en 360px y 1440px).
```

---

### FASE 5 · Portafolio / Vitrina de PACKs (data-driven) — ⭐ OBLIGATORIA

**Rol para Roo:** Data Engineer + Frontend.

👉 **PROMPT FASE 5**

```markdown
Actúa como Data Engineer + Frontend Lead. La vitrina Nexora debe mostrar los 28 PACKs de la agencia
con su código PK, nivel, "Desde $X" y enlaces a la demo desplegada y al repo — SIN hardcodear las 29
tarjetas: todo sale de data/portfolio.json.

1. Crea en la RAÍZ del repo padre (NO dentro de nexora) el script
   scripts/sync-agency-data.ts (tsx, type-safe) que:
   - Importa AGENCY_WEB_TYPES de lib/agency-catalog.ts (id, nombre, descripcion, precioDesde,
     categoriaBase).
   - Lee la tabla REGISTRO_PACKS de scripts/generate-pack-samples.ts (código PK, nombre, nivel,
     desde, slugVercel, repoGitHub) — expórtala si hace falta.
   - Concatena ambos (código, nombre, nivel, descripcion, precioDesde, categoriaBase, urlDemo =
     https://{slugVercel}.vercel.app, repo = https://github.com/{repoGitHub}).
   - Escribe data/portfolio.json en la raíz de la app (validado con zod).
   - Añade un npm script "sync:agencia" en la raíz.
2. Ejecútalo (npx tsx scripts/sync-agency-data.ts) y verifica que portfolio.json tenga 28 ítems.
3. Crea app/(marketing)/portafolio/page.tsx: SectionHeader + filtros por nivel (N0–N5) +
   grid de PortfolioCard leyendo data/portfolio.json. Cada tarjeta: badge nivel, código PK, nombre,
   descripción, "Desde $X MXN", botón "Ver demo" (urlDemo) y "Código" (repo) — si la demo aún no está
   desplegada, el botón queda con estado "Próximamente" (no rompas el diseño).
4. Crea app/(marketing)/portafolio/[codigo]/page.tsx (generación estática desde portfolio.json):
   detalle del PACK con su descripción, nivel, desde, enlaces y CTA "Cotizar algo así" → bot Alex.
5. Regenera el índice maestro docs/prompts/INDICE-PACKS.md (corre npx tsx scripts/generate-pack-samples.ts
   si el script ya lo genera) y verifica que los datos de portfolio.json COINCIDEN con el índice.

Regla #7: precios SIEMPRE = precioDesde (UI = pack = PDF = copy). Cierra con FIN_DE_FASE_5 cuando el
JSON tenga 28 ítems, la página filtre bien y el detalle estático genere (lint 0, tsc 0, build OK).
```

---

### FASE 6 · Proceso + Pricing — ⭐ OBLIGATORIA

**Rol para Roo:** Growth Marketer + Frontend.

👉 **PROMPT FASE 6**

```markdown
Actúa como Growth Marketer + Frontend Lead para la vitrina Nexora.

1. app/(marketing)/proceso/page.tsx: "Cómo trabajamos" con timeline de 4-5 pasos (1 Diagnóstico
   con el bot Alex en minutos · 2 Propuesta con precio cerrado · 3 Desarrollo en días (mobile-first,
   con avances) · 4 Entrega + capacitación + soporte) + garantías: 2 rondas de revisión incluidas,
   garantía de 15 días, soporte post-entrega. CTA WhatsApp en cada paso.
2. app/(marketing)/precios/page.tsx: packaging claro por nivel:
   - N0/N1: presencia (desde $2,500–$9,000)
   - N2: negocio (desde $11,000–$18,000)
   - N3: venta en línea (desde $20,000–$28,000)
   - N4: plataformas (desde $22,000–$30,000)
   - N5: ecosistemas (desde $40,000–$90,000, cotizados con propuesta formal, no precio cerrado)
     Cada tier con qué incluye + "Desde $X/mes" = total/24 (reencuadre de cuota) + asistentes IA como
     add-on recurrente + CTA.
3. Sección "Cómo pagas": anticipo 50% / 50% al entregar, transferencia (y nota de que se puede
   evaluar tarjeta/Stripe), factura con RFC si aplica.
4. FAQ de precio (¿por qué "desde"? ¿qué incluye? ¿plazos?).

Copy: voz consultor senior, trato "tú", honesto: nunca prometas montos cerrados donde el motor cotiza
"desde". Usa data/portfolio.json para los montos. Cierra con FIN_DE_FASE_6 (lint 0, tsc 0, build OK).
```

---

### FASE 7 · Conversión + confianza + legal — ⭐ OBLIGATORIA

**Rol para Roo:** Conversion Rate Optimizer + Legal content.

👉 **PROMPT FASE 7**

```markdown
Actúa como Conversion Rate Optimizer + redactor legal para la vitrina Nexora.

1. app/(marketing)/preguntas/page.tsx: FAQ con acordeón accesible (FAQItem): plazos de entrega,
   qué es "hecho con IA", cómo funciona el anticipo, qué incluye el soporte, dominio/hosting, aviso de
   privacidad, cómo empiezo.
2. app/(marketing)/contacto/page.tsx: CTA grande WhatsApp (wa.me con placeholder de tu número en
   env NEXT_PUBLIC_WHATSAPP) + email + formulario de contacto (nombre, email, WhatsApp, tipo de web,
   mensaje) que envíe por email a un endpoint serverless sencillo o mailto, + microcopy de confirmación.
3. app/(marketing)/aviso-privacidad/page.tsx: aviso de privacidad LFPDPPP (responsable,
   datos recabados, finalidades, transferencias, derechos ARCO, contacto). Plantilla legal estándar
   mexicana; NO inventes datos del responsable: usa placeholders [Nombre/Razón social], [RFC], [email].
4. Bloque de confianza transversal (componente TrustBar en home y precios): "Sin letras chiquitas",
   "Precio desde honesto", "Entrega en días", "Soporte real".
5. Not-found.tsx: reemplaza el 404 placeholder por versión final con CTA WhatsApp.

Cierra con FIN_DE_FASE_7 (lint 0, tsc 0, build OK, y rutas /preguntas /contacto /aviso-privacidad
funcionando).
```

---

### FASE 8 · SEO + QA + Deploy a Vercel — ⭐ OBLIGATORIA

**Rol para Roo:** SEO Engineer + QA + DevOps.

👉 **PROMPT FASE 8**

```markdown
Actúa como SEO Engineer + QA Lead + DevOps para la vitrina Nexora. Objetivo: que nos encuentren en
Google y que el sitio quede en producción con dominio propio.

SEO:

1. metadata por ruta (title/description únicos con keyword por página: "páginas web con IA en México",
   "cuánto cuesta una página web", "diseño web rápido", etc.) en todas las páginas.
2. app/sitemap.ts (todas las rutas públicas), app/robots.ts (index,follow + sitemap).
3. Open Graph + Twitter por página; verifica que og.png (FASE 0) exista.
4. Datos estructurados JSON-LD: Organization (Nexora) + LocalBusiness/ProfessionalService en home
   con NAP consistente.
5. app/manifest.ts (PWA básica, theme color brand) y favicon/apletouch ya en public/brand.
6. Añade las envs NEXT_PUBLIC_WHATSAPP (tu número wa.me) y NEXT_PUBLIC_EMAIL; reemplaza los
   placeholders de contacto en Nav/Footer/Contacto/404.

QA (gate final):

- Lighthouse ≥ 90 en móvil y desktop (performance, accesibilidad, SEO, best practices) en /, /servicios,
  /portafolio, /proceso, /precios, /contacto. Corrige lo que baje de 90 (imágenes, CLS, contraste).
- Matriz responsive: 360/375/768/1024/1440. Sin scroll horizontal, sin cajas vacías, sin lorem ipsum.
- npm run lint = 0, npx tsc --noEmit = 0, npm run build OK.

Deploy (el MISMO proyecto Vercel del cotizador — no es un proyecto nuevo):

- Conecta nexora.mx como dominio principal del proyecto; botcotizador.vercel.app queda como alias.
- Verifica que / (vitrina), /chat y /results funcionan bajo nexora.mx.
- Marca en las envs existentes: NEXT_PUBLIC_AGENCY_NAME=Nexora y tus datos reales en
  NEXT_PUBLIC_DEVELOPER_NAME/WHATSAPP/EMAIL (reemplazan los placeholders "Tu Agencia Web"/wa.me de
  los PDFs y CTAs del bot). La vitrina usa NEXT_PUBLIC_WHATSAPP/NEXT_PUBLIC_EMAIL.
- Incluye /chat y las rutas de la vitrina en sitemap y robots.
- Lista de verificación final: dominio activo, https, sitemap accesible, OG renderiza, WhatsApp
  apunta a tu número real, Search Console añadido (manual, no requiere código).

Cierra con FIN_DE_FASE_8 cuando: build OK, Lighthouse ≥ 90 en las 6 páginas clave, dominio desplegado
(o instrucciones exactas para hacerlo), sitemap y robots activos.
```

---

### FASE 9 · Blog / contenido SEO — ✨ OPCIONAL

**Rol para Roo:** Content Strategist + SEO.

👉 **PROMPT FASE 9**

```markdown
Actúa como Content Strategist SEO para Nexora. Crea app/(marketing)/blog con:

1. /blog: listado de artículos (mínimo 3 listos): temas que captan búsqueda local "cuánto cuesta
   [una página web / un menú digital / un sistema de citas / una tienda online / una webapp] en
   México", cada uno con precios reales desde el catálogo (fuente: data/portfolio.json) y CTA al
   cotizador Alex.
2. Cada artículo: página estática con metadata SEO, tabla de precios honesta, FAQ schema, CTA interno.
3. Estructura: app/(marketing)/blog/page.tsx + app/(marketing)/blog/[slug]/page.tsx (generación estática desde una lista
   data/blog.ts). Cada artículo en Markdown o MDX.
4. Añade los artículos al sitemap.ts.
   Cierra con FIN_DE_FASE_9 cuando haya ≥3 artículos publicados y enlazados desde home/blog.
```

---

### FASE 10 · Analítica y conversión — ✨ OPCIONAL

**Rol para Roo:** Data Engineer + Growth.

👉 **PROMPT FASE 10**

```markdown
Actúa como Data Engineer + Growth para Nexora. Instrumenta la vitrina SIN PII:

1. Añade Vercel Analytics (o Plausible) para métricas de audiencia (script web/analytics en layout).
2. Crea lib/analytics.ts + un endpoint serverless POST /api/events (Zod whitelist, rate limit) que
   registre eventos de conversión: cta_whatsapp_click, cta_cotizar_click, form_submit,
   portfolio_demo_click, portfolio_contact_click, con atribución por referrer/UTM.
3. Crea app/(marketing)/admin/analytics (protegido con una contraseña simple de env) o un
   /api/summary que reporte: visitas, clicks a WhatsApp, clicks a cotizar, top páginas, top PACKs
   vistos, tasa de conversión. Tabla simple (no necesitas Supabase; usa un buffer en memoria o un
   JSON, pero deja la interfaz lista para Supabase).
4. Documenta los KPIs que importan (ver §7 del plan maestro) y cómo leerlos.
   Cierra con FIN_DE_FASE_10 cuando puedas ver eventos de los CTAs clave en una pantalla.
```

---

### FASE 11 · Demo del cotizador en vivo — ✨ OPCIONAL

**Rol para Roo:** Integration Engineer.

👉 **PROMPT FASE 11**

```markdown
Actúa como Integration Engineer. Conecta el cotizador Alex (producto estrella) a la vitrina Nexora:

1. Crea app/(marketing)/demo/page.tsx: hero de contexto "Cotiza tu web en 3 minutos" + CTA que lleva
   a /chat (misma app, mismo origen — sin iframe) y/o un modal elegante que embebe /chat.
2. Crea app/(marketing)/demo/prospeccion/page.tsx (opcional): reutiliza la demo de prospección /demo
   existente del bot (feed en vivo de búsqueda de leads) para mostrar nuestra capacidad.
3. Añade CTAs "Cotizar con Alex" (→ /chat) en Nav, hero, servicios, portafolio y precios.
4. Verifica que /chat y /results siguen funcionando dentro de nexora.mx.
   Cierra con FIN_DE_FASE_11 cuando /demo funcione y el CTA esté en todo el sitio.
```

---

### FASE 12 · Prospección integrada (leads → WhatsApp) — ✨ OPCIONAL

**Rol para Roo:** Sales Pipeline Engineer.

👉 **PROMPT FASE 12**

```markdown
Actúa como Sales Pipeline Engineer. Conecta la vitrina al pipeline de prospección del repo padre
(prospecting/). Objetivo: cada lead del formulario /contacto y cada cotización del bot Alex debe caer
en el pipeline WhatsApp sin trabajo manual.

En la misma app (este repo):

1. Crea un endpoint nuevo app/api/lead-capture/route.ts que reciba {nombre, email, whatsapp, tipoWeb,
   mensaje, fuente} desde el formulario de /contacto de la vitrina, valide con zod, y haga upsert en
   prospect_leads (prospecting/store/leads-repo.ts) con estado pending.
2. Si el lead viene del cotizador (bot), conecta la persistencia existente para que el lead quede con
   su cotización adjunta.
3. Documenta el flujo: vitrina → API → leads-repo → cola whatsapp-outbound (cuando haya Redis/worker).
4. Envía el formulario de /contacto al nuevo endpoint (fetch POST con la key compartida en env).

Cierra con FIN_DE_FASE_12 cuando un lead de prueba del formulario aparezca en la tabla prospect_leads
(o en el fallback de memoria) con estado pending y un log de mensaje generado.
```

---

### FASE 13 · Reseñas, casos reales y roadmap de crecimiento — ✨ OPCIONAL

**Rol para Roo:** CRO + CEO advisor.

👉 **PROMPT FASE 13**

```markdown
Actúa como CRO + consejero de CEO. Eleva la confianza y define el crecimiento:

1. Crea data/testimonials.ts con estructura lista (autor, negocio, tipo de web,
   cita, foto placeholder) vacía o con 0 ítems reales, y un componente sección "Lo que dicen nuestros
   clientes" que se OCULTA si no hay testimonios (nunca mostrar falsos).
2. Crea data/cases.ts (casos de estudio: negocio, problema, solución, resultado) y
   sección "Casos" en portafolio; rellena cuando existan proyectos reales entregados.
3. Sección "Roadmap de la agencia" (en /proceso o /precios): muestra honestamente hacia dónde crece
   Nexora (más tipos de web, asistentes IA por giro, soporte mensual, ecommerce con pagos, etc.)
   — genera confianza y abre conversaciones de upsell.
4. Revisión CRO del home y /precios: detecta y corrige fricciones (CTAs poco visibles, falta de
   urgencia legítima, precios confusos, navegación). Reporta cambios.
   Cierra con FIN_DE_FASE_13 cuando los componentes de prueba social existan (ocultos si vacíos) y
   publiques un reporte de 5 mejoras de conversión aplicadas.
```

---

### FASE 14 · Multi-idioma (inglés) — ✨ OPCIONAL

**Rol para Roo:** i18n Engineer.

👉 **PROMPT FASE 14**

```markdown
Actúa como i18n Engineer. Añade inglés a la vitrina Nexora (atrae clientes bilingües y
nearshoring):

1. Introduce un diccionario ligero (lib/i18n.ts con archivo es.ts / en.ts) y un selector ES/EN en el
   Nav (persistido en localStorage o cookie).
2. Traduce home, servicios, portafolio, proceso, precios, preguntas, contacto, footer, 404 y metadata
   (title/description por idioma + hreflang alternates en cada página).
3. Mantén los precios y datos (portfolio.json) en un solo lugar (no se traducen).
   Cierra con FIN_DE_FASE_14 cuando el selector funcione en todas las rutas con hreflang correcto.
```

---

### FASE 15 · Backoffice simple para editar la vitrina — ✨ OPCIONAL

**Rol para Roo:** Full-stack + Admin UX.

👉 **PROMPT FASE 15**

```markdown
Actúa como Full-stack dev. Crea un backoffice mínimo para que editar la vitrina NO requiera código:

1. app/(marketing)/admin (protegido con contraseña de env): formularios para editar
   portafolio.json (añadir/quitar PACK, cambiar estado demo), testimonios y casos (misma estructura de
   data/\*.json), y ver la analítica de FASE 10.
2. Guarda escribiendo en data/\*.json (server-side, revalidación on-demand) o en una tabla Supabase
   simple si existe; documenta cuál.
3. Cierra con FIN_DE_FASE_15 cuando puedas cambiar un precio/testimonio desde /admin y verlo en el
   sitio público.
```

---

## 6. Estrategia de crecimiento (AI Strategist) — ideas embebidas y futuras

- **Motor de captura:** cada PACK desplegado en Vercel (`nexora-<tipo>.vercel.app`) debe tener un
  footer "Hecho por Nexora" + CTA de cotización → todo el muestreo alimenta la vitrina.
- **Contenido SEO que vende:** artículos "cuánto cuesta" (FASE 9) son imanes de búsqueda local; cada
  uno termina en el cotizador Alex.
- **Recurrencia:** los asistentes IA (margen ~90%) son el motor de LTV. Vender la web "desde" barato y
  el bot como suscripción es el modelo (tesis de docs/MERCADO_VIBECODER.md).
- **Escalera de producto:** N0→N5 con el mismo cliente (cross-sell): el que compró un menú digital es
  candidato a reservas → ecommerce → webapp. Comunicarlo en precios.
- **Prueba social real:** los primeros 5 proyectos entregados se convierten en casos de estudio
  (FASE 13). Pedir permiso y una reseña en Google Business al entregar.
- **Automatización:** FASE 12 (leads → WhatsApp) cierra el círculo: vitrina + bot + prospección =
  pipeline completo.
- **Futuro (fuera de este plan, anotar como backlog):** pagos en línea (Stripe MX), facturación
  automatizada CFDI, plantillas de contrato digital, onboarding de más desarrolladores con IA
  (subcontratación),
  landing multi-idioma completo, y panel de clientes con estado de su proyecto.

## 7. KPIs que importan (medir tras FASE 10)

| Métrica                                    | Meta (primer trimestre) |
| ------------------------------------------ | ----------------------- |
| Clicks a WhatsApp                          | ≥ 5/semana              |
| Cotizaciones iniciadas con Alex            | ≥ 20/mes                |
| Leads capturados al pipeline               | ≥ 10/mes                |
| Tasa de conversión visita→CTA              | ≥ 2%                    |
| Posición Google "página web con IA México" | Top 10 en 3 meses       |
| Lighthouse (6 páginas clave)               | ≥ 90                    |
| Tiempo de entrega promedio por web         | ≤ 10 días               |

## 8. Presupuesto de tokens estimado

- **FASES 0–8 (obligatorias):** ~9 chats de Roo con contexto compacto. Cada fase define EXACTAMENTE
  los archivos → sin escaneo de repo. Estimado: **menos de 1/4 del costo de explorar a ciegas.**
- **FASES 9–15 (opcionales):** ~7 chats más, cada uno opcional e independiente (se pueden saltar).
- **Regla de oro:** no pegar dos fases en el mismo chat; no re-preguntar lo decidido en §2/§3; la
  vitrina es data-driven (un JSON, no 28 tarjetas a mano).
