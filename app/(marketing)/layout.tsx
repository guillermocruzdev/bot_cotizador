import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { ThemeGuard } from "@/components/marketing/ThemeGuard";
import { MobileCta } from "@/components/marketing/MobileCta";

/**
 * Layout del route group de la vitrina Nexora.
 * FASE 2: shell con Nav sticky + Footer (design system).
 * 2026-08-11: tema oscuro (ThemeGuard) + barra CTA móvil (MobileCta).
 * El route group no afecta la URL: app/(marketing)/page.tsx es "/".
 * NOTA: NO declarar metadata.title aquí — el root layout ya provee
 * default + template "%s · Nexora"; re-declararlo duplicaría el sufijo.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-50 dark:bg-night-950">
      <ThemeGuard />
      <Nav />
      <main className="flex-1">{children}</main>
      {/* Padding inferior para que la barra CTA móvil no tape el footer. */}
      <div className="pb-20 md:pb-0">
        <Footer />
      </div>
      <MobileCta />
    </div>
  );
}
