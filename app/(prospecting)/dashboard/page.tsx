import { StatsCards } from "@/components/dashboard/StatsCards";
import { SendsChart } from "@/components/dashboard/SendsChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

export default function DashboardPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <StatsCards />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SendsChart />
        </div>
        <RecentActivity />
      </div>
    </>
  );
}
