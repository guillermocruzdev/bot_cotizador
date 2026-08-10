import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Placeholder de sección de la vitrina Nexora (FASE 1).
 * Las secciones de contenido se construyen en FASES 3-7; esto es solo la base.
 */
export function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-50 px-6 text-center">
      <span className="font-mono text-xs uppercase tracking-widest text-brand-600">
        &gt; nexora — en construcción
      </span>
      <h1 className="max-w-2xl font-heading text-3xl font-bold text-night-900 sm:text-4xl">
        {title}
      </h1>
      <p className="max-w-xl text-muted-foreground">{description}</p>
      <Button asChild variant="outline">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al inicio
        </Link>
      </Button>
    </div>
  );
}
