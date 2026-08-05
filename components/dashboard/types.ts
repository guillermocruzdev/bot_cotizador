// Tipos compartidos del dashboard (cliente). No importar código de servidor aquí.
export type LeadStatus =
  | "pending"
  | "sent"
  | "responded"
  | "interested"
  | "meeting"
  | "client"
  | "no_response"
  | "blacklist";

export const LEAD_STATUSES: LeadStatus[] = [
  "pending",
  "sent",
  "responded",
  "interested",
  "meeting",
  "client",
  "no_response",
  "blacklist",
];

export const CATEGORIES = ["restaurant", "dentist", "retail", "gym", "lawyer"];

export interface LeadRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  category: string | null;
  location: string;
  website: string | null;
  status: LeadStatus;
  source: string | null;
  created_at: string;
}

export interface StatsResponse {
  configured: boolean;
  counts: Record<LeadStatus, number>;
  sentToday: number;
  conversionRate: number;
  meetings: number;
  byDay: Array<{ date: string; sent: number }>;
  recent: Array<{ id: string; direction: string; text: string; created_at: string }>;
}

export interface MessageRow {
  id: string;
  direction: "inbound" | "outbound";
  text: string;
  created_at: string;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
