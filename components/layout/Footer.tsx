import Link from "next/link";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { emailLink, siteConfig, whatsappLink } from "@/lib/site";

const FOOTER_COLS = [
  {
    title: "Servicios",
    links: [
      { href: "/servicios", label: "Qué hacemos" },
      { href: "/precios", label: "Precios" },
      { href: "/proceso", label: "Cómo trabajamos" },
      { href: "/chat", label: "Cotiza con Alex" },
    ],
  },
  {
    title: "Portafolio",
    links: [
      { href: "/portafolio", label: "Nuestros PACKs" },
      { href: "/preguntas", label: "Preguntas frecuentes" },
      { href: "/contacto", label: "Contacto" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/aviso-privacidad", label: "Aviso de privacidad" },
      { href: "/contacto", label: "Hablemos" },
    ],
  },
];

/** Pie de la vitrina (shell FASE 2). */
export function Footer() {
  return (
    <footer className="bg-night-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <BrandLogo variant="mono" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              {siteConfig.tagline} Webs profesionales hechas con IA, en días y
              con precio desde honesto.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 text-sm">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 transition hover:text-white"
              >
                <MessageCircle className="h-4 w-4 text-whatsapp" />
                Escríbenos por WhatsApp
              </a>
              <a
                href={emailLink}
                className="inline-flex items-center gap-2 transition hover:text-white"
              >
                <Mail className="h-4 w-4 text-brand-600" />
                {siteConfig.email}
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-600" />
                México
              </span>
            </div>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-white">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {siteConfig.name} · Hecho con ♥ en
          México.
        </div>
      </div>
    </footer>
  );
}
