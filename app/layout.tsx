import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || "Alex";

export const metadata: Metadata = {
  title: {
    default: `Cotizador Web con ${BOT_NAME} · Recibe tu propuesta en minutos`,
    template: `%s · ${BOT_NAME}`,
  },
  description:
    "Chatea con un consultor digital, describe tu proyecto y recibe una propuesta personalizada con precio estimado en MXN, alcance y stack tecnológico en minutos.",
  keywords: [
    "cotización web",
    "desarrollo web",
    "precio página web",
    "propuesta web",
    "México",
    "chatbot",
  ],
  openGraph: {
    title: `Cotizador Web con ${BOT_NAME}`,
    description:
      "Describe tu proyecto y recibe una propuesta personalizada con precio estimado en MXN en minutos.",
    type: "website",
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
    <html lang="es" className={inter.className}>
      <body className="min-h-dvh bg-[#fafafa]">{children}</body>
    </html>
  );
}
