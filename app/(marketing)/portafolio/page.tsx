import portfolioData from "@/data/portfolio.json";
import { PortfolioDataSchema } from "@/lib/portfolio";
import { pageSeo } from "@/lib/seo";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PortfolioExplorer } from "@/components/portfolio/PortfolioExplorer";

export const metadata = pageSeo({
  title: "Portafolio",
  description:
    "Vitrina de los 28 PACKs de la agencia Nexora con su código PK, nivel N0-N5 y precio 'desde' honesto. Webs hechas con IA, data-driven desde portfolio.json.",
  path: "/portafolio",
  keywords: ["portafolio de páginas web", "PACKs de webs", "páginas web con IA", "Nexora"],
});

// Se valida con zod en build time; el grid interactivo vive en PortfolioExplorer.
const items = PortfolioDataSchema.parse(portfolioData);

export default function PortafolioPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="portafolio"
        title="Nuestros PACKs de webs con IA"
        subtitle="28 tipos de página listos para desplegar, cada uno con su código de registro (PK), su nivel N0–N5 y un precio 'desde' honesto. Elige uno y cotiza tu versión con Alex."
      />
      <div className="mt-12">
        <PortfolioExplorer items={items} />
      </div>
    </div>
  );
}
