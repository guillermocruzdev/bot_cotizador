import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/prospecting-auth";
import { listLeads } from "@/prospecting/store/dashboard-repo";

// GET /api/leads?status=&category=&location=&limit=&offset= → tabla de leads.
export async function GET(req: Request): Promise<NextResponse> {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);
  const offset = Number(url.searchParams.get("offset") ?? 0) || 0;
  const status = url.searchParams.get("status") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const location = url.searchParams.get("location") ?? undefined;

  try {
    const result = await listLeads({ status, category, location, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
