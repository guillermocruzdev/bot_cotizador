"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/site";
import { BrandLogo } from "@/components/BrandLogo";
import { CTAButton } from "@/components/ui/CTAButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_LINKS = [
  { href: "/servicios", label: "Servicios" },
  { href: "/portafolio", label: "Portafolio" },
  { href: "/preguntas", label: "Preguntas" },
];

/** Enlaces extra SOLO en el menú móvil (menos taps en pantallas chicas). */
const MOBILE_EXTRA_LINKS = [
  { href: "/precios", label: "Precios" },
  { href: "/proceso", label: "Cómo trabajamos" },
  { href: "/contacto", label: "Contacto" },
];

/** Navegación sticky de la vitrina (shell FASE 2). */
export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-night-900/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-night-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:gap-4 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Nexora — inicio">
          {/* Logo con variante clara/oscura según el tema (CSS, sin JS).
              max-w en móvil: a 320px el logo de 240px desbordaría la nav. */}
          <BrandLogo
            priority
            className="h-auto w-auto max-w-[200px] dark:hidden md:max-w-none"
          />
          <BrandLogo
            priority
            variant="full-dark"
            className="h-auto w-auto max-w-[200px] hidden dark:block md:max-w-none"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-night-700 transition hover:bg-night-900/5 hover:text-night-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                isActive(link.href) &&
                  "bg-brand-600/10 text-brand-700 hover:bg-brand-600/10 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-400"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-night-900 transition hover:bg-night-900/5 dark:text-white dark:hover:bg-white/10 md:hidden"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open ? (
        <div className="border-t border-night-900/10 bg-white px-4 pb-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200 dark:border-white/10 dark:bg-night-900 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Principal móvil">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-3 text-sm font-medium text-night-700 transition hover:bg-night-900/5 dark:text-slate-300 dark:hover:bg-white/10",
                  isActive(link.href) && "bg-brand-600/10 text-brand-700 dark:text-brand-400"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 border-t border-night-900/10 dark:border-white/10" />
            {MOBILE_EXTRA_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-3 text-sm font-medium text-night-700 transition hover:bg-night-900/5 dark:text-slate-300 dark:hover:bg-white/10",
                  isActive(link.href) && "bg-brand-600/10 text-brand-700 dark:text-brand-400"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex items-center gap-2">
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
            <div className="mt-2">
              <ThemeToggle withLabel />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
