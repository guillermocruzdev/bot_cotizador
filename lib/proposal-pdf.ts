/**
 * Genera y descarga la propuesta como PDF (lado cliente, con jsPDF).
 * El documento sigue el estilo de la pantalla de resultados:
 * header con marca, precio grande, qué incluye, stack, explicación y CTAs.
 */

import { jsPDF } from "jspdf";
import type { AnalysisResult } from "@/lib/types";

const PRIMARY: [number, number, number] = [37, 99, 235];
const DARK: [number, number, number] = [17, 24, 39];
const GRAY: [number, number, number] = [107, 114, 128];
const MARGIN = 44;
const PAGE_W = 595;
const PAGE_H = 842;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function downloadProposalPdf(result: AnalysisResult, botName: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 0;

  // ── Header band ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PAGE_W, 130, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Propuesta de desarrollo web", MARGIN, 48);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Preparada por ${botName} · ${new Date().toLocaleDateString("es-MX")}`, MARGIN, 70);
  if (result.clientName) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Para: ${result.clientName}`, MARGIN, 96);
  }

  y = 170;

  // ── Categoría + badge ──
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(result.categoria, MARGIN, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GRAY);
  doc.text(`Nivel: ${result.nivel}    ·    ${result.tiempo_estimado}`, MARGIN, y);
  y += 16;

  // ── Precio grande ──
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 72, 12, 12, "F");
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  const priceText = `$${result.precio_min.toLocaleString("es-MX")} - $${result.precio_max.toLocaleString("es-MX")} MXN`;
  doc.text(priceText, MARGIN + 20, y + 34);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Precio estimado para tu proyecto", MARGIN + 20, y + 54);
  y += 96;

  // ── Por qué tu negocio lo necesita (venta de valor) ──
  if (result.dolor || result.punto_venta) {
    y = sectionTitle(doc, y, "Por qué tu negocio lo necesita");
    if (result.dolor) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...PRIMARY);
      doc.text("El problema de hoy:", MARGIN, y);
      y += 15;
      y = paragraph(doc, y, result.dolor);
    }
    if (result.punto_venta) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...PRIMARY);
      doc.text("La solución:", MARGIN, y);
      y += 15;
      y = paragraph(doc, y, result.punto_venta);
    }
  }

  // ── Beneficios para tu negocio ──
  if (result.beneficios?.length) {
    y += 6;
    y = sectionTitle(doc, y, "Beneficios para tu negocio");
    for (const b of result.beneficios) {
      y = bullet(doc, y, b);
    }
  }

  // ── Por qué es una inversión ──
  if (result.valor_negocio) {
    y += 6;
    y = sectionTitle(doc, y, "Por qué es una inversión");
    y = paragraph(doc, y, result.valor_negocio);
  }

  // ── Qué incluye ──
  y = sectionTitle(doc, y, "¿Qué incluye?");
  for (const f of result.funcionalidades) {
    y = bullet(doc, y, f);
  }

  // ── Por qué este precio ──
  y += 8;
  y = sectionTitle(doc, y, "¿Por qué este precio?");
  y = paragraph(doc, y, result.explicacion_precio);

  // ── Stack técnico ──
  y += 8;
  y = sectionTitle(doc, y, "Tecnología recomendada");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  const stackLine = result.stack_tecnico.join("  ·  ");
  y = paragraph(doc, y, stackLine);

  // ── Entregables ──
  y += 8;
  y = sectionTitle(doc, y, "¿Qué recibirás al finalizar?");
  for (const e of result.entregables) {
    y = bullet(doc, y, e);
  }

  // ── Recomendaciones ──
  if (result.recomendaciones?.length) {
    y += 8;
    y = sectionTitle(doc, y, "Recomendaciones");
    for (const r of result.recomendaciones) {
      y = bullet(doc, y, r);
    }
  }

  // ── Footer ──
  doc.setFillColor(...DARK);
  doc.rect(0, PAGE_H - 60, PAGE_W, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generado por ${botName} · Listo para hablar de tu proyecto por WhatsApp o correo`,
    MARGIN,
    PAGE_H - 34
  );

  doc.save(`propuesta-${result.clientName ? slugify(result.clientName) : "web"}.pdf`);
}

function sectionTitle(
  doc: jsPDF,
  y: number,
  title: string
): number {
  if (y > PAGE_H - 120) {
    doc.addPage();
    y = 60;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  doc.text(title, MARGIN, y);
  return y + 20;
}

function bullet(doc: jsPDF, y: number, text: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  const maxWidth = PAGE_W - MARGIN * 2 - 16;
  const lines = doc.splitTextToSize(text, maxWidth);
  const lineH = 15;
  if (y + lines.length * lineH > PAGE_H - 80) {
    doc.addPage();
    y = 60;
  }
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("•", MARGIN, y);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.text(lines, MARGIN + 14, y);
  return y + lines.length * lineH;
}

function paragraph(doc: jsPDF, y: number, text: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  const maxWidth = PAGE_W - MARGIN * 2;
  const lines = doc.splitTextToSize(text, maxWidth);
  const lineH = 15;
  if (y + lines.length * lineH > PAGE_H - 80) {
    doc.addPage();
    y = 60;
  }
  doc.text(lines, MARGIN, y);
  return y + lines.length * lineH;
}
