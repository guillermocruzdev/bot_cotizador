"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIES, type LeadRow } from "./types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LeadsResponse {
  data: LeadRow[];
  total: number;
}

export function CampaignBuilder() {
  const { mutate } = useSWRConfig();
  const { data, isLoading } = useSWR<LeadsResponse>(
    "/api/leads?status=pending&limit=100",
    fetcher,
    { refreshInterval: 20_000 }
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState("auto");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const leads = data?.data ?? [];

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(): void {
    setSelected((prev) =>
      prev.size === leads.length && leads.length > 0
        ? new Set()
        : new Set(leads.map((l) => l.id))
    );
  }

  async function create(): Promise<void> {
    if (selected.size === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/campaign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lead_ids: Array.from(selected),
          name: name || undefined,
          category: category === "auto" ? undefined : category,
        }),
      });
      const json = (await res.json()) as {
        campaignId?: string;
        enqueued?: number;
        error?: string;
        note?: string;
      };
      if (!res.ok) {
        setMsg(`Error: ${json.error ?? res.status}`);
      } else {
        setMsg(
          `Campaña ${json.campaignId} creada · ${json.enqueued ?? 0} mensajes encolados.${json.note ? ` ${json.note}` : ""}`
        );
        setSelected(new Set());
        void mutate("/api/leads");
        void mutate("/api/stats");
      }
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
          Nueva campaña · {leads.length} leads pending
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Nombre de la campaña"
            className="h-9"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="auto">Plantilla: auto (por lead)</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                Plantilla: {c}
              </option>
            ))}
          </select>
          <Button onClick={() => void create()} disabled={busy || selected.size === 0}>
            {busy ? "Creando…" : `Crear (${selected.size})`}
          </Button>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border">
          {isLoading && <p className="p-3 text-sm text-muted-foreground">Cargando…</p>}
          {!isLoading && leads.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">
              No hay leads pending. Busca nuevos leads primero.
            </p>
          )}
          {leads.map((lead) => (
            <label
              key={lead.id}
              className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 last:border-0"
            >
              <input
                type="checkbox"
                checked={selected.has(lead.id)}
                onChange={() => toggle(lead.id)}
              />
              <span className="flex-1 text-sm">{lead.name}</span>
              <span className="text-xs text-muted-foreground">{lead.category ?? "—"}</span>
            </label>
          ))}
          {leads.length > 0 && (
            <button
              className="w-full px-3 py-1.5 text-center text-xs text-muted-foreground hover:bg-muted"
              onClick={toggleAll}
            >
              {selected.size === leads.length ? "Quitar todos" : "Seleccionar todos"}
            </button>
          )}
        </div>

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}
