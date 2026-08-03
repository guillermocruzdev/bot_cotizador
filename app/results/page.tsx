import type { Metadata } from "next";
import { ProposalView } from "@/components/results/ProposalView";

export const metadata: Metadata = {
  title: "Tu propuesta",
  description: "Tu propuesta personalizada con precio estimado, alcance y tecnología.",
};

export default function ResultsPage() {
  return <ProposalView />;
}
