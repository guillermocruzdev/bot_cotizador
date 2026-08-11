import {
  BadgeDollarSign,
  Headphones,
  ScrollText,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bloque de confianza transversal de la vitrina (FASE 7).
 * Se usa en home y precios para reforzar las garantías del proceso:
 * sin letras chiquitas · precio desde honesto · entrega en días · soporte real.
 * Server component (estático).
 */
const TRUST_ITEMS: {
  icon: LucideIcon;
  title: string;
  text: string;
}[] = [
  {
    icon: ScrollText,
    title: "Sin letras chiquitas",
    text: "Todo lo que firmas cabe en una página: alcance, precio y tiempos claros.",
  },
  {
    icon: BadgeDollarSign,
    title: "Precio desde honesto",
    text: "El \"desde\" incluye IVA y funciones reales. Nada de sorpresas al final.",
  },
  {
    icon: Timer,
    title: "Entrega en días",
    text: "Tu web publicada en días, no en meses. Con avances constantes.",
  },
  {
    icon: Headphones,
    title: "Soporte real",
    text: "Te capacitamos y te acompañamos después de lanzar. Respondemos de verdad.",
  },
];

export type TrustBarProps = {
  className?: string;
};

export function TrustBar({ className }: TrustBarProps) {
  return (
    <section
      className={cn("border-y border-night-900/10 bg-white", className)}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <h2 className="sr-only">Por qué confiar en Nexora</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 lg:flex-col lg:gap-3"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading text-sm font-bold text-night-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-night-700">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
