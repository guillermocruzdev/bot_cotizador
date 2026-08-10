import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Github, Layers } from "lucide-react";
import portfolioData from "@/data/portfolio.json";
import { PortfolioDataSchema } from "@/lib/portfolio";
import { getCategoryById } from "@/lib/pricing-catalog";
import { formatMXN } from "@/lib/utils";
import { whatsappLink } from "@/lib/site";
import { NivelBadge } from "@/components/ui/NivelBadge";
import { CTAButton } from "@/components/ui/CTAButton";
import { pageSeo } from "@/lib/seo";

const items = PortfolioDataSchema.parse(portfolioData);

export function generateStaticParams() {
  return items.map((it) => ({ codigo: it.codigo }));
}

export async function generateMetadata({
  params,
}: {
  params: { codigo: string };
}) {
  const item = items.find((it) => it.codigo === params.codigo);
  if (!item) return {};
  return pageSeo({
    title: `${item.nombre} · ${item.codigo}`,
    description: item.descripcion,
    path: `/portafolio/${item.codigo}`,
    keywords: [item.nombre, "páginas web con IA", "PACK de prompts", "Nexora"],
  });
}

export default function PackDetallePage({
  params,
}: {
  params: { codigo: string };
}) {
  const item = items.find((it) => it.codigo === params.codigo);
  if (!item) notFound();
  const cat = getCategoryById(item.categoriaBase);
  const disponible = item.estado === "disponible" && !!item.urlDemo;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <Link
        href="/portafolio"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al portafolio
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <NivelBadge nivel={item.nivel} />
            <span className="font-mono text-xs font-semibold tracking-widest text-muted-foreground">
              {item.codigo}
            </span>
          </div>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-night-900 sm:text-4xl">
            {item.nombre}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {item.descripcion}
          </p>

          {cat ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-night-900/10 bg-white px-4 py-2 text-sm text-night-700">
              <Layers className="h-4 w-4 text-brand-600" />
              Se cotiza como:{" "}
              <span className="font-semibold text-night-900">
                {cat.nombreCliente}
              </span>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {item.repo ? (
              <a
                href={item.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-night-900/15 px-4 py-2 text-sm font-semibold text-night-700 transition hover:border-brand-600/40 hover:bg-surface-50"
              >
                <Github className="h-4 w-4" /> Código
              </a>
            ) : null}
            {disponible && item.urlDemo ? (
              <a
                href={item.urlDemo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <ExternalLink className="h-4 w-4" /> Ver demo
              </a>
            ) : (
              <span className="inline-flex items-center rounded-lg bg-night-900/5 px-4 py-2 text-sm font-semibold text-muted-foreground">
                Demo próximamente
              </span>
            )}
          </div>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="rounded-2xl border border-night-900/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Desde
            </p>
            <p className="mt-1 font-mono text-4xl font-bold text-brand-700">
              {formatMXN(item.precioDesde)}{" "}
              <span className="text-lg text-muted-foreground">MXN</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              IVA incluido · precio desde honesto (regla #7: UI = pack = copy)
            </p>
            <CTAButton asChild className="mt-6 w-full">
              <Link href="/chat">
                Cotizar algo así <ArrowRight className="h-4 w-4" />
              </Link>
            </CTAButton>
            <CTAButton variant="whatsapp" asChild className="mt-3 w-full">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </CTAButton>
          </div>
        </aside>
      </div>
    </div>
  );
}
