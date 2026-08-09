/**
 * QA · Verificación puntual de parsers (persona no-técnica)
 * Comprueba extractDeadline y extractSections con frases reales de la persona.
 */
import { extractDeadline, extractBudgetAmount } from "../lib/personality";

const cases: Array<[string, (s: string) => unknown]> = [
  // Fecha
  ["para el otro mes, y de dinero pues… no sé cuánto cobra uno de esto", extractDeadline],
  ["para el próximo mes", extractDeadline],
  ["para el mes que viene, y no sé cuánto cobran", extractDeadline],
  ["para marzo", extractDeadline],
  ["en unas 3 semanas", extractDeadline],
  // Presupuesto
  ["¿Cree que con unos 5 mil alcance? No tengo mucho", extractBudgetAmount],
  ["tengo como 6 o 7 mil", extractBudgetAmount],
  ["póngale como 6 mil", extractBudgetAmount],
  ["mi presupuesto es de unos 15 mil pesos", extractBudgetAmount],
];

for (const [txt, fn] of cases) {
  console.log(`${fn === extractDeadline ? "FECHA  " : "MONTO  "}${JSON.stringify(txt)} → ${JSON.stringify(fn(txt))}`);
}

// NOTA: extractSections es privado de conversation-flow (no se exporta);
// se valida indirectamente vía la estructura capturada en la conversación
// completa (scripts-tmp/qa-no-tecnico.ts).
