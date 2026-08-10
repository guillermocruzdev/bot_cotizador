import { SectionHeader } from "@/components/ui/SectionHeader";
import { emailLink, siteConfig } from "@/lib/site";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo({
  title: "Aviso de privacidad",
  description:
    "Aviso de privacidad LFPDPPP de Nexora: responsable, datos recabados, finalidades, transferencias y derechos ARCO.",
  path: "/aviso-privacidad",
  keywords: ["aviso de privacidad", "LFPDPPP", "derechos ARCO", "Nexora"],
});

/* ── Aviso de privacidad (LFPDPPP, FASE 7).
   Los datos del responsable van con placeholders […] hasta que el cliente
   confirme su razón social/RFC; NO inventar datos legales. ── */

const SECCIONES: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: "Responsable del tratamiento",
    parrafos: [
      `En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento, el responsable del tratamiento de sus datos personales es [Nombre/Razón social], con domicilio en [Domicilio del responsable], RFC [RFC], y correo electrónico de contacto ${siteConfig.email}.`,
      "En Nexora tratamos sus datos personales de manera legítima, controlada e informada, siempre con apego a los principios de licitud, consentimiento, información, calidad, finalidad, lealtad, proporcionalidad y responsabilidad.",
    ],
  },
  {
    titulo: "Datos personales que recabamos",
    parrafos: [
      "Para ofrecer nuestros servicios de diseño y desarrollo de sitios web, recabamos los siguientes datos personales:",
      "• Datos de identificación: nombre, correo electrónico y número de WhatsApp/telefonía.",
      "• Datos de contacto y del negocio: giro, descripción de su proyecto, estructura y funciones que requiere su sitio web.",
      "• Datos de facturación (solo si contrata un servicio y requiere factura): nombre o razón social, RFC y domicilio fiscal.",
      "No recabamos datos personales sensibles (aquellos que afecten a la esfera más íntima de su titular) salvo que usted nos los proporcione voluntariamente dentro de la descripción de su proyecto; en tal caso, le solicitaremos su consentimiento expreso conforme a la ley.",
    ],
  },
  {
    titulo: "Finalidades del tratamiento",
    parrafos: [
      "Sus datos personales serán utilizados para las siguientes finalidades primarias:",
      "• Preparar, elaborar y dar seguimiento a cotizaciones y propuestas de sitios web.",
      "• Prestar los servicios contratados (diseño, desarrollo, publicación, soporte y mantenimiento).",
      "• Contactarle para dar seguimiento a su proyecto y atender sus solicitudes.",
      "• Emitir facturas y comprobantes fiscales cuando aplique.",
      "Finalidades secundarias (opcionales, sujetas a su consentimiento):",
      "• Enviarle información sobre nuevos servicios, promociones o contenidos de Nexora. Usted puede oponerse a este tratamiento en cualquier momento.",
    ],
  },
  {
    titulo: "Transferencias de datos personales",
    parrafos: [
      "No transferimos sus datos personales a terceros fuera del ámbito legal de Nexora, salvo cuando sea necesario para prestar el servicio (por ejemplo, plataformas de hosting, proveedores de pago en línea o servicios de mensajería) o cuando exista obligación legal. En todos los casos, las transferencias se realizan cumpliendo la LFPDPPP y, cuando corresponda, celebrando los acuerdos de transferencia respectivos.",
      "No vendemos ni alquilamos datos personales a terceros.",
    ],
  },
  {
    titulo: "Derechos ARCO",
    parrafos: [
      "Usted tiene derecho a solicitar el Acceso, Rectificación, Cancelación u Oposición (derechos ARCO) al tratamiento de sus datos personales, así como a revocar el consentimiento otorgado para su uso.",
      "Para ejercer cualquiera de estos derechos, envíe su solicitud al correo electrónico de contacto del responsable, indicando: su nombre, los datos respecto de los cuales desea ejercer un derecho, la descripción clara de la solicitud, y un medio para comunicarle la respuesta.",
      "Le responderemos en un plazo máximo de 20 días hábiles, conforme a lo dispuesto por la LFPDPPP y su Reglamento. En caso de duda o inconformidad, usted puede acudir al Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI).",
    ],
  },
  {
    titulo: "Uso de cookies y tecnologías similares",
    parrafos: [
      "Nuestro sitio puede utilizar cookies y tecnologías similares para el correcto funcionamiento, medir la audiencia y mejorar la experiencia de navegación. Usted puede configurar su navegador para rechazarlas; esto no impedirá el acceso a la información pública del sitio, aunque puede afectar algunas funcionalidades.",
    ],
  },
  {
    titulo: "Cambios al aviso de privacidad",
    parrafos: [
      "Nexora se reserva el derecho de efectuar modificaciones o actualizaciones al presente aviso de privacidad en cualquier momento, para atender reformas legales, políticas internas o nuevas necesidades del servicio. Las modificaciones se harán del conocimiento de los titulares a través de este sitio web (sección de Aviso de privacidad) y entrarán en vigor a partir de su publicación.",
    ],
  },
  {
    titulo: "Fecha de última actualización",
    parrafos: [
      "Este aviso de privacidad fue actualizado por última vez el [DD/MM/AAAA]. Si tiene dudas sobre el tratamiento de sus datos personales, escríbanos a " +
        siteConfig.email +
        " o por WhatsApp y con gusto le atenderemos.",
    ],
  },
];

export default function AvisoPrivacidadPage() {
  return (
    <>
      {/* ── Hero de la página ── */}
      <section className="relative isolate overflow-hidden bg-night-900 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-brand-700/25 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <p className="font-mono text-xs uppercase tracking-widest text-brand-300">
            &gt; aviso de privacidad
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Tu información,{" "}
            <span className="text-brand-300">protegida</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-slate-300">
            Conforme a la Ley Federal de Protección de Datos Personales en
            Posesión de los Particulares (LFPDPPP).
          </p>
        </div>
      </section>

      {/* ── Contenido del aviso ── */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          align="left"
          eyebrow="nexora"
          title="Aviso de privacidad integral"
          subtitle="Este documento describe cómo recabamos, usamos y protegemos tus datos personales."
        />
        <div className="mt-10 space-y-8">
          {SECCIONES.map((sec) => (
            <section
              key={sec.titulo}
              className="rounded-2xl border border-night-900/10 bg-white p-6 sm:p-7"
            >
              <h2 className="font-heading text-xl font-bold text-night-900">
                {sec.titulo}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-night-700">
                {sec.parrafos.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          Para ejercer tus derechos ARCO o resolver cualquier duda sobre tus
          datos, escríbenos a{" "}
          <a
            href={emailLink}
            className="font-semibold text-brand-600 underline-offset-2 hover:underline"
          >
            {siteConfig.email}
          </a>
          .
        </p>
      </section>
    </>
  );
}
