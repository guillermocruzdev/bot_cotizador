// PRUEBA del generador de mensajes de WhatsApp (3 casos).
// - Fase A: validateLength() unit.
// - Fase B: generateMessage() para restaurant / gym / lawyer.
// Sin DEEPSEEK_API_KEY usa la plantilla determinista (misma salida JSON).
// Ejecutar: npm run test:message

import {
  CATEGORY_TEMPLATES,
  generateMessage,
  validateLength,
  MAX_CHARS,
} from "../prospecting/outreach/message-chain";

let failures = 0;
let passed = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failures++;
    console.error(`  ❌ ${label}`);
  }
}

const CASES = [
  { name: "María", business: "La Esquina", category: "restaurant", location: "Puebla, México", company: "Agencia Web MX" },
  { name: "Carlos", business: "Iron Gym", category: "gym", location: "Guadalajara, México", company: "Agencia Web MX" },
  { name: "Ana", business: "Bufete Torres", category: "lawyer", location: "Monterrey, México", company: "Agencia Web MX" },
];

async function main(): Promise<void> {
  console.log("=== Fase A: validateLength() ===");
  assert(validateLength("") === false, "vacío → false");
  assert(validateLength("Hola") === true, "corto → true");
  assert(validateLength("x".repeat(MAX_CHARS)) === true, `${MAX_CHARS} chars → true`);
  assert(validateLength("x".repeat(MAX_CHARS + 1)) === false, `${MAX_CHARS + 1} chars → false`);
  console.log();

  console.log("=== Fase B: generateMessage() (3 casos) ===");
  for (const c of CASES) {
    console.log(`\n${c.category} @ ${c.location}`);
    const out = await generateMessage(c);
    console.log(`  message: ${out.message}`);
    console.log(`  char_count: ${out.char_count} | valid: ${out.valid}`);
    assert(typeof out.message === "string" && out.message.length > 0, "message no vacío");
    assert(out.char_count === out.message.length, "char_count coincide con la longitud real");
    assert(out.valid === true, "longitud <= 300 (valid)");
    assert(out.message.includes(c.company), "incluye el nombre de la empresa firmante");
  }
  console.log();

  console.log("=== Fase C: plantillas de categoría (5) ===");
  const cats = Object.keys(CATEGORY_TEMPLATES).sort();
  assert(
    JSON.stringify(cats) === JSON.stringify(["dentist", "gym", "lawyer", "restaurant", "retail"]),
    `5 categorías: ${cats.join(", ")}`
  );
  for (const cat of cats) {
    assert(CATEGORY_TEMPLATES[cat].benefit.length > 0, `${cat}: benefit definido`);
    assert(CATEGORY_TEMPLATES[cat].example.includes("[COMPANY]"), `${cat}: ejemplo firmado`);
  }
  console.log();

  console.log(`\nResumen: ${passed} OK · ${failures} FALLOS`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
