# 🚀 REGISTRO DE DESPLIEGUE · Nexora (editar a mano)

> **Este archivo SÍ se edita a mano** (a diferencia de `INDICE-PACKS.md`, que se regenera solo).
> A medida que despliegues cada PACK en Vercel / lo subas a GitHub, marca aquí la **URL real**,
> el **repo real** y la **fecha**. Así siempre sabes qué página es cuál.

## ✅ Cómo usarlo

1. Cuando un PACK esté en producción, edita su fila: pon la URL real (si difiere de la propuesta) y cambia el estado a `✅ En producción`.
2. La URL propuesta vive en `INDICE-PACKS.md`; aquí solo anotas lo que ya está desplegado.

## 🖥 Vitrina (la app principal: sitios + cotizador Alex)

| App            | URL real (Vercel Hobby, gratis)   | Repo (GitHub)                    | Fecha      | Estado                                                                                                                                                                                                                                                                                              |
| -------------- | --------------------------------- | -------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitrina Nexora | `https://botcotizador.vercel.app` | `guillermocruzdev/bot_cotizador` | 2026-08-10 | ✅ **FASE 9 deploy #1 (Vercel Hobby)**: / /chat /results /servicios /portafolio /precios /contacto → 200; E2E cotización completa OK. `nexora.vercel.app` está ocupada por otra empresa → se usa `botcotizador.vercel.app` (URL gratis del proyecto). Envs de contacto reales en Vercel Production. |

> **✅ FASE 9 hecha (2026-08-10):** envs `NEXT_PUBLIC_WHATSAPP=528145575257` y `NEXT_PUBLIC_EMAIL=hola@nexora.mx` configuradas en Vercel Production (ya no hay placeholders). El canonical/metadataBase/sitemap del código apuntan a `https://botcotizador.vercel.app` (la URL real del plan Hobby).

> **✅ FASE 10 hecha (2026-08-10) — verificación post-deploy:**
>
> - **Lighthouse:** bp 100 · seo 100 · a11y 96–100 en las 6 páginas (`/`, `/servicios`, `/portafolio`, `/proceso`, `/precios`, `/contacto`). **Perf real (sin throttling simulado) = 98 (TBT 20 ms)**; con el throttling simulado de Lighthouse en esta laptop vieja da 53–69 por el multiplicador 4× de CPU (artefacto de hardware, no de código). Corregido en QA: partículas del hero a CSS de compositor (sin framer-motion), glows con gradientes radiales (sin `filter: blur`), sin `backdrop-blur`, **framer-motion eliminado de la vitrina** (FadeIn y Hero a CSS puro → el chunk de framer ya no se carga en las páginas de marketing), H1 del hero sin animación de entrada (LCP inmediato), y contraste AA global (`--muted-foreground` oscurecido).
> - **SEO en producción:** sitemap.xml (39 URLs = 11 estáticas + 28 PACKs) y robots.txt OK; og.png (1200×630) sirve 200 image/png; JSON-LD `Organization` + `ProfessionalService` con NAP real (tel +528145575257, MX) en el home.
> - **Fix de marca en PDFs:** `NEXT_PUBLIC_AGENCY_NAME` seguía con el placeholder **"Tu Agencia Web"** (los PDFs de propuesta citaban la marca equivocada) → corregido en Vercel Production con `vercel env add --force`: `NEXT_PUBLIC_AGENCY_NAME=Nexora`, `NEXT_PUBLIC_DEVELOPER_NAME=Nexora`, `NEXT_PUBLIC_DEVELOPER_EMAIL=hola@nexora.mx`, `NEXT_PUBLIC_DEVELOPER_WHATSAPP=528145575257`. Verificado en el bundle desplegado de `/results` (ya no hay "Tu Agencia Web").
> - **E2E en producción:** cotización completa (taquería → landing) hasta `/results` → $16,260 MXN "Desde $678/mes", giro Restaurante, mensaje honesto por presupuesto; CTA WhatsApp → `wa.me/528145575257` ("¡Hola Nexora!"); botón "Descargar propuesta en PDF" funciona sin errores.
> - **Pendiente (requiere cuenta de Google del dueño, no automatizable):** Google Search Console (añadir propiedad `https://botcotizador.vercel.app`, enviar sitemap, solicitar indexación de `/`, `/servicios`, `/portafolio`) y opcional Google Business Profile. Pasos abajo.

---

## ⚙️ Operación GRATIS: qué corre en LOCAL vs qué está en Vercel (FASE 10)

> Regla del plan §1.4: en **Vercel Hobby no hay proceso permanente ni cron** → lo que es de larga duración corre en local (`npm run dev`). La vitrina y el bot de chat corren perfecto en Vercel.

| Pieza                                                                                             | Dónde corre                                                             | Cómo                                                                                                                 |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Vitrina + cotizador Alex** (`/`, `/chat`, `/results`, `/api/*`, `/servicios`, `/portafolio`, …) | **Vercel Hobby** (producción)                                           | `vercel --prod` (ya desplegado en `botcotizador.vercel.app`)                                                         |
| **Scheduler de prospección** (`node-cron`: drenar pending, marcar no_response)                    | **LOCAL** (`npm run dev`)                                               | `prospecting/scheduler/scheduler.ts`                                                                                 |
| **Worker de BullMQ** (colas whatsapp-outbound / discovery / closing)                              | **LOCAL**                                                               | `npm run tsx prospecting/worker-entry.ts` (colas en memoria si no hay `REDIS_URL`; con `docker-compose.yml` + Redis) |
| **Bot WhatsApp (Baileys)**                                                                        | **LOCAL** (nunca en serverless)                                         | `npm run tsx prospecting/worker-entry.ts` — escanea QR con tu número                                                 |
| **DeepSeek**                                                                                      | Vercel (si `DEEPSEEK_API_KEY`) o local; sin key → fallback determinista | En producción ya hay key; `NEXT_PUBLIC_LLM_CHAT=1`                                                                   |
| **Supabase**                                                                                      | plan free (si keys) o fallback en memoria                               | Sin keys la app funciona en memoria                                                                                  |

## 🔍 Google Search Console (gratis) — pasos para el dueño

1. Entrar a https://search.google.com/search-console y añadir la **propiedad** `https://botcotizador.vercel.app` (verificación por prefijo de URL; Vercel sirve el archivo/meta sin costo).
2. En **Sitemaps** enviar `https://botcotizador.vercel.app/sitemap.xml`.
3. En **Inspección de URLs** solicitar la indexación de `/`, `/servicios` y `/portafolio`.
4. (Opcional, gratis) Crear el **Google Business Profile** de Nexora con el NAP consistente (tel +52 81 4557 5257, hola@nexora.mx, URL `https://botcotizador.vercel.app`).
5. El dominio `nexora.mx` (de pago) NO se compra por ahora — se decide después de FASE 10.

| Código | Producto                              | URL real (Vercel) | Repo real (GitHub) | Fecha de deploy | Estado       |
| ------ | ------------------------------------- | ----------------- | ------------------ | --------------- | ------------ |
| PK-001 | Link-in-bio premium                   |                   |                    |                 | ⏳ Pendiente |
| PK-002 | Menú digital con QR                   |                   |                    |                 | ⏳ Pendiente |
| PK-003 | Tarjeta digital / minisitio           |                   |                    |                 | ⏳ Pendiente |
| PK-004 | Micro-landing promocional             |                   |                    |                 | ⏳ Pendiente |
| PK-005 | Perfil Google Business (setup)        | —                 | —                  |                 | 🛠 Servicio  |
| PK-006 | Landing de evento                     |                   |                    |                 | ⏳ Pendiente |
| PK-007 | Portafolio profesional                |                   |                    |                 | ⏳ Pendiente |
| PK-008 | Landing page                          |                   |                    |                 | ⏳ Pendiente |
| PK-009 | Blog / contenido con SEO              |                   |                    |                 | ⏳ Pendiente |
| PK-010 | Sitio multilingüe                     |                   |                    |                 | ⏳ Pendiente |
| PK-011 | PWA instalable (app sin tienda)       |                   |                    |                 | ⏳ Pendiente |
| PK-012 | Reservas de restaurante               |                   |                    |                 | ⏳ Pendiente |
| PK-013 | Cotizador / presupuesto en línea      |                   |                    |                 | ⏳ Pendiente |
| PK-014 | Sistema de citas                      |                   |                    |                 | ⏳ Pendiente |
| PK-015 | Sitio corporativo (multi-página)      |                   |                    |                 | ⏳ Pendiente |
| PK-016 | Reservas con pago por adelantado      |                   |                    |                 | ⏳ Pendiente |
| PK-017 | E-commerce (tienda online)            |                   |                    |                 | ⏳ Pendiente |
| PK-018 | E-commerce pro (inventario + CFDI)    |                   |                    |                 | ⏳ Pendiente |
| PK-019 | Directorio / listado de negocios      |                   |                    |                 | ⏳ Pendiente |
| PK-020 | Plataforma / webapp a medida          |                   |                    |                 | ⏳ Pendiente |
| PK-021 | Portal inmobiliario                   |                   |                    |                 | ⏳ Pendiente |
| PK-022 | Portal de salud (telemedicina)        |                   |                    |                 | ⏳ Pendiente |
| PK-023 | Portal de membresías                  |                   |                    |                 | ⏳ Pendiente |
| PK-024 | Plataforma de cursos online           |                   |                    |                 | ⏳ Pendiente |
| PK-025 | Marketplace multi-vendedor            |                   |                    |                 | ⏳ Pendiente |
| PK-026 | Marketplace con split de pagos        |                   |                    |                 | ⏳ Pendiente |
| PK-027 | SaaS multi-tenant B2B                 |                   |                    |                 | ⏳ Pendiente |
| PK-028 | ERP / CRM a medida                    |                   |                    |                 | ⏳ Pendiente |
| PK-029 | Landing de psicólogo con asistente IA |                   |                    |                 | ⏳ Pendiente |

## 🧭 Referencia rápida

- **Índice completo (URLs propuestas):** `docs/prompts/INDICE-PACKS.md`
- **Regenerar PACKs + índice:** `npx tsx scripts/generate-pack-samples.ts`
- **Cada PACK trae:** bloque `#️⃣ REGISTRO` al inicio + fila "Código de registro" en la Ficha del proyecto.
