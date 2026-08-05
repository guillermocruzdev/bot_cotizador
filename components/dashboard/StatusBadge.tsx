"use client";

import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "./types";

const STYLES: Record<LeadStatus, string> = {
  pending: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  sent: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  responded: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  interested: "bg-green-100 text-green-700 hover:bg-green-100",
  meeting: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  client: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  no_response: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  blacklist: "bg-red-100 text-red-700 hover:bg-red-100",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={STYLES[status] ?? ""}>
      {status}
    </Badge>
  );
}
