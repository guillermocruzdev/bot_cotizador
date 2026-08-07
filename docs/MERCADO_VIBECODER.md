# 📊 Evaluación de Mercado · Agencia Vibecoder

> Documento de estrategia comercial para la agencia **vibecoder**.
> Fecha: agosto 2026 · Mercado: **México** (negocios pequeños y medianos / SMB).

---

## 1. Objetivo

Definir **precios accesibles para captar clientes** en dos líneas de producto:

1. **Bots con LangChain** (asistentes inteligentes por negocio) — catálogo en `lib/bots-catalog.ts`.
2. **Tipos de páginas web** de la agencia — catálogo en `lib/agency-catalog.ts`.

La estrategia es **"entrar barato, cobrar recurrente"**: precios de setup bajos que
quiten la fricción de comprar, y una cuota mensual (hosting del bot con DeepSeek +
mantenimiento) que genera ingreso recurrente y financia el soporte.

---

## 2. Mercado de los bots (asistentes IA)

### Lo que cobra la competencia en México

| Jugador                                                | Modelo                   | Precio típico                                    |
| ------------------------------------------------------ | ------------------------ | ------------------------------------------------ |
| Agencias de chatbots (muchas usan ManyChat / Chatfuel) | Suscripción SaaS + setup | $2,000–$15,000 MXN setup + $1,000–$4,000 MXN/mes |
| Bots "a la medida" con IA (agencia boutique)           | Proyecto                 | $15,000–$80,000 MXN el proyecto                  |
| ManyChat / Chatfuel / Landbot                          | SaaS (sin desarrollo)    | $30–$200 USD/mes (~$540–$3,600 MXN)              |
| Voiceflow / Botpress (con DeepSeek/OpenAI)             | SaaS + tokens            | $20–$100 USD/mes + consumo                       |
| Desarrollo manual con OpenAI (freelancer)              | Proyecto                 | $8,000–$40,000 MXN                               |

### Nuestra ventaja

- **Motor DeepSeek**: el costo por mensaje es casi nulo (ver §5). Eso nos permite
  cobrar suscripciones **bajas** con buen margen, algo que las agencias que usan
  GPT-4 o SaaS caros no pueden igualar.
- **Integrado a la web que vendemos**: no es un bot "pegado", es parte de la misma
  propuesta → más valor percibido y menos competencia directa.
- **Todo en español y para el giro del cliente**: los bots se entrenan con la info
  real del negocio (menú, servicios, precios, horarios).

### Precios de los bots (accesibles, IVA incluido)

| Complejidad  | Ejemplos de bot                                              | Setup          | Mensualidad      |
| ------------ | ------------------------------------------------------------ | -------------- | ---------------- |
| **Básica**   | FAQ, promociones, captura de leads, encuestas                | **$3,500 MXN** | **$199 MXN/mes** |
| **Media**    | Atención al cliente, citas, dudas, recomendador, multilingüe | **$5,900 MXN** | **$299 MXN/mes** |
| **Avanzada** | Ventas/cierre, cotización rápida, membresías                 | **$8,500 MXN** | **$449 MXN/mes** |

**Estrategia de gancho:** el bot más barato (FAQ) cuesta menos que una landing de la
competencia y se puede **regalar casi** como upsell ("te incluyo el bot de preguntas
frecuentes para que no pierdas clientes que preguntan de noche"). El margen real viene
de la mensualidad recurrente.

### Catálogo completo (12 bots)

| #   | Bot                             | Caso de uso                          | Setup  | Mensualidad |
| --- | ------------------------------- | ------------------------------------ | ------ | ----------- |
| 1   | Bot de preguntas frecuentes     | Dudas (horarios, precios, ubicación) | $3,500 | $199        |
| 2   | Bot de atención al cliente      | Soporte + escalamiento a humano      | $5,900 | $299        |
| 3   | Bot de citas y agenda           | Agendar, confirmar, recordar         | $5,900 | $299        |
| 4   | Bot de ventas y cierre          | Cualificar, cotizar, cerrar          | $8,500 | $449        |
| 5   | Bot de promociones y ofertas    | Promos, cupones, descuentos          | $3,500 | $199        |
| 6   | Bot capturador de leads         | Nombre, contacto, interés            | $3,500 | $199        |
| 7   | Bot de dudas de productos       | Garantías, envíos, pagos             | $5,900 | $299        |
| 8   | Bot recomendador                | Recomendar producto/servicio ideal   | $5,900 | $299        |
| 9   | Bot de cotización rápida        | Cotizar en minutos                   | $8,500 | $449        |
| 10  | Bot de encuestas y feedback     | Opiniones, reseñas                   | $3,500 | $199        |
| 11  | Bot de membresías/suscripciones | Altas, renovación, pagos             | $8,500 | $449        |
| 12  | Bot multilingüe                 | Español/inglés/más                   | $5,900 | $299        |

---

## 3. Mercado de páginas web

### Lo que cobra la competencia en México

| Tipo                             | Rango de mercado     | Nuestro precio "desde" |
| -------------------------------- | -------------------- | ---------------------- |
| Landing page básica              | $5,000–$12,000 MXN   | **$8,500 MXN**         |
| Sitio corporativo (multi-página) | $10,000–$25,000 MXN  | **$15,000 MXN**        |
| Tienda online (e-commerce)       | $18,000–$60,000 MXN  | **$20,000 MXN**        |
| Sistema de citas                 | $12,000–$35,000 MXN  | **$15,000 MXN**        |
| Plataforma / webapp a medida     | $25,000–$120,000 MXN | **$25,000 MXN**        |
| Blog / contenido                 | $6,000–$18,000 MXN   | **$9,000 MXN**         |
| Portafolio                       | $5,000–$15,000 MXN   | **$7,000 MXN**         |

Nos colocamos en el **cuartil bajo-medio del mercado** con acabado premium
(mobile-first, Lighthouse ≥ 90, SEO local, botón de WhatsApp): el precio se siente
"barato para lo que se ve".

### Tipos de web de la agencia (catálogo completo en `lib/agency-catalog.ts`)

**Ya los cotiza el motor (6):**

1. Landing page — desde $8,500 · 3-8 días
2. Sitio corporativo — desde $15,000 · 7-15 días
3. Tienda online — desde $20,000 · 10-25 días
4. Sistema de citas — desde $15,000 · 7-18 días
5. Plataforma / sistema a medida — desde $25,000 · 10-30 días
6. Blog — desde $9,000 · 5-12 días
7. Portafolio — desde $7,000 · 4-10 días

**Nuevos productos (amplían la cartera para captar más clientes):**

| Tipo                            | Desde      | Entrega    | Para quién                                  |
| ------------------------------- | ---------- | ---------- | ------------------------------------------- |
| Menú digital con QR             | **$3,500** | 2-4 días   | Restaurantes, cafeterías (venta de entrada) |
| Reservas para restaurante       | $12,000    | 7-12 días  | Restaurantes con mesas                      |
| Portal inmobiliario             | $25,000    | 15-30 días | Agencias y desarrolladores                  |
| Directorio / listado            | $22,000    | 15-25 días | Cámaras, asociaciones                       |
| Marketplace multi-vendedor      | $40,000    | 30-60 días | Emprendedores                               |
| Portal de membresías            | $28,000    | 15-30 días | Gimnasios, academias                        |
| Plataforma de cursos online     | $30,000    | 20-35 días | Instructores, coaches                       |
| Portal de citas para salud      | $26,000    | 15-30 días | Consultorios, clínicas                      |
| Landing de evento               | $6,500     | 3-7 días   | Lanzamientos, registro                      |
| PWA instalable (app sin tienda) | $12,000    | 7-15 días  | Cualquier negocio                           |
| Sitio multilingüe               | $11,000    | 6-12 días  | Zonas turísticas/frontera                   |

### Estrategia de "escalera de venta"

1. **Entrada barata**: menú QR ($3,500) o landing ($8,500) — fácil de decir que sí.
2. **Upsell natural**: + bot de FAQ/leads ($3,500 + $199/mes), + bot de citas si agenda.
3. **Escalada**: + e-commerce, + portal a medida, + membresías (recurrente).
4. **Recurrente**: mensualidad del bot (DeepSeek) + mantenimiento ($1,500/mes).

---

## 4. Margen y proyección rápida

### Costo de un bot (setup, hora-hombre en México, dev ~$150–$250 MXN/h)

| Concepto                       | Básica   | Media    | Avanzada |
| ------------------------------ | -------- | -------- | -------- |
| Horas de desarrollo            | 8-12 h   | 16-22 h  | 28-36 h  |
| Costo interno estimado         | ~$1,800  | ~$3,500  | ~$6,000  |
| Precio de venta (setup)        | $3,500   | $5,900   | $8,500   |
| **Margen bruto setup**         | **~49%** | **~41%** | **~29%** |
| Mensualidad (casi todo margen) | $199     | $299     | $449     |

El margen real vive en la **mensualidad**: con 10 clientes de bot media ($299/mes)
son ~$2,990/mes recurrentes con costo de hosting casi nulo (ver §5).

---

## 5. Análisis de DeepSeek (por qué nos deja cobrar barato)

Motor: **DeepSeek `deepseek-chat`** (V3) vía `https://api.deepseek.com` con LangChain
(`ChatOpenAI(baseURL=...)`). Precios de referencia por 1M tokens (aprox.):

| Concepto             | DeepSeek-chat |
| -------------------- | ------------- |
| Entrada (1M tokens)  | ~$0.27 USD    |
| Salida (1M tokens)   | ~$1.10 USD    |
| Tipo de cambio usado | ~$18 MXN/USD  |

**Costo por conversación típica de bot** (promedio 5 mensajes de entrada + 5 de salida,
~1,000 tokens entrada + ~800 tokens salida):

- Entrada: 0.001M × $0.27 ≈ **$0.049 MXN**
- Salida: 0.0008M × $1.10 × 18 ≈ **$0.016 MXN**
- **Total ≈ $0.065 MXN por conversación.**

Con una mensualidad de $199–$449 MXN, el cliente tendría que generar **más de 3,000–
7,000 conversaciones al mes** para que DeepSeek nos cueste más de lo que cobramos.
En la práctica, un negocio SMB genera **100–1,500 conversaciones/mes** → el costo real
de hosting es de **$6–$100 MXN/mes**. Margen de la mensualidad: **>90%**.

> **Conclusión:** DeepSeek es el habilitador de la estrategia "setup barato + mensualidad
> baja con margen enorme". Si el costo creciera, el cliente lo paga; si no, es casi todo
> ganancia.

---

## 6. Reglas de precio aplicadas en el código

1. El **setup del bot** se suma a la cotización de la web (precio exacto, IVA incluido).
2. La **mensualidad** se muestra como "desde $X/mes" (suscripción opcional).
3. El bot se agrega a la **propuesta comercial** (entregables + "qué incluye").
4. El bot se agrega al **prompt técnico** (el pack para Roo Code incluye la
   implementación con LangChain del bot seleccionado).
5. El precio nunca es un rango: siempre un número exacto visible en la UI.
