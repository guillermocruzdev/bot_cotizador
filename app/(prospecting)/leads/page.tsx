import { SearchLeads } from "@/components/dashboard/SearchLeads";
import { LeadTable } from "@/components/dashboard/LeadTable";

export default function LeadsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Leads</h1>
      <SearchLeads />
      <LeadTable />
    </>
  );
}
