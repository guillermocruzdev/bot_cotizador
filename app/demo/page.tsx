import { LiveDemo } from "@/components/dashboard/LiveDemo";

export const metadata = { title: "Demo en vivo · Bot de ventas WhatsApp" };

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="rounded-lg border bg-background p-4">
          <h1 className="text-2xl font-bold">Demo en vivo</h1>
          <p className="text-sm text-muted-foreground">
            El bot busca 10 negocios sin web en Google, redacta tu mensaje de
            venta y lo &quot;envía&quot; por WhatsApp — todo en tiempo real.
          </p>
        </div>
        <LiveDemo />
      </div>
    </div>
  );
}
