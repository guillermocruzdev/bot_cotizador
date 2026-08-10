import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

/**
 * Layout del route group de la vitrina Nexora.
 * FASE 2: shell con Nav sticky + Footer (design system).
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
    <div className="flex min-h-dvh flex-col bg-surface-50">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
