"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { formatDate, type LeadRow, type MessageRow } from "./types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ConversationResponse {
  lead: LeadRow | null;
  messages: MessageRow[];
}

export function ChatView({ leadId }: { leadId: string }) {
  const { data, error, mutate } = useSWR<ConversationResponse>(
    `/api/leads/${leadId}`,
    fetcher,
    { refreshInterval: 5000 }
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = data?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendReply(): Promise<void> {
    if (!text.trim() || !data?.lead || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          number: data.lead.phone ?? data.lead.id,
          text,
          direction: "outbound",
          leadId: data.lead.id,
        }),
      });
      if (res.ok) {
        setText("");
        void mutate();
      }
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-red-600">{String(error)}</CardContent>
      </Card>
    );
  }
  if (!data?.lead) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Cargando…</CardContent>
      </Card>
    );
  }

  const lead = data.lead;
  return (
    <Card className="flex h-[70vh] flex-col">
      <CardContent className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{lead.name}</p>
            <p className="text-xs text-muted-foreground">
              {lead.phone ?? "sin teléfono"} · {lead.location}
            </p>
          </div>
          <StatusBadge status={lead.status} />
        </div>
      </CardContent>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Sin conversación todavía.
          </p>
        )}
        {messages.map((m) => {
          const outbound = m.direction === "outbound";
          return (
            <div key={m.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  outbound ? "bg-green-600 text-white" : "border bg-white"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    outbound ? "text-green-100" : "text-muted-foreground"
                  }`}
                >
                  {outbound ? "Agente" : "Cliente"} · {formatDate(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <CardContent className="flex gap-2 border-t p-3">
        <Input
          placeholder="Responder como agente…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void sendReply();
          }}
        />
        <Button onClick={() => void sendReply()} disabled={sending || !text.trim()}>
          Enviar
        </Button>
      </CardContent>
    </Card>
  );
}
