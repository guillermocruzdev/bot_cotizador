"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, type StatsResponse } from "./types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function RecentActivity() {
  const { data } = useSWR<StatsResponse>("/api/stats", fetcher, {
    refreshInterval: 20_000,
  });
  const recent = data?.recent ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Actividad reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recent.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {data?.configured === false
              ? "Supabase no configurado (modo demo)."
              : "Sin actividad todavía."}
          </p>
        )}
        {recent.map((m) => (
          <div key={m.id} className="flex items-start gap-3 border-b pb-2 last:border-0">
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                m.direction === "inbound" ? "bg-green-500" : "bg-blue-500"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm">{m.text}</p>
              <p className="text-xs text-muted-foreground">
                {m.direction} · {formatDate(m.created_at)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
