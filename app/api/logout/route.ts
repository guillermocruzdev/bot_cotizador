import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/prospecting-auth";

export async function POST(): Promise<NextResponse> {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
