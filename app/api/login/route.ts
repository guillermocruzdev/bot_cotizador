import { NextResponse } from "next/server";
import { isHttpsRequest, setSessionCookie } from "@/lib/prospecting-auth";

// POST /api/login  { password } → crea sesión (cookie httpOnly).
export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = (body?.password ?? "") as string;
  const expected = process.env.ADMIN_PASSWORD ?? "admin";
  if (password !== expected) {
    return NextResponse.json({ error: "contraseña inválida" }, { status: 401 });
  }
  setSessionCookie({ secure: isHttpsRequest(req) });
  return NextResponse.json({ ok: true });
}
