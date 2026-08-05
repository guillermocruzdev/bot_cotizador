import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/prospecting-auth";
import { getLeadMessages } from "@/prospecting/store/dashboard-repo";

// GET /api/leads/[id] → lead + conversación (ChatView).
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  try {
    const result = await getLeadMessages(params.id);
    if (!result.lead) {
      return NextResponse.json({ error: "lead no encontrado" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
