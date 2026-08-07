/**
 * PROPUESTA COMERCIAL EN PDF (jsPDF)
 *
 * Documento formal de 6 páginas: portada + 5 secciones de venta.
 * Sigue las reglas estrictas: precio exacto solo en inversión, sin
 * tecnología, sin emojis, con garantía y CTA de cierre.
 */

import { jsPDF } from "jspdf";
import type { CommercialProposal } from "@/lib/commercial-proposal";

const PRIMARY: [number, number, number] = [30, 58, 138]; // azul profundo
const ACCENT: [number, number, number] = [37, 99, 235];
const DARK: [number, number, number] = [17, 24, 39];
const GRAY: [number, number, number] = [107, 114, 128];
const LIGHT: [number, number, number] = [241, 245, 249];

const M = 44; // margen
const W = 595; // ancho A4
const H = 842; // alto A4
const CW = W - M * 2; // ancho de contenido

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-MX")} MXN`;

export function downloadCommercialProposalPdf(p: CommercialProposal) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // ─────────────── PORTADA ───────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 300, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, 300, W, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text("PROPUESTA COMERCIAL", M, 120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(`Número: ${p.numero}`, M, 150);
  doc.text(`Fecha de emisión: ${p.fechaEmision}`, M, 172);
  doc.text(`Vigencia: ${p.fechaVigencia} (7 días naturales)`, M, 194);

  // Vendedor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Presenta:", M, 260);
  doc.setFontSize(13);
  doc.text(p.vendedor.nombre, M, 282);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GRAY);
  doc.text(p.vendedor.empresa, M, 302);
  doc.text(p.vendedor.email, M, 322);
  if (p.vendedor.whatsapp) doc.text(`WhatsApp: ${p.vendedor.whatsapp}`, M, 342);

  // Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Para:", W - M - doc.getTextWidth("Para:"), 260);
  doc.setFontSize(13);
  doc.text(p.cliente.negocio, W - M - doc.getTextWidth(p.cliente.negocio), 282);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GRAY);
  doc.text(`Contacto: ${p.cliente.contacto}`, W - M - doc.getTextWidth(`Contacto: ${p.cliente.contacto}`), 302);
  doc.text(`Giro: ${p.cliente.giro}`, W - M - doc.getTextWidth(`Giro: ${p.cliente.giro}`), 322);
  if (p.cliente.telefono) doc.text(`Tel/WhatsApp: ${p.cliente.telefono}`, W - M - doc.getTextWidth(`Tel/WhatsApp: ${p.cliente.telefono}`), 342);
  if (p.cliente.ciudad) doc.text(`Ubicación: ${p.cliente.ciudad}`, W - M - doc.getTextWidth(`Ubicación: ${p.cliente.ciudad}`), 362);

  // Espacios de logo
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.8);
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");
  doc.roundedRect(44, 400, 200, 70, 6, 6, "S");
  doc.text("Espacio para el logo del vendedor", 68, 436);
  doc.roundedRect(W - 44 - 200, 400, 200, 70, 6, 6, "S");
  doc.text("Espacio para el logo del cliente", W - 44 - 200 + 30, 436);

  doc.setTextColor(...GRAY);
  doc.setFontSize(10);
  doc.text(
    "Documento confidencial preparado para evaluar una colaboración profesional.",
    M,
    760
  );
  doc.text(`Propuesta ${p.numero} · ${p.fechaEmision}`, M, 780);

  // ─────────────── PÁGINA 1 · DIAGNÓSTICO ───────────────
  beginSection(doc, p, "1", "Diagnóstico del dolor");
  paragraph(doc, M, 150, "Queremos que este documento sea una conversación honesta, no una lista de precios.");
  paragraph(doc, M, 190, `Hoy, ${p.cliente.negocio} enfrenta una situación que se repite cada semana:`);
  quoteBox(doc, M, 230, p.dolor, CW);
  paragraph(doc, M, 360, `Esto no es un detalle menor. En su giro (${p.cliente.giro.toLowerCase()}), cada día sin una presencia profesional clara representa una oportunidad que se va con la competencia:`);
  quoteBox(doc, M, 430, p.costo_omision, CW);
  paragraph(doc, M, 560, "La buena noticia: este problema tiene solución, y en las siguientes páginas se la explicamos con claridad.");

  // Consejo del consultor: por qué ahora
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ACCENT);
  doc.text("Consejo de tu consultor: ¿por qué ahora?", M, 632);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  const ahora = doc.splitTextToSize(p.porQueAhora, CW);
  doc.text(ahora, M, 652);

  // ─────────────── PÁGINA 2 · LA SOLUCIÓN ───────────────
  beginSection(doc, p, "2", "La solución");
  paragraph(doc, M, 150, p.solucionIntro);
  paragraph(doc, M, 210, "No le hablaremos de tecnología: le hablaremos de resultados para su negocio.");
  bullets(doc, M, 260, p.solucionBullets);
  paragraph(doc, M, 560, `En resumen: ${p.cliente.negocio} dejará de perder oportunidades y empezará a recibir clientes de forma constante, con una imagen a la altura del trabajo que ya hace.`);

  // Asistentes IA (bots de LangChain): bloque informativo dentro de "La solución".
  if (p.bots.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ACCENT);
    doc.text("Asistentes inteligentes incluidos:", M, 598);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    let by = 620;
    for (const b of p.bots.slice(0, 3)) {
      const lines = doc.splitTextToSize(`• ${b.nombre}: ${b.descripcion}`, CW - 18);
      doc.text(lines, M + 14, by);
      by += lines.length * 15 + 6;
    }
    if (p.bots_cuota_mensual) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GRAY);
      const lines = doc.splitTextToSize(
        `Suscripción mensual de los asistentes: ${fmt(p.bots_cuota_mensual)} (motor de IA + actualizaciones)`,
        CW
      );
      doc.text(lines, M, by + 4);
    }
  }

  // ─────────────── PÁGINA 3 · ENTREGABLES ───────────────
  beginSection(doc, p, "3", "Entregables y su valor");
  paragraph(doc, M, 150, "Esto es exactamente lo que recibirá, en qué formato y con qué valor:");

  let y = 210;
  for (const e of p.entregables) {
    if (y > H - 150) {
      doc.addPage();
      pageHeader(doc, p);
      y = 120;
    }
    doc.setFillColor(...LIGHT);
    doc.roundedRect(M, y - 14, CW, 34, 6, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(e.nombre, M + 14, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ACCENT);
    doc.text(`Valor: ${fmt(e.valor)}`, W - M - doc.getTextWidth(`Valor: ${fmt(e.valor)}`) - 14, y + 5);
    y += 50;
  }

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(1);
  doc.line(M, y - 6, W - M, y - 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Valor total de la solución:", M, y + 12);
  doc.setTextColor(...ACCENT);
  doc.text(`${fmt(p.subtotal)} + IVA`, W - M - doc.getTextWidth(`${fmt(p.subtotal)} + IVA`), y + 12);

  y += 60;
  paragraph(doc, M, y, `Plazo de entrega: ${p.diasEntrega} días a partir de la confirmación del anticipo y la entrega de materiales.`);

  // ─────────────── PÁGINA 4 · INVERSIÓN ───────────────
  beginSection(doc, p, "4", "Inversión y condiciones");
  paragraph(doc, M, 150, `La inversión total para que ${p.cliente.negocio} cuente con esta solución es de:`);

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(M, 190, CW, 80, 10, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(fmt(p.total), M + 20, 240);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("(IVA incluido)", M + 20, 258);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Forma de pago:", M, 320);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  paymentRow(doc, M, 350, "Anticipo para iniciar (50%)", fmt(p.anticipo));
  paymentRow(doc, M, 380, "Contra entrega (50%)", fmt(p.saldo));
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`Desglose: subtotal ${fmt(p.subtotal)} + IVA (16%) ${fmt(p.iva)}.`, M, 410);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Condiciones:", M, 460);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  bullets(doc, M, 490, [
    `Incluye ${p.rondasRevision} rondas de revisiones sobre el alcance acordado.`,
    `Revisiones adicionales fuera de esas ${p.rondasRevision} rondas tendrán costo adicional.`,
    "Los tiempos de entrega inician al confirmar el anticipo y recibir los materiales.",
  ]);

  // El proceso en 4 pasos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("El proceso en 4 pasos:", M, 628);
  let pstep = 650;
  p.proceso.forEach((step, i) => {
    const lines = doc.splitTextToSize(step, CW - 26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ACCENT);
    doc.text(`${i + 1}.`, M, pstep);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(lines, M + 14, pstep);
    pstep += lines.length * 13 + 7;
  });

  // ─────────────── PÁGINA 5 · GARANTÍA Y CTA ───────────────
  beginSection(doc, p, "5", "Garantía y siguiente paso");
  paragraph(doc, M, 150, `Su proyecto queda cubierto con una garantía de ${p.garantiaDias} días de ajustes menores posteriores a la entrega. Su tranquilidad es parte del trato.`);

  doc.setFillColor(...LIGHT);
  doc.roundedRect(M, 230, CW, 130, 10, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY);
  doc.text("Para iniciar:", M + 20, 265);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.setTextColor(...DARK);
  const ctaLines = doc.splitTextToSize(p.cta, CW - 40);
  doc.text(ctaLines, M + 20, 290);

  paragraph(doc, M, 420, "Estamos listos para arrancar en cuanto confirme. Este proyecto está pensado para que su negocio recupere la inversión con muy pocos clientes nuevos.");

  // Mi compromiso
  doc.setFillColor(...LIGHT);
  doc.roundedRect(M, 470, CW, 104, 10, 10, "F");
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(1.2);
  doc.line(M, 470, W - M, 470);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text("Mi compromiso contigo", M + 18, 500);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  const comp = doc.splitTextToSize(p.compromiso, CW - 36);
  doc.text(comp, M + 18, 524);

  // Nota legal final
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.6);
  doc.line(M, H - 90, W - M, H - 90);
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  const nota = doc.splitTextToSize(p.notaLegal, CW);
  doc.text(nota, M, H - 74);

  // ─────────────── Guardar ───────────────
  const slug = p.cliente.negocio.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  doc.save(`propuesta-comercial-${slug || "proyecto"}-${p.numero}.pdf`);
}

// ─── Helpers de página ─────────────────────────────────────────────

function pageHeader(doc: jsPDF, p: CommercialProposal) {
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 44, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("PROPUESTA COMERCIAL", M, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(p.numero, W - M - doc.getTextWidth(p.numero), 28);
}

function beginSection(doc: jsPDF, p: CommercialProposal, num: string, title: string) {
  doc.addPage();
  pageHeader(doc, p);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...DARK);
  doc.text(`${num} · ${title}`, M, 100);
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(2);
  doc.line(M, 112, M + 60, 112);

  // Pie con número de página (más profesional)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(`Propuesta ${p.numero} · Página ${doc.getNumberOfPages()} de 6`, M, H - 30);
}

function paragraph(doc: jsPDF, x: number, y: number, text: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.setTextColor(...DARK);
  const lines = doc.splitTextToSize(text, CW);
  doc.text(lines, x, y);
}

function quoteBox(doc: jsPDF, x: number, y: number, text: string, w: number) {
  doc.setFillColor(...LIGHT);
  doc.roundedRect(x, y, w, 90, 8, 8, "F");
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(3);
  doc.line(x, y + 8, x, y + 82);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  const lines = doc.splitTextToSize(text, w - 36);
  doc.text(lines, x + 22, y + 28);
}

function bullets(doc: jsPDF, x: number, y: number, items: string[]) {
  let yy = y;
  for (const item of items) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(item, CW - 18);
    doc.setFillColor(...ACCENT);
    doc.circle(x + 3, yy + 3, 2, "F");
    doc.text(lines, x + 14, yy);
    yy += lines.length * 16 + 8;
  }
}

function paymentRow(doc: jsPDF, x: number, y: number, label: string, value: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(label, x, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT);
  doc.text(value, W - M - doc.getTextWidth(value), y);
}
