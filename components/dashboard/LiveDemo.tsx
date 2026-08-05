"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeadEvt {
  name: string;
  phone: string | null;
  category: string | null;
}

interface FeedItem {
  kind:
    | "status"
    | "search"
    | "lead"
    | "message"
    | "send"
    | "done"
    | "error";
  text?: string;
  lead?: LeadEvt;
  message?: string;
  status?: "sending" | "sent";
  total?: number;
  llm_calls?: number;
  source?: string;
  simulated?: boolean;
}

export function LiveDemo() {
  const [type, setType] = useState("dentista");
  const [location, setLocation] = useState("Monterrey, México");
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  function start(): void {
    stop();
    setItems([]);
    setRunning(true);
    const es = new EventSource(
      `/api/demo?type=${encodeURIComponent(type)}&location=${encodeURIComponent(location)}&count=10`
    );
    esRef.current = es;

    const push = (item: FeedItem) => setItems((prev) => [...prev, item]);

    es.addEventListener("status", (e) => {
      push({ kind: "status", text: JSON.parse((e as MessageEvent).data).text });
    });
    es.addEventListener("search", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      push({ kind: "search", total: d.total, source: d.source });
    });
    es.addEventListener("lead", (e) => {
      push({ kind: "lead", lead: JSON.parse((e as MessageEvent).data) });
    });
    es.addEventListener("message", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      push({
        kind: "message",
        lead: { name: d.name, phone: d.phone, category: null },
        message: d.text,
      });
    });
    es.addEventListener("send", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      push({
        kind: "send",
        lead: { name: d.name, phone: d.phone, category: null },
        status: d.status,
      });
    });
    es.addEventListener("done", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      push({
        kind: "done",
        total: d.total,
        llm_calls: d.llm_calls,
        source: d.source,
        simulated: d.simulated,
      });
      es.close();
      esRef.current = null;
      setRunning(false);
    });
    es.addEventListener("error", (e) => {
      push({ kind: "error", text: "Conexión perdida con la demo." });
      es.close();
      esRef.current = null;
      setRunning(false);
    });
    es.onerror = () => {
      // el listener "error" ya cierra; si llega aquí sin evento, cerrar igual.
      es.close();
      esRef.current = null;
      setRunning(false);
    };
  }

  function stop(): void {
    esRef.current?.close();
    esRef.current = null;
    setRunning(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Demo en vivo · buscar y hablar con 10 negocios
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Tipo de negocio (ej. dentista)"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={running}
          />
          <Input
            placeholder="Ubicación (ej. Monterrey, México)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={running}
          />
          <Button
            onClick={() => (running ? stop() : start())}
            disabled={!type.trim() || !location.trim()}
            className="sm:w-48"
          >
            {running ? "Detener" : "Buscar y hablar con 10"}
          </Button>
        </div>

        <div className="max-h-[520px] space-y-2 overflow-y-auto rounded-lg border bg-background p-3 font-mono text-xs">
          {items.length === 0 && (
            <p className="text-muted-foreground">
              Presiona el botón para ver el bot buscar, redactar y
              &quot;enviar&quot; por WhatsApp en vivo. (Sin Baileys/Redis el
              envío es simulado.)
            </p>
          )}
          {items.map((it, i) => (
            <FeedRow key={i} item={it} />
          ))}
          <div ref={bottomRef} />
        </div>
      </CardContent>
    </Card>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  switch (item.kind) {
    case "status":
      return <p className="text-muted-foreground">ℹ️ {item.text}</p>;
    case "search":
      return (
        <p className="text-sky-600">
          🔎 Encontrados {item.total} negocios sin web (fuente: {item.source})
        </p>
      );
    case "lead":
      return (
        <p className="text-emerald-700">
          🏢 {item.lead?.name}
          {item.lead?.category ? ` · ${item.lead.category}` : ""}
          {item.lead?.phone ? ` · ${item.lead.phone}` : ""} — sin web
        </p>
      );
    case "message":
      return (
        <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-2">
          <p className="text-green-800">
            💬 Mensaje para {item.lead?.name}
            {item.lead?.phone ? ` (${item.lead.phone})` : ""}:
          </p>
          <p className="mt-1 whitespace-pre-wrap text-green-900">
            “{item.message}”
          </p>
        </div>
      );
    case "send":
      return (
        <p className={item.status === "sent" ? "text-green-700" : "text-amber-600"}>
          {item.status === "sent" ? "✅ Enviado" : "⏳ Enviando…"} a {item.lead?.name}
        </p>
      );
    case "done":
      return (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
          <p>
            ✅ Demo terminada: {item.total} negocios contactados ·{" "}
            {item.llm_calls ?? 0} llamada(s) LLM (1 por categoría) ·{" "}
            {item.simulated ? "envío simulado" : "envío real"}
          </p>
        </div>
      );
    case "error":
      return <p className="text-red-600">❌ {item.text}</p>;
    default:
      return null;
  }
}
