"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { formatDate, LEAD_STATUSES, type LeadRow } from "./types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LeadsResponse {
  data: LeadRow[];
  total: number;
}

export function LeadTable() {
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [applied, setApplied] = useState({ status: "", category: "", location: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const params = new URLSearchParams();
  if (applied.status) params.set("status", applied.status);
  if (applied.category) params.set("category", applied.category);
  if (applied.location) params.set("location", applied.location);

  const { data, error, isLoading } = useSWR<LeadsResponse>(
    `/api/leads?${params.toString()}`,
    fetcher,
    { refreshInterval: 15_000 }
  );

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>Leads · {data?.total ?? 0}</span>
          <span>{selected.size} seleccionados</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Estado: todos</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Input
            placeholder="Categoría"
            className="h-9 sm:w-44"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Input
            placeholder="Ubicación"
            className="h-9 sm:w-44"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => setApplied({ status, category, location })}
          >
            Filtrar
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{String(error)}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={selected.size === leads.length && leads.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="py-2 pr-3">Nombre</th>
                <th className="py-2 pr-3">Teléfono</th>
                <th className="py-2 pr-3">Categoría</th>
                <th className="py-2 pr-3">Ubicación</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3">Creado</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggle(lead.id)}
                    />
                  </td>
                  <td className="py-2 pr-3 font-medium">{lead.name}</td>
                  <td className="py-2 pr-3">{lead.phone ?? "—"}</td>
                  <td className="py-2 pr-3">{lead.category ?? "—"}</td>
                  <td className="py-2 pr-3">{lead.location}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="py-2 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/conversations/${lead.id}`}>Ver chat</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {isLoading && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-muted-foreground">
                    Cargando…
                  </td>
                </tr>
              )}
              {!isLoading && leads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-muted-foreground">
                    Sin leads. Usa la búsqueda de arriba para descubrir negocios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
