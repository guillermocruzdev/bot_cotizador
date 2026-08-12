import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/site";
import { CTAButton } from "@/components/ui/CTAButton";

/**
 * Barra CTA fija en la parte inferior SOLO en móvil (< md): conversión
 * persistente mientras se navega la vitrina. En desktop se oculta (ahí cada
 * sección y el botón flotante de WhatsApp ya cumplen ese rol).
 */
export function MobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-night-900/10 bg-white/95 px-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-10px_30px_rgba(15,23,42,0.1)] backdrop-blur md:hidden dark:border-white/10 dark:bg-night-900/95">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <CTAButton asChild className="h-12 flex-1">
          <Link href="/chat">Cotizar con Alex</Link>
        </CTAButton>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escríbenos por WhatsApp"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-whatsapp text-night-900 transition hover:brightness-95"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
}
