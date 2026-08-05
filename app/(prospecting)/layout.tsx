import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSession } from "@/lib/prospecting-auth";
import { NavLogout } from "@/components/dashboard/NavLogout";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/demo", label: "Demo en vivo" },
  { href: "/leads", label: "Leads" },
  { href: "/campaigns", label: "Campañas" },
];

export default function ProspectingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSession()) redirect("/login");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold">Prospección B2B</span>
            <nav className="flex gap-4 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <NavLogout />
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 p-6">{children}</main>
    </div>
  );
}
