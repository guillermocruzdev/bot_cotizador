"use client";

/**
 * Renderiza texto plano del bot con soporte mínimo de formato:
 * - `**negrita**` → <strong>
 * - Saltos de línea → respetados con whitespace-pre-wrap
 */

export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
