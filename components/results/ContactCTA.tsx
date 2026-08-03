"use client";

import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP = process.env.NEXT_PUBLIC_DEVELOPER_WHATSAPP || "";
const EMAIL = process.env.NEXT_PUBLIC_DEVELOPER_EMAIL || "";
const DEV_NAME = process.env.NEXT_PUBLIC_DEVELOPER_NAME || "";

export function ContactCTA({
  clientName,
  categoria,
}: {
  clientName: string;
  categoria: string;
}) {
  const waText = encodeURIComponent(
    `¡Hola${DEV_NAME ? ` ${DEV_NAME}` : ""}! Vi la propuesta para mi proyecto (${categoria}) y quiero hablar sobre el siguiente paso.`
  );
  const waLink = WHATSAPP
    ? `https://wa.me/${WHATSAPP.replace(/\D/g, "")}?text=${waText}`
    : "#";

  const mailLink = EMAIL
    ? `mailto:${EMAIL}?subject=${encodeURIComponent(
        `Propuesta para: ${categoria}`
      )}&body=${encodeURIComponent(
        `Hola, vengo del cotizador web. Quiero avanzar con el proyecto "${categoria}".`
      )}`
    : "#";

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        asChild
        className="w-full bg-emerald-500 hover:bg-emerald-600 sm:w-auto"
        disabled={!WHATSAPP}
      >
        <a href={waLink} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 h-4 w-4" />
          Hablar por WhatsApp
        </a>
      </Button>
      <Button asChild variant="outline" className="w-full sm:w-auto" disabled={!EMAIL}>
        <a href={mailLink} target="_blank" rel="noopener noreferrer">
          <Mail className="mr-2 h-4 w-4" />
          Enviar por correo
        </a>
      </Button>
    </div>
  );
}
