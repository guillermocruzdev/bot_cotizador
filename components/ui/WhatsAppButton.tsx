import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/site";

export type WhatsAppButtonProps = {
  /** "float" fija en la esquina inferior derecha; "inline" se coloca donde se use. */
  variant?: "float" | "inline";
  label?: string;
  className?: string;
  /** Mensaje precargado del wa.me. */
  message?: string;
};

const DEFAULT_MESSAGE = "Hola Nexora, me gustaría cotizar mi web";

/** Botón de WhatsApp reutilizable (verde #25D366, texto night, AA). */
export function WhatsAppButton({
  variant = "float",
  label = "Escríbenos por WhatsApp",
  className,
  message = DEFAULT_MESSAGE,
}: WhatsAppButtonProps) {
  const href = `${whatsappLink}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-whatsapp font-heading font-semibold text-night-900 shadow-lg shadow-whatsapp/20 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        variant === "float"
          ? "fixed bottom-6 right-6 z-50 h-14 px-5 text-sm"
          : "h-12 px-6 text-sm",
        className
      )}
    >
      <MessageCircle className="h-5 w-5" />
      {label}
    </a>
  );
}
