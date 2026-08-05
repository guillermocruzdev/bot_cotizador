# Deploy · Prospección B2B (Vercel + Railway + Supabase)

Pila objetivo: **frontend en Vercel**, **worker/backend en Railway**, **Supabase** (Postgres + RLS), **Redis** (Railway plugin).

---

## 0. Prerrequisitos

| Recurso  | Cuenta                | Nota                     |
| -------- | --------------------- | ------------------------ |
| GitHub   | repo del proyecto     | `bot_cotizador`          |
| Vercel   | vercel.com            | frontend                 |
| Railway  | railway.app           | worker + Redis           |
| Supabase | supabase.com          | DB + SQL Editor          |
| SerpAPI  | serpapi.com           | API key para Google Maps |
| DeepSeek | platform.deepseek.com | API key LLM              |

---

## 1. Supabase (base de datos)

1. Crea un proyecto nuevo.
2. Abre **SQL Editor** y ejecuta en orden:
   - `supabase/migrations/0001_prospecting.sql`
   - `supabase/migrations/0002_wa_workflow.sql`
   - `supabase/migrations/0003_dashboard.sql`
   - (y el `supabase/schema.sql` existente si no está aplicado)
3. Ve a **Settings → API** y copia:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (¡secreto!, solo servidor)

> Las tablas ya tienen RLS cerrada (solo acceso con service role).

---

## 2. Variables de entorno

### Compartidas (frontend + worker)

| Variable                    | Valor                       |
| --------------------------- | --------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | de Supabase                 |
| `DEEPSEEK_API_KEY`          | de DeepSeek                 |
| `DEEPSEEK_MODEL`            | `deepseek-chat`             |
| `PROSPECT_TZ`               | `America/Monterrey`         |
| `WA_SENDER_NAME`            | nombre con que firma el bot |

### Frontend (Vercel)

| Variable                        | Valor                                 |
| ------------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | de Supabase                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | de Supabase (opcional)                |
| `ADMIN_PASSWORD`                | contraseña del login del dashboard    |
| `AUTH_SECRET`                   | string aleatorio (firma de sesión)    |
| `SERPAPI_API_KEY`               | búsqueda de leads desde `/api/search` |
| `WEBHOOK_SECRET`                | token para `/api/webhook`             |

### Worker (Railway)

| Variable                    | Valor                                     |
| --------------------------- | ----------------------------------------- |
| `REDIS_URL`                 | del plugin Redis de Railway               |
| `BAILEYS_SESSION_DIR`       | ruta (por defecto `prospecting/.baileys`) |
| `SERPAPI_API_KEY`           | descubrimiento de leads                   |
| `DEEPSEEK_API_KEY`          | mensajes                                  |
| `SUPABASE_SERVICE_ROLE_KEY` | estados / log                             |

> Nunca subas secretos al repo: usa los dashboards de Vercel/Railway.

---

## 3. Frontend → Vercel

1. Importa el repo GitHub en Vercel.
2. Framework preset: **Next.js** (build `npm run build`).
3. Añade las variables del bloque "Frontend".
4. Deploy. URL: `https://tu-app.vercel.app`.

Verifica:

- `GET /api/stats` con cookie de sesión → 200.
- `/dashboard` redirige a `/login` si no hay sesión.
- `/api/search` sin `REDIS_URL` → 503 claro ("falta REDIS_URL").
- Con `REDIS_URL` → `{ queued: true }` y el worker inserta los leads.

---

## 4. Worker → Railway (backend)

1. En Railway, crea un servicio **Dockerfile** desde el repo.
2. Crea un plugin **Redis** y copia su `REDIS_URL`.
3. Añade las variables del bloque "Worker".
4. Monta un **volume** para persistir la sesión de Baileys en `prospecting/.baileys`.
5. Deploy. Log esperado: `[worker] en línea. Cola: BullMQ (Redis) · discovery: bullmq`.

### Colas que procesa el worker

- `whatsapp-outbound` → envíos con anti-ban (horario + límite diario + delay).
- `discovery` → búsquedas de leads. `/api/search` (Vercel) ENCOLA aquí; el worker
  ejecuta `runDiscovery` + insert en `prospect_leads`. Nunca correr búsquedas
  síncronas en Vercel (timeout de serverless).

### Tokens (DeepSeek)

- Búsqueda: por defecto **determinista** (SerpAPI + `hasWebsite`, 0 tokens LLM).
  El agente LangChain solo si envías `use_agent: true` en `/api/search`.
- Mensajes: 1 llamada LLM por (categoría+ubicación) reutilizada para todos los
  leads de esa combinación (scheduler y `/api/campaign`), no 1 por lead.
- El agente de discovery tiene `maxIterations: 3` (antes 8).

### Vincular WhatsApp (QR)

1. Abre los logs del worker.
2. Aparece el **QR** (escanea con WhatsApp → Dispositivos vinculados).
3. La sesión queda guardada en el volume (no hay que escanear de nuevo).

---

## 5. Redis (Railway)

- Usa el plugin **Redis** de Railway (gestión automática).
- Alternativa local: `docker compose up redis` (ver docker-compose.yml).

---

## 6. Webhook (opcional, para inbound HTTP)

El worker ya maneja inbound vía Baileys. Si quieres que otro proceso haga POST al
inbound, apunta `/api/webhook` del frontend:

```
POST https://tu-app.vercel.app/api/webhook
Headers: x-webhook-token: <WEBHOOK_SECRET>
Body:    { "number": "52155...", "text": "no gracias", "direction": "inbound" }
```

Respuesta: `{ "action": "blacklist", "status": "blacklist", "leadId": "..." }`.

---

## 7. Checklist final

- [ ] Migraciones 0001–0003 aplicadas en Supabase.
- [ ] `npm run test:regression` / `test:prospecting` / `test:message` / `test:bot` verdes.
- [ ] Frontend desplegado; `/login` funciona; dashboard muestra stats.
- [ ] Worker en Railway con Redis y QR vinculado.
- [ ] `/api/search` encola en `discovery`; el worker inserta en `prospect_leads`.
- [ ] `/api/campaign` encola mensajes; el worker los envía con anti-ban (50/día, 30–90 s, horario hábil).
- [ ] Inbound: `no gracias` → `blacklist`; palabras de reunión → `interested`.

---

## 8. Decisiones pendientes

- [ ] **Auth**: hoy es sesión HMAC simple (`lib/prospecting-auth.ts`). Migrar a NextAuth.js o Clerk si se requiere OAuth/SSO.
- [ ] **`/` vs `/login`**: la landing existente de `bot_cotizador` se conservó en `/`; el dashboard está en `/dashboard`.
- [ ] **Doble envío**: leads de campaña quedan `pending` hasta que el worker los marca `sent`; si el scheduler y la campaña corren a la vez podría enviarse dos veces. Marcar los leads de campaña con un estado intermedio si se vuelve un problema real.
- [ ] **FAQ chain** (Chat 5): hoy una pregunta entrante pasa a `human_mode`.
