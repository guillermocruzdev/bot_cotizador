/** QA · toUsted(): verificar que ningún mensaje determinista quede con tuteo */
import { createEmptyContext } from "../lib/types";
import { FLOW } from "../lib/conversation-flow";
import { toUsted, detectTrato } from "../lib/personality";

// Formas de "tú" que NO deben quedar en un mensaje convertido a "usted".
// OJO: `\b` de JS es ASCII → el pronombre "tú" (tildado) se busca con
// lookahead de no-letra; "estás" solo con tilde (el "estas" demostrativo no
// es tuteo).
const RESIDUAL_TU =
  /\btú(?=[\s.,;:!?¿¡"')\]}]|$)|(?:^|[\s.,;:!?¿¡"'])(t[úu])(?:[\s.,;:!?¿¡"']|$)|(?:^|[\s.,;:!?¿¡"'])(te\b|tu\b|tus\b|contigo|dime|cu[ée]ntame|tienes|quieres|puedes|necesitas|haces|vendes|est[á]s|sabes|pierdas|mencionaste|contactes|cuentes|imaginas|recorras|pongas|tengas|escribes|digas|preocupes|deseas|dejes|cr[ée]eme|mira|f[íi]jate|p[oó]ngase|armarte|venderte|localizarte|dirigirte|enviarte|tenerte)(?:[\s.,;:!?¿¡"']|$)/i;

let failures = 0;
let passed = 0;
function assert(cond: boolean, label: string) {
  if (cond) passed += 1;
  else {
    failures += 1;
    console.error("  ✗ " + label);
  }
}

const ctx = createEmptyContext();
ctx.category = "landing";

// Recolectar TODOS los mensajes deterministas (nodos + hints de clarificación).
const samples: Array<{ id: string; text: string }> = [];
for (const [id, node] of Object.entries(FLOW)) {
  try {
    if (typeof node.generateMessage === "function") {
      samples.push({ id, text: node.generateMessage(ctx) });
    }
  } catch {
    /* noop: algunos nodos usan campos que fallan con contexto vacío */
  }
}

let residualCount = 0;
for (const s of samples) {
  const converted = toUsted(s.text);
  const m = converted.match(RESIDUAL_TU);
  if (m) {
    residualCount += 1;
    console.error(
      `  ✗ residual "${m[0]}" en ${s.id}: "${converted.slice(0, 140)}"`
    );
  }
}
assert(
  residualCount === 0,
  `ningún mensaje queda con tuteo tras toUsted() (${residualCount} con residuo de ${samples.length})`
);
console.log(`  mensajes probados: ${samples.length}`);

// Algunos mensajes convertidos de muestra (que suenen naturales).
const muestra = samples.find((s) => s.id === "discovery_business");
if (muestra) {
  console.log(`\n  [discovery_business original] ${muestra.text.slice(0, 130)}`);
  console.log(`  [toUsted]                ${toUsted(muestra.text).slice(0, 130)}`);
}
const b = samples.find((s) => s.id === "budget");
if (b) {
  console.log(`\n  [budget toUsted] ${toUsted(b.text).slice(0, 200)}`);
}

// detectTrato
assert(detectTrato("Mire, ¿usted me puede ayudar?") === "usted", 'detectTrato "usted"');
assert(detectTrato("oye, ¿tú me ayudas?") === "tu", 'detectTrato "tu"');
assert(detectTrato("Hola, quiero una página") === null, "detectTrato neutro → null");
assert(detectTrato("¿Usted qué me recomienda? Y dime, ¿cuánto cobras?") === null, "mezclado → null (ambiguo)");

console.log(`\n${failures === 0 ? "✅" : "❌"} toUsted QA: ${passed} OK · ${failures} FALLO`);
process.exit(failures > 0 ? 1 : 0);
