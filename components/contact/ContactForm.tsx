"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CTAButton } from "@/components/ui/CTAButton";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

export type TipoWebOption = { value: string; label: string };

export type ContactFormProps = {
  /** Tipos de web para el select (se pasan desde el server page). */
  tipos: TipoWebOption[];
};

type FormState = {
  nombre: string;
  email: string;
  whatsapp: string;
  tipoWeb: string;
  mensaje: string;
};

const INITIAL: FormState = {
  nombre: "",
  email: "",
  whatsapp: "",
  tipoWeb: "",
  mensaje: "",
};

const inputClass =
  "w-full rounded-xl border border-night-900/15 bg-white px-4 py-2.5 text-sm text-night-900 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 disabled:opacity-50 dark:border-white/15 dark:bg-night-900 dark:text-white dark:focus-visible:ring-brand-400";
const labelClass =
  "mb-1.5 block text-sm font-semibold text-night-900 dark:text-white";

/** Formulario de contacto de la vitrina (FASE 7). Cliente: POST /api/contact. */
export function ContactForm({ tipos }: ContactFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Algo salió mal. Inténtalo de nuevo.");
        setSubmitting(false);
        return;
      }
      setSent(true);
      setSubmitting(false);
    } catch {
      setError("No pudimos enviar tu mensaje. Escríbenos por WhatsApp.");
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <h3 className="font-heading text-xl font-bold text-night-900 dark:text-white">
          ¡Gracias, {form.nombre || "amigo"}! Mensaje recibido
        </h3>
        <p className="max-w-sm text-sm leading-relaxed text-night-700 dark:text-slate-300">
          Te respondemos en menos de 24 horas hábiles. Si es urgente,
          escríbenos por WhatsApp y te atendemos al instante.
        </p>
        <WhatsAppButton
          variant="inline"
          label="Continuar por WhatsApp"
          message={`Hola Nexora, soy ${form.nombre || "…"} y acabo de enviarles el formulario de contacto. Mi web es de tipo: ${form.tipoWeb || "aún no lo sé"}.`}
        />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contacto-nombre" className={labelClass}>
            Nombre <span className="text-brand-600">*</span>
          </label>
          <Input
            id="contacto-nombre"
            name="nombre"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="Tu nombre"
            value={form.nombre}
            onChange={(e) => update("nombre", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contacto-email" className={labelClass}>
            Correo electrónico <span className="text-brand-600">*</span>
          </label>
          <Input
            id="contacto-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={120}
            placeholder="tu@correo.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contacto-whatsapp" className={labelClass}>
            WhatsApp <span className="text-muted-foreground">(opcional)</span>
          </label>
          <Input
            id="contacto-whatsapp"
            name="whatsapp"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            placeholder="52 12 3456 7890"
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contacto-tipo" className={labelClass}>
            Tipo de web <span className="text-muted-foreground">(opcional)</span>
          </label>
          <select
            id="contacto-tipo"
            name="tipoWeb"
            value={form.tipoWeb}
            onChange={(e) => update("tipoWeb", e.target.value)}
            className={inputClass}
          >
            <option value="">No lo tengo claro</option>
            {tipos.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="contacto-mensaje" className={labelClass}>
          Cuéntanos de tu proyecto <span className="text-brand-600">*</span>
        </label>
        <textarea
          id="contacto-mensaje"
          name="mensaje"
          required
          minLength={5}
          maxLength={2000}
          rows={5}
          placeholder="¿Qué negocio tienes y qué quieres lograr con tu web?"
          value={form.mensaje}
          onChange={(e) => update("mensaje", e.target.value)}
          className={`${inputClass} min-h-[120px] resize-y`}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-night-900 dark:text-white"
        >
          {error}
        </p>
      ) : null}

      <CTAButton
        type="submit"
        size="lg"
        className="w-full"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Enviando…
          </>
        ) : (
          <>
            Enviar mensaje <Send className="h-5 w-5" />
          </>
        )}
      </CTAButton>

      <p className="text-center text-xs text-muted-foreground">
        Al enviar aceptas nuestro{" "}
        <a
          href="/aviso-privacidad"
          className="font-semibold text-brand-600 underline-offset-2 hover:underline"
        >
          aviso de privacidad
        </a>
        . Solo usamos tus datos para responderte.
      </p>
    </form>
  );
}
