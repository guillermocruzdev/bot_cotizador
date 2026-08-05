"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SearchLeads() {
  const { mutate } = useSWRConfig();
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(): Promise<void> {
    if (!type.trim() || !location.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, location, max_results: 5 }),
      });
      const json = (await res.json()) as {
        queued?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setMsg(`Error: ${json.error ?? res.status}`);
      } else if (json.queued) {
        setMsg(json.message ?? "Búsqueda en cola…");
      } else {
        setMsg("Búsqueda completada.");
      }
      setType("");
      setLocation("");
      void mutate("/api/leads");
      void mutate("/api/stats");
    } catch {
      setMsg("Error de red");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Buscar nuevos leads (Google Search → agente)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Tipo de negocio (ej. dentista)"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
        <Input
          placeholder="Ubicación (ej. Monterrey, México)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Button onClick={() => void run()} disabled={busy} className="sm:w-40">
          {busy ? "Buscando…" : "Buscar"}
        </Button>
      </CardContent>
      {msg && <p className="px-6 pb-4 text-sm text-muted-foreground">{msg}</p>}
    </Card>
  );
}
