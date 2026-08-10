"use client";

import { useMemo, useState } from "react";
import type { PortfolioItem } from "@/lib/portfolio";
import { Chip } from "@/components/ui/Chip";
import { PortfolioCard } from "@/components/ui/PortfolioCard";

const FILTROS = ["Todos", "N0", "N1", "N2", "N3", "N4", "N5"] as const;

export type PortfolioExplorerProps = {
  /** Los 28 PACKs de la vitrina (data/portfolio.json, validado en el server). */
  items: PortfolioItem[];
};

/** Grid de PACKs con filtro por nivel N0–N5 (client, reutiliza Chip). */
export function PortfolioExplorer({ items }: PortfolioExplorerProps) {
  const [filtro, setFiltro] = useState<string>("Todos");

  const visibles = useMemo(
    () =>
      filtro === "Todos"
        ? items
        : items.filter((it) => it.nivel.startsWith(filtro)),
    [filtro, items]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {FILTROS.map((f) => (
          <Chip
            key={f}
            active={filtro === f}
            onClick={() => setFiltro(f)}
            className="capitalize"
          >
            {f === "Todos" ? "Todos" : `Nivel ${f.replace("N", "")}`}
          </Chip>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          No hay PACKs en este nivel todavía.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((it) => (
            <PortfolioCard
              key={it.codigo}
              codigo={it.codigo}
              nombre={it.nombre}
              nivel={it.nivel}
              descripcion={it.descripcion}
              precioDesde={it.precioDesde}
              urlDemo={it.urlDemo}
              repo={it.repo}
              estado={it.estado}
              detalleHref={`/portafolio/${it.codigo}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
