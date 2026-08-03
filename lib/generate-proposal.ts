/**
 * FASE 2 · GENERADOR DE PROPUESTA COMERCIAL (PDF de 6 páginas)
 *
 * `generateProposal(clientData)` produce un documento profesional con
 * formato estricto que elimina los errores tipográficos comunes:
 *  - Fechas siempre "DD de Mes de AAAA" (espacio entre números y palabras).
 *  - Montos siempre "$5,600 MXN" (espacio antes de MXN, sin decimales).
 *  - Entregables en cuadrícula con precio individual, subtotal/IVA/TOTAL
 *    alineados (nada de precios repetidos sin contexto).
 *  - Encabezado "PROPUESTA COMERCIAL [NÚMERO]" + divisor en páginas 2-6.
 *  - Pie de página centrado: "Página X de 6".
 *  - Vigencia calculada con `new Date()` + 7 días naturales.
 *  - Sin placeholders visibles: si un dato falta, se omite la línea.
 *
 * Margen 2.5 cm, colores #1a1a1a (primario) y #2563eb (acento).
 */

import { jsPDF } from "jspdf";
import type { ClientData } from "@/lib/quote-engine";
import {
  calculateQuote,
  fechaVigencia,
  formatFecha,
  formatNum,
  formatPesos,
  generarNumeroPropuesta,
  TIPO_WEB_INFO,
} from "@/lib/quote-engine";
import { detectarGiro } from "@/lib/industry-pricing";

// ─── Constantes de layout ──────────────────────────────────────────

const W = 595; // ancho A4 (pt)
const H = 842; // alto A4 (pt)
const M = 71; // margen 2.5 cm ≈ 71 pt
const CW = W - M * 2; // ancho de contenido

const PRIMARIO: [number, number, number] = [26, 26, 26]; // #1a1a1a
const ACENTO: [number, number, number] = [37, 99, 235]; // #2563eb
const GRIS: [number, number, number] = [150, 150, 150];
const DIVISOR: [number, number, number] = [229, 229, 229]; // #e5e5e5
const FONDO: [number, number, number] = [245, 247, 250];

// Datos del vendedor (desde .env; se omiten las líneas vacías)
const VENDEDOR = {
  nombre: process.env.NEXT_PUBLIC_DEVELOPER_NAME ?? "",
  empresa: process.env.NEXT_PUBLIC_AGENCY_NAME ?? "",
  email: process.env.NEXT_PUBLIC_DEVELOPER_EMAIL ?? "",
  whatsapp: process.env.NEXT_PUBLIC_DEVELOPER_WHATSAPP ?? "",
};

const TOTAL_PAGINAS = 6;

// ─── Generador principal ───────────────────────────────────────────

export function generateProposal(clientData: ClientData) {
  const cd = clientData;
  const quote = calculateQuote(cd);
  const giro = detectarGiro(cd.giro, cd.tipoWeb);

  const emision = new Date();
  const vigencia = fechaVigencia(emision);
  const numero = generarNumeroPropuesta(emision);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("helvetica");

  // ─────────── PÁGINA 1 · PORTADA ───────────
  drawPortada(doc, cd, numero, emision, vigencia);

  // ─────────── PÁGINA 2 · DIAGNÓSTICO DEL DOLOR ───────────
  beginPagina(doc, numero, 2, "1 · Diagnóstico del dolor");
  let y = 150;
  y = paragraph(doc, y, "Queremos que este documento sea una conversación honesta, no una lista de precios.");
  y = paragraph(doc, y, `Hoy, ${cd.nombre} enfrenta una situación que se repite cada semana:`);
  y = cita(doc, y, giro.dolor);
  y = paragraph(doc, y, `Esto no es un detalle menor. En su giro (${cd.giro}), cada día sin una presencia profesional clara representa una oportunidad que se va con la competencia:`);
  y = cita(doc, y, giro.costo_omision);
  y += 6;
  y = bloqueConsejo(doc, y, "Consejo de tu consultor: ¿por qué ahora?", giro.pitch);

  // ─────────── PÁGINA 3 · LA SOLUCIÓN ───────────
  beginPagina(doc, numero, 3, "2 · La solución");
  y = 150;
  y = paragraph(doc, y, "No le hablaremos de tecnología: le hablaremos de resultados para su negocio.");
  y += 4;
  const beneficios = [
    ...giro.beneficios.slice(0, 3),
    `Tendrás una ${TIPO_WEB_INFO[cd.tipoWeb].label.toLowerCase()} lista para trabajar por ti.`,
    cd.tipoWeb === "agenda"
      ? "Tus clientes podrán agendar día y hora sin llamadas de por medio."
      : "Tus clientes podrán contactarte y pedir información con un solo clic.",
    cd.dominioHosting
      ? "Tu dominio y hosting propios, listos para que te encuentren en Google."
      : "Tu sitio listo para publicarse donde ya tienes tu dominio.",
    cd.branding
      ? "Una identidad visual simple que hace que te tomen más en serio."
      : null,
  ].filter((b): b is string => Boolean(b));
  y = bullets(doc, y, beneficios);
  y += 6;
  y = paragraph(doc, y, `En resumen: ${cd.nombre} dejará de perder oportunidades y empezará a recibir clientes de forma constante, con una imagen a la altura del trabajo que ya hace.`);

  // ─────────── PÁGINA 4 · ENTREGABLES Y VALOR ───────────
  beginPagina(doc, numero, 4, "3 · Entregables y su valor");
  y = 150;
  y = paragraph(doc, y, "Esto es exactamente lo que recibirá, en qué formato y con qué valor:");

  for (const item of quote.lineItems) {
    y = entregableRow(doc, y, item.nombre, item.descripcion, formatPesos(item.precio));
  }

  // Resumen alineado (subtotal / IVA / TOTAL)
  y += 10;
  resumenLine(doc, y, "Subtotal", formatPesos(quote.subtotal));
  y += 22;
  resumenLine(doc, y, `IVA (${Math.round(16)}%)`, formatPesos(quote.iva));
  y += 22;
  doc.setDrawColor(...PRIMARIO);
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARIO);
  doc.text("TOTAL", M, y);
  doc.setTextColor(...ACENTO);
  doc.setFontSize(16);
  doc.text(formatPesos(quote.total), W - M - doc.getTextWidth(formatPesos(quote.total)), y);
  y += 36;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRIS);
  doc.text(`Plazo de entrega: ${quote.diasEntrega} días a partir de la confirmación del anticipo.`, M, y);

  // ─────────── PÁGINA 5 · INVERSIÓN Y CONDICIONES ───────────
  beginPagina(doc, numero, 5, "4 · Inversión y condiciones");
  y = 150;
  y = paragraph(doc, y, `La inversión total para que ${cd.nombre} cuente con esta solución es de:`);

  // Bloque de total
  doc.setFillColor(...PRIMARIO);
  doc.roundedRect(M, y + 8, CW, 70, 10, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(formatPesos(quote.total), M + 20, y + 44);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("IVA incluido", M + 20, y + 62);
  y += 120;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARIO);
  doc.text("Forma de pago:", M, y);
  y += 24;
  tablaPago(doc, y, "Anticipo para iniciar (50%)", formatPesos(quote.anticipo));
  y += 26;
  tablaPago(doc, y, "Contra entrega (50%)", formatPesos(quote.saldo));
  y += 46;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARIO);
  doc.text("El proceso en 4 pasos:", M, y);
  y += 22;
  const pasos = [
    "Autoriza la propuesta respondiendo al correo con la frase AUTORIZO LA PROPUESTA.",
    "Confirma el anticipo del 50% para reservar tu lugar en la agenda.",
    "Desarrollamos el proyecto en los plazos pactados, con avances claros para ti.",
    "Recibes tu solución terminada, con garantía de 15 días de ajustes menores.",
  ];
  pasos.forEach((paso, i) => {
    const lines = doc.splitTextToSize(paso, CW - 26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ACENTO);
    doc.text(`${i + 1}.`, M, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PRIMARIO);
    doc.text(lines, M + 14, y);
    y += lines.length * 14 + 6;
  });

  // ─────────── PÁGINA 6 · GARANTÍA Y SIGUIENTE PASO ───────────
  beginPagina(doc, numero, 6, "5 · Garantía y siguiente paso");
  y = 150;
  y = paragraph(doc, y, `Su proyecto queda cubierto con una garantía de 15 días de ajustes menores posteriores a la entrega. Su tranquilidad es parte del trato.`);

  // CTA exacto
  doc.setFillColor(...FONDO);
  doc.roundedRect(M, y + 10, CW, 110, 10, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...ACENTO);
  doc.text("Para iniciar:", M + 20, y + 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.setTextColor(...PRIMARIO);
  const cta = doc.splitTextToSize(
    `Responde con "AUTORIZO LA PROPUESTA" y realiza el pago del anticipo. El proyecto se agenda al confirmar el anticipo.`,
    CW - 40
  );
  doc.text(cta, M + 20, y + 66);
  y += 150;

  y = paragraph(doc, y, "Estamos listos para arrancar en cuanto confirme. Este proyecto está pensado para que recupere la inversión con muy pocos clientes nuevos.");

  // Firma del consultor
  y += 60;
  doc.setDrawColor(...PRIMARIO);
  doc.setLineWidth(0.8);
  doc.line(M, y, M + 180, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARIO);
  const firmaNombre = VENDEDOR.nombre || "Consultor";
  doc.text(firmaNombre, M, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...GRIS);
  doc.text(`${VENDEDOR.empresa || "Consultoría"} · ${VENDEDOR.email || ""}`.replace(/ · $/, ""), M, y + 30);

  // ─────────── Guardar ───────────
  const slug = cd.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  doc.save(`propuesta-${slug || "proyecto"}-${numero}.pdf`);
}

// ─── Portada ──────────────────────────────────────────────────────

function drawPortada(
  doc: jsPDF,
  cd: ClientData,
  numero: string,
  emision: Date,
  vigencia: Date
) {
  // Barra de acento superior
  doc.setFillColor(...ACENTO);
  doc.rect(0, 0, W, 10, "F");

  doc.setTextColor(...PRIMARIO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text("PROPUESTA COMERCIAL", W / 2, 170, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...GRIS);
  doc.text(numero, W / 2, 196, { align: "center" });

  doc.setDrawColor(...DIVISOR);
  doc.setLineWidth(1);
  doc.line(M, 230, W - M, 230);

  // Vendedor (izquierda)
  let x = M;
  let y = 300;
  columnaTitulo(doc, x, y, "Presenta");
  const vendedorLines = [
    VENDEDOR.nombre,
    VENDEDOR.empresa,
    VENDEDOR.email,
    VENDEDOR.whatsapp ? `WhatsApp: ${VENDEDOR.whatsapp}` : null,
  ].filter((l): l is string => Boolean(l));
  if (vendedorLines.length === 0) vendedorLines.push("Consultoría de desarrollo web");
  vendedorLines.forEach((linea, i) => {
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.setFontSize(11);
    doc.setTextColor(...(i === 0 ? PRIMARIO : GRIS));
    doc.text(linea, x, y + 26 + i * 20);
  });

  // Cliente (derecha)
  x = W - M - 200;
  y = 300;
  columnaTitulo(doc, x, y, "Para");
  const clienteLines = [
    cd.nombre,
    `Giro: ${cd.giro}`,
    cd.telefono ? `Tel/WhatsApp: ${cd.telefono}` : null,
    cd.ubicacion ? `Ubicación: ${cd.ubicacion}` : null,
  ].filter((l): l is string => Boolean(l));
  clienteLines.forEach((linea, i) => {
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.setFontSize(11);
    doc.setTextColor(...(i === 0 ? PRIMARIO : GRIS));
    doc.text(linea, x, y + 26 + i * 20);
  });

  // Fechas centradas
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARIO);
  doc.text(`Fecha de emisión: ${formatFecha(emision)}`, W / 2, 520, { align: "center" });
  doc.text(`Vigencia: ${formatFecha(vigencia)} (7 días naturales)`, W / 2, 544, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text("Documento confidencial preparado para evaluar una colaboración profesional.", W / 2, 700, { align: "center" });
  doc.text(`Propuesta ${numero}`, W / 2, 720, { align: "center" });
}

function columnaTitulo(doc: jsPDF, x: number, y: number, texto: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ACENTO);
  doc.text(texto, x, y);
}

// ─── Encabezado y pie de las páginas 2-6 ───────────────────────────

function beginPagina(doc: jsPDF, numero: string, pagina: number, titulo: string) {
  doc.addPage();

  // Encabezado: "PROPUESTA COMERCIAL [NÚMERO]" + divisor 1px
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARIO);
  doc.text(`PROPUESTA COMERCIAL  ${numero}`, M, 50);
  doc.setDrawColor(...DIVISOR);
  doc.setLineWidth(1);
  doc.line(M, 58, W - M, 58);

  // Título de la sección
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...PRIMARIO);
  doc.text(titulo, M, 110);
  doc.setDrawColor(...ACENTO);
  doc.setLineWidth(2);
  doc.line(M, 122, M + 60, 122);

  // Pie centrado: "Página X de 6"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  doc.text(`Página ${pagina} de ${TOTAL_PAGINAS}`, W / 2, H - 30, { align: "center" });
}

// ─── Bloques de texto (siempre con salto de línea limpio) ─────────

function paragraph(doc: jsPDF, y: number, texto: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.setTextColor(...PRIMARIO);
  const lines = doc.splitTextToSize(texto, CW);
  doc.text(lines, M, y);
  return y + lines.length * 16 + 6;
}

function cita(doc: jsPDF, y: number, texto: string): number {
  doc.setFillColor(...FONDO);
  doc.roundedRect(M, y, CW, 72, 8, 8, "F");
  doc.setDrawColor(...ACENTO);
  doc.setLineWidth(2.5);
  doc.line(M, y + 8, M, y + 64);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11.5);
  doc.setTextColor(...PRIMARIO);
  const lines = doc.splitTextToSize(texto, CW - 36);
  doc.text(lines, M + 22, y + 30);
  return y + 92;
}

function bloqueConsejo(doc: jsPDF, y: number, titulo: string, texto: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ACENTO);
  doc.text(titulo, M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARIO);
  const lines = doc.splitTextToSize(texto, CW);
  doc.text(lines, M, y + 20);
  return y + 20 + lines.length * 16 + 4;
}

function bullets(doc: jsPDF, y: number, items: string[]): number {
  for (const item of items) {
    const lines = doc.splitTextToSize(item, CW - 18);
    doc.setFillColor(...ACENTO);
    doc.circle(M + 4, y + 3, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(...PRIMARIO);
    doc.text(lines, M + 14, y);
    y += lines.length * 16 + 7;
  }
  return y;
}

// ─── Entregables y resumen ─────────────────────────────────────────

function entregableRow(
  doc: jsPDF,
  y: number,
  nombre: string,
  descripcion: string,
  precio: string
): number {
  doc.setFillColor(...FONDO);
  doc.roundedRect(M, y - 14, CW, 40, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARIO);
  doc.text(nombre, M + 14, y + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...GRIS);
  const desc = doc.splitTextToSize(descripcion, CW - 130);
  doc.text(desc.slice(0, 1), M + 14, y + 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ACENTO);
  doc.text(precio, W - M - 14 - doc.getTextWidth(precio), y + 1);
  return y + 50;
}

function resumenLine(doc: jsPDF, y: number, label: string, valor: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARIO);
  doc.text(label, M, y);
  doc.text(valor, W - M - doc.getTextWidth(valor), y);
}

function tablaPago(doc: jsPDF, y: number, label: string, valor: string) {
  doc.setFillColor(...FONDO);
  doc.roundedRect(M, y - 12, CW, 30, 6, 6, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.setTextColor(...PRIMARIO);
  doc.text(label, M + 14, y + 3);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACENTO);
  doc.text(valor, W - M - 14 - doc.getTextWidth(valor), y + 3);
}
