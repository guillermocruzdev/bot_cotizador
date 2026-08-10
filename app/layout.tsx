import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

/* ── Tipografía Nexora (FASE 1): Inter body · Space Grotesk display · JetBrains Mono acento ── */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-heading",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://botcotizador.vercel.app"),
  title: {
    default: "Nexora · Webs que venden. Hechas con IA.",
    template: "%s · Nexora",
  },
  description:
    "El nexo entre tu negocio y tus clientes. Webs que venden, hechas con IA: páginas profesionales en días, precios desde honestos y acabado premium en México.",
  keywords: [
    "páginas web con IA",
    "desarrollo web México",
    "cuánto cuesta una página web",
    "diseño web rápido",
    "agencia web",
    "cotizador web",
    "Nexora",
  ],
  openGraph: {
    title: "Nexora · Webs que venden. Hechas con IA.",
    description:
      "El nexo entre tu negocio y tus clientes. Webs profesionales hechas con IA, en días y a precio desde honesto.",
    type: "website",
    url: "https://botcotizador.vercel.app",
    siteName: "Nexora",
    locale: "es_MX",
    images: [
      {
        url: "/brand/og.png",
        width: 1200,
        height: 630,
        alt: "Nexora · El nexo entre tu negocio y tus clientes.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexora · Webs que venden. Hechas con IA.",
    description: "El nexo entre tu negocio y tus clientes.",
    images: ["/brand/og.png"],
  },
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon.png", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://botcotizador.vercel.app",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans`}
    >
      <body className="min-h-dvh bg-[#fafafa]">{children}</body>
    </html>
  );
}
