"use client";

import { FileCode2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/types";

/**
 * Descarga el prompt técnico detallado (listo para VS Code + Roo Code).
 * Se genera en segundo plano: el cliente nunca lo ve en pantalla.
 */
export function PromptDownloader({ result }: { result: AnalysisResult }) {
  const [busy, setBusy] = useState(false);

  const download = () => {
    if (!result.prompt_tecnico) return;
    setBusy(true);
    setTimeout(() => {
      const blob = new Blob([result.prompt_tecnico], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-roo-code-${(result.clientName || "proyecto")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBusy(false);
    }, 50);
  };

  return (
    <Button
      variant="outline"
      onClick={download}
      disabled={busy || !result.prompt_tecnico}
      className="w-full sm:w-auto"
    >
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileCode2 className="mr-2 h-4 w-4" />
      )}
      Prompt técnico para Roo Code
    </Button>
  );
}
