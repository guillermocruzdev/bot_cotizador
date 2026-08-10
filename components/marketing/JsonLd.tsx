/**
 * Renderiza datos estructurados JSON-LD (FASE 8 · SEO).
 * Componente de servidor: se usa en páginas server de la vitrina para
 * inyectar Organization / ProfessionalService / FAQ / Breadcrumb, etc.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
