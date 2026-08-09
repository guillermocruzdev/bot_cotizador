/**
 * QA · classifyIntent con frases típicas de un cliente NO-técnico.
 * ¿"no entiendo de eso" se cuenta como rechazo (no) o como duda?
 */
import { classifyIntent } from "../lib/personality";

const frases = [
  "no sé, la verdad no entiendo de esas cosas. Usted haga lo que crea",
  "no sé, usted vea, lo que me convenga",
  "no entiendo nada de tecnología, usted vea",
  "yo de computadoras no sé nada",
  "lo que usted diga",
  "lo dejo en sus manos",
  "no sé, usted es el que sabe",
  "lo que usted recomiende",
  "sí, lo que usted recomiende",
  "no sé, pero quiero que me encuentren en Google",
  "no sé de esas cosas, pero sí quiero el mapa y el WhatsApp",
  "no quiero nada de eso", // control: rechazo real
  "sí, las que me convengan", // control: recomendaciones
  "no sé", // control: duda pura
];

for (const f of frases) {
  const r = classifyIntent(f);
  console.log(
    `${JSON.stringify(f).padEnd(70)} yes=${String(r.yes).padEnd(5)} no=${String(r.no).padEnd(5)} dontKnow=${String(r.dontKnow).padEnd(5)}`
  );
}
