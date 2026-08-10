# 🚀 REGISTRO DE DESPLIEGUE · Nexora (editar a mano)

> **Este archivo SÍ se edita a mano** (a diferencia de `INDICE-PACKS.md`, que se regenera solo).
> A medida que despliegues cada PACK en Vercel / lo subas a GitHub, marca aquí la **URL real**,
> el **repo real** y la **fecha**. Así siempre sabes qué página es cuál.

## ✅ Cómo usarlo

1. Cuando un PACK esté en producción, edita su fila: pon la URL real (si difiere de la propuesta) y cambia el estado a `✅ En producción`.
2. La URL propuesta vive en `INDICE-PACKS.md`; aquí solo anotas lo que ya está desplegado.

## 🖥 Vitrina (la app principal: sitios + cotizador Alex)

| App            | URL real (Vercel Hobby, gratis)       | Repo (GitHub)                    | Fecha      | Estado                                                                                                                          |
| -------------- | ------------------------------------- | -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Vitrina Nexora | `https://botcotizador.vercel.app`     | `guillermocruzdev/bot_cotizador` | 2026-08-10 | ✅ **FASE 9 deploy #1 (Vercel Hobby)**: / /chat /results /servicios /portafolio /precios /contacto → 200; E2E cotización completa OK. `nexora.vercel.app` está ocupada por otra empresa → se usa `botcotizador.vercel.app` (URL gratis del proyecto). Envs de contacto reales en Vercel Production. |

> **✅ FASE 9 hecha (2026-08-10):** envs `NEXT_PUBLIC_WHATSAPP=528145575257` y `NEXT_PUBLIC_EMAIL=hola@nexora.mx` configuradas en Vercel Production (ya no hay placeholders). El canonical/metadataBase/sitemap del código apuntan a `https://botcotizador.vercel.app` (la URL real del plan Hobby).

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
