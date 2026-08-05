import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/prospecting-auth";
import { getStats } from "@/prospecting/store/dashboard-repo";

// GET /api/stats → métricas del dashboard (polling con SWR).
export async function GET(req: Request): Promise<NextResponse> {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
