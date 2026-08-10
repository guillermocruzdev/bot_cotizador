import type { Metadata } from "next";
import { siteConfig } from "./site";

/**
 * SEO de la vitrina Nexora (FASE 8 · SEO Engineer).
 *
 * `pageSeo()` centraliza title/description/canonical + Open Graph + Twitter
 * para que CADA página tenga metadatos únicos (title/description con keyword)
 * y su propia tarjeta OG/Twitter, sin duplicar boilerplate.
 *
 * `agencyJsonLd()` genera los datos estructurados (Organization +
 * ProfessionalService con NAP consistente) para el home (FASE 8, punto 4).
 */

export function pageSeo(opts: {
  /** Título corto de la página, p. ej. "Servicios" → <title>Servicios · Nexora</title>. */
  title: string;
  description: string;
  /** Ruta pública, p. ej. "/servicios". Se usa para canonical + OG url. */
  path: string;
  keywords?: string[];
  /** true para la home (ya incluye "Nexora" y no debe duplicar el sufijo del template). */
  absolute?: boolean;
}): Metadata {
  const canonical = new URL(opts.path, siteConfig.url).toString();
  // Título completo para OG/Twitter sin duplicar "· Nexora" en la home.
  const fullTitle = opts.absolute
    ? opts.title
    : `${opts.title} · Nexora`;
  return {
    title: opts.absolute ? { absolute: opts.title } : opts.title,
    description: opts.description,
    keywords: opts.keywords,
    alternates: { canonical },
    openGraph: {
      title: fullTitle,
      description: opts.description,
      type: "website",
      url: canonical,
      siteName: "Nexora",
      locale: "es_MX",
      images: [
        {
          url: "/brand/og.png",
          width: 1200,
          height: 630,
          alt: siteConfig.tagline,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: opts.description,
      images: ["/brand/og.png"],
    },
  };
}

/** true solo si el número de WhatsApp es real (no el placeholder "52XXXXXXXXXX"). */
function hasRealWhatsapp(): boolean {
  return /^52\d{10}$/.test(siteConfig.whatsappNumber);
}

/** true solo si el email es real (no el placeholder "hola@nexora.mx"). */
function hasRealEmail(): boolean {
  const e = siteConfig.email;
  return e.length > 0 && e !== "hola@nexora.mx" && e !== "tu@correo.com";
}

/**
 * Datos estructurados del home: Organization + ProfessionalService.
 * NAP honesto: no inventamos domicilio — solo país/localidad "México".
 * El teléfono/correo solo se incluyen cuando las envs traen datos reales.
 */
export function agencyJsonLd(): object[] {
  const contact: Record<string, unknown> = {};
  if (hasRealWhatsapp()) {
    contact.telephone = `+${siteConfig.whatsappNumber}`;
  }
  if (hasRealEmail()) {
    contact.email = siteConfig.email;
  }

  const org: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: "Nexora",
    url: siteConfig.url,
    logo: `${siteConfig.url}/brand/logo-full.svg`,
    image: `${siteConfig.url}/brand/og.png`,
    slogan: siteConfig.tagline,
    description: siteConfig.valueLine,
    areaServed: "MX",
  };

  const service: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${siteConfig.url}/#business`,
    name: "Nexora",
    url: siteConfig.url,
    logo: `${siteConfig.url}/brand/logo-full.svg`,
    image: `${siteConfig.url}/brand/og.png`,
    description:
      "Agencia de webs hechas con IA en México: páginas y plataformas profesionales en días, con precio desde honesto y acabado premium.",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressCountry: "MX",
      addressLocality: "México",
    },
    areaServed: { "@type": "Country", name: "México" },
    ...contact,
  };

  return [org, service];
}
