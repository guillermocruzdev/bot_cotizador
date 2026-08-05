"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function NavLogout() {
  const router = useRouter();

  async function logout(): Promise<void> {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => void logout()}>
      Salir
    </Button>
  );
}
