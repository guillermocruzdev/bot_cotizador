"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/site";
import { BrandLogo } from "@/components/BrandLogo";
import { CTAButton } from "@/components/ui/CTAButton";

const NAV_LINKS = [
  { href: "/servicios", label: "Servicios" },
  { href: "/portafolio", label: "Portafolio" },
  { href: "/preguntas", label: "Preguntas" },
];

/** Navegación sticky de la vitrina (shell FASE 2). */
export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-night-900/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:gap-4 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Nexora — inicio">
          <BrandLogo priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-night-700 transition hover:bg-night-900/5 hover:text-night-900",
                isActive(link.href) &&
                  "bg-brand-600/10 text-brand-700 hover:bg-brand-600/10 hover:text-brand-700"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escríbenos por WhatsApp"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-whatsapp text-night-900 transition hover:brightness-95"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
          <CTAButton asChild size="sm" className="px-4">
            <Link href="/chat">Cotiza con Alex</Link>
          </CTAButton>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-night-900 transition hover:bg-night-900/5 md:hidden"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open ? (
        <div className="border-t border-night-900/10 bg-white px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Principal móvil">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium text-night-700 transition hover:bg-night-900/5",
                  isActive(link.href) && "bg-brand-600/10 text-brand-700"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2">
              <CTAButton asChild className="flex-1">
                <Link href="/chat" onClick={() => setOpen(false)}>
                  Cotiza con Alex
                </Link>
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
          </nav>
        </div>
      ) : null}
    </header>
  );
}
