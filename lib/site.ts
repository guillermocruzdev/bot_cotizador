/**
 * Configuración y contacto del sitio vitrina Nexora (FASE 2).
 * Los placeholders se reemplazan con envs reales en FASE 8:
 *   NEXT_PUBLIC_WHATSAPP = número wa.me, sin "+" (p. ej. 521234567890)
 *   NEXT_PUBLIC_EMAIL    = correo de contacto
 * Regla: nada de datos de contacto hardcodeado en los componentes —
 * todo pasa por aquí (Nav, Footer, WhatsAppButton, 404, CTAs).
 */
export const siteConfig = {
  name: "Nexora",
  tagline: "El nexo entre tu negocio y tus clientes.",
  valueLine: "Webs que venden. Hechas con IA.",
  url: "https://nexora.vercel.app",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP || "52XXXXXXXXXX",
  email: process.env.NEXT_PUBLIC_EMAIL || "hola@nexora.mx",
} as const;

/** Link base de WhatsApp (wa.me sin "+") */
export const whatsappLink = `https://wa.me/${siteConfig.whatsappNumber}`;

/** Link de email (mailto) */
export const emailLink = `mailto:${siteConfig.email}`;
