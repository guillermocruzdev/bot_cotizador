/**
 * Verificación del sistema de dos fases (cotización + propuesta 6 páginas).
 * Ejecutar: npx tsx scripts/sample-quote.ts
 */
import {
  buildClientData,
  calculateQuote,
  formatFecha,
  formatPesos,
  fechaVigencia,
  generarNumeroPropuesta,
} from "../lib/quote-engine";
import { generateProposal } from "../lib/generate-proposal";

// Datos del cliente (como los recopilaría el chatbot de diagnóstico)
const clientData = buildClientData({
  nombre: "Consultorio Dental Sonrisa",
  giro: "consultorio dental",
  telefono: "8341234567",
  ubicacion: "Madero, Tamaulipas",
  tipoWeb: "agenda",
  dominioHosting: true,
  branding: true,
  presupuesto: "10-25k",
});

const quote = calculateQuote(clientData);
const hoy = new Date();

console.log("=== COTIZACIÓN ===");
quote.lineItems.forEach((l) =>
  console.log(`  ${l.nombre} (${l.descripcion}) = ${formatPesos(l.precio)}`)
);
console.log(`  Subtotal = ${formatPesos(quote.subtotal)}`);
console.log(`  IVA 16%  = ${formatPesos(quote.iva)}`);
console.log(`  TOTAL    = ${formatPesos(quote.total)}`);
console.log(`  Anticipo 50% = ${formatPesos(quote.anticipo)} | Saldo = ${formatPesos(quote.saldo)}`);
console.log(`  Días entrega = ${quote.diasEntrega}`);

console.log("\n=== FORMATO DE FECHAS (anti-pegado) ===");
console.log(`  Emisión: ${formatFecha(hoy)}`);
console.log(`  Vigencia: ${formatFecha(fechaVigencia(hoy))} (7 días naturales)`);
console.log(`  Número: ${generarNumeroPropuesta(hoy)}`);

console.log("\n=== GENERANDO PDF (6 páginas) ... ===");
generateProposal(clientData);
console.log("PDF generado OK.");
