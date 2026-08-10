# 🎨 BRAND SHEET · Nexora

> Identidad de marca de la agencia **Nexora**. Fuente de verdad de marca para el sitio
> vitrina (FASE 0 de `docs/prompts/AGENCIA-CRECIMIENTO-ROO.md`). Decisiones FINALES:
> **no re-discutir**. Si algo se cambia, actualizar este documento Y los assets en `public/brand/`.

---

## 1. Identidad

| Atributo      | Valor                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Marca**     | Nexora                                                                                                           |
| **Tagline**   | "El nexo entre tu negocio y tus clientes."                                                                       |
| **Línea**     | "Webs que venden. Hechas con IA."                                                                                |
| **Variantes** | "Tu web profesional en días, no en meses." · "El vínculo entre tu negocio y el mundo digital."                   |
| **Idioma**    | Español (México). Trato **"tú"** en el sitio web.                                                                |
| **Tono**      | Consultor senior, cercano, directo, sin jerga. Cero promesas no verificables.                                    |
| **Origen**    | Latín _nexus_ ("nexo, vínculo") + sufijo _-ora_ ("la que conecta"): **el nexo entre tu negocio y sus clientes**. |

---

## 2. Paleta de color (tokens Tailwind)

| Token         | Hex         | Uso                                                                                      |
| ------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `brand-600`   | `#2563EB`   | Primario (azul eléctrico) — confianza/empresa; marca (contorno hexágono, barra contorno) |
| `brand-700`   | `#1D4ED8`   | Fin del gradiente primario; borde del nodo central                                       |
| `night-900`   | `#0F172A`   | Tinta (texto sobre claro / fondo en dark, footer, favicon)                               |
| `night-700`   | `#1E293B`   | Texto secundario / rejillas técnicas                                                     |
| `emerald-500` | `#10B981`   | Éxito / CTA secundario ("vende/crece") — solo acentos y texto grande                     |
| `surface-50`  | `#FAFAFA`   | Fondo claro de secciones                                                                 |
| `whatsapp`    | `#25D366`   | Botón WhatsApp (nunca otro verde para WA)                                                |
| Semánticos    | slate scale | Bordes, grises, `error #EF4444`                                                          |

**Reglas de uso:**

- Gradiente primario `#2563EB → #1D4ED8` para CTAs, acentos y la pieza sólida del logo.
- Azul = confianza (corporativo). Emerald = crecimiento/acción. Sin naranjas ni violetas llamativos (perfil sobrio-profesional).
- Contraste mínimo AA (4.5:1) para texto normal; ver §6.

---

## 3. Tipografía

| Rol             | Fuente             | Pesos   | Nota                             |
| --------------- | ------------------ | ------- | -------------------------------- |
| Display/títulos | **Space Grotesk**  | 500–700 | Personalidad tech-creativa       |
| Body/UI         | **Inter**          | 400–600 | Legibilidad, cuerpo              |
| Mono/acento     | **JetBrains Mono** | 400–700 | Código, badges, "N0–N5", precios |

- Self-hosted con `next/font` (`display: swap`, sin FOIT). Variables: `--font-heading` / `--font-sans` / `--font-mono`.
- La tipografía "terminal/código" es un sello de marca: usar en eyebrows, badges de nivel y la línea de código del hero.
- Las fuentes también están instaladas a nivel de sistema (fontconfig) para rasterizado SVG→PNG local.

---

## 4. Logo

### 4.1 Concepto

**Hexágono-nodo** (símbolo de red/conexión). Dos piezas dentro de un hexágono de contorno:

1. **Pieza sólida** con gradiente `#2563EB → #1D4ED8` (barra izquierda + enlace diagonal).
2. **Pieza de contorno** (barra derecha).
3. **Nodo central** blanco con borde `brand-700` en el centro exacto del hexágono — evoca el enlace
   entre dos puntos ("el nexo") y, junto con la diagonal, se lee como una **"N" estilizada**.

Geometría sobre cuadrícula de 64×64: hexágono de radio 27, barras de 9.5 de ancho con radio 4.75,
diagonal 7.5 con extremos redondos, nodo r=5.5.

### 4.2 Versiones

| Archivo                                   | Uso                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `public/brand/logo-full.svg`              | Mark + wordmark **"Nexora"** (Space Grotesk como `<text>`, NO paths). Fondos claros. 240×64. |
| `public/brand/logo-mono.svg`              | Una sola tinta **blanca** (footer dark, fondos oscuros). 240×64.                             |
| `public/brand/mark.svg`                   | Solo el símbolo (avatar, headers compactos, favicon). 64×64.                                 |
| `public/brand/favicon.svg` / `.png` (32)  | Favicon del navegador (marca sobre tile night redondeado).                                   |
| `public/brand/apple-touch-icon.png` (180) | Icono iOS/Android (misma composición).                                                       |
| `public/brand/og.png` (1200×630)          | Open Graph / redes sociales (mark + wordmark + tagline sobre night).                         |

### 4.3 Espacio de respiro

- **Unidad X = altura del mark** (64 en el sistema de diseño).
- Espacio mínimo libre alrededor del logo: **1X** en los 4 lados (0.5X en usos muy compactos).
- Nada (texto, bordes de componentes, otros elementos) debe invadir esa zona.

### 4.4 Tamaños mínimos

| Versión       | Mínimo legible                                                                       |
| ------------- | ------------------------------------------------------------------------------------ |
| Mark          | **16px** (favicon / tab). A 16px el nodo se lee como punto blanco; no bajar de 14px. |
| Logo completo | **120px** de ancho (a menos, usar solo el mark).                                     |

### 4.5 Reglas de construcción

- El wordmark SIEMPRE es texto (`<text>`), nunca convertido a paths (legible, accesible, editable).
- El mark se escala uniformemente (misma proporción), nunca se estira.
- Verificar legibilidad a 16/32/64/240px y sobre fondo claro Y oscuro.

---

## 5. Usos correctos e incorrectos

**Correcto:**

- ✅ `logo-full` sobre blanco / `surface-50` / imágenes claras.
- ✅ `logo-mono` (blanco) sobre `night-900`, footer, fondos de foto oscuros.
- ✅ `mark` como avatar, favicon, marca de agua discreta.
- ✅ Fondo `night-900` + mark color en favicon y tarjetas.

**Incorrecto:**

- ❌ No estirar, rotar, inclinar ni reflejar el logo.
- ❌ No cambiar colores de marca ni aplicar otros degradados.
- ❌ No poner `logo-full` (color) sobre fotos o fondos de color de baja legibilidad.
- ❌ No añadir sombras, contornos ni efectos que "mueran" al reducir.
- ❌ No separar el mark del wordmark en `logo-full` (para composiciones libres usar `mark` + texto tipográfico).
- ❌ No usar el verde `whatsapp` para nada que no sea el botón de WhatsApp.

---

## 6. Accesibilidad (contraste AA)

Contrastes calculados sobre sus usos típicos (WCAG, ratio):

| Combinación                                   | Ratio   | ¿AA? | Nota                                                                                                                                                 |
| --------------------------------------------- | ------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#0F172A` (night-900) sobre blanco            | ≈17.8:1 | ✅   | Texto principal.                                                                                                                                     |
| `#2563EB` (brand-600) sobre blanco            | ≈5.2:1  | ✅   | Texto normal AA.                                                                                                                                     |
| `#1D4ED8` (brand-700) sobre blanco            | ≈6.7:1  | ✅   | Botones gradiente + texto blanco.                                                                                                                    |
| Texto blanco sobre `#1D4ED8`/`#2563EB`        | ≥4.5:1  | ✅   | CTAs primarios.                                                                                                                                      |
| `#10B981` (emerald-500) sobre blanco          | ≈2.5:1  | ❌   | **No** usar como texto normal: solo acentos/gráficos o texto grande (≥18.66px bold / 24px). Para texto, usar verde oscuro o night.                   |
| Texto `#0F172A` sobre `#25D366` (WA)          | ≈9.0:1  | ✅   | Botón WhatsApp: **texto night sobre verde** (o usar verde oscuro `#1DA851` con texto blanco). Evitar texto blanco sobre `#25D366` (≈2:1, no cumple). |
| `#94A3B8` / `#64748B` (slate) sobre `#0F172A` | ≥4.5:1  | ✅   | Textos secundarios en dark.                                                                                                                          |

Reglas: focus rings visibles en todo lo interactivo; estados hover/pressed/disabled; respetar
`prefers-reduced-motion` en animaciones. El logo en sí es decorativo: acompañar siempre del nombre
"Nexora" en texto accesible (`aria-label` / texto visible).

---

## 7. Assets en disco

```
public/brand/
  logo-full.svg · logo-mono.svg · mark.svg
  favicon.svg · favicon.png (32) · apple-touch-icon.png (180)
  og.svg · og.png (1200×630)
docs/BRAND-SHEET.md   ← este documento
```

- Los SVG son la fuente (vectoriales, escalables). Los PNG se regeneran desde los SVG
  (`sharp` + fuentes de sistema) cuando cambie un SVG.
- Fuentes de sistema instaladas para render local: Space Grotesk, Inter, JetBrains Mono (variable).
