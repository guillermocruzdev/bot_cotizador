"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsResponse } from "./types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CARDS = [
  { key: "sentToday", label: "Enviados hoy", hint: "mensajes" },
  { key: "responded", label: "Respondidos", hint: "total" },
  { key: "conversionRate", label: "Tasa conversión", hint: "%" },
  { key: "meetings", label: "Reuniones", hint: "agendadas" },
] as const;

export function StatsCards() {
  const { data, error, isLoading } = useSWR<StatsResponse>("/api/stats", fetcher, {
    refreshInterval: 15_000,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => {
        const value =
          data && card.key !== "sentToday"
            ? data.counts[card.key as keyof StatsResponse["counts"]] ?? 0
            : data?.sentToday ?? 0;
        const display = card.key === "conversionRate" ? `${value}%` : String(value);
        return (
          <Card key={card.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? "…" : error ? "—" : display}</div>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
