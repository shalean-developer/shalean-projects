import { AdminPage } from "@/components/admin/admin-page";
import { MetricCard } from "@/components/platform/metric-card";
import { Card, CardContent } from "@/components/ui/card";
import { formatRand } from "@/lib/pricing";
import { getReportingSummary } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function RevenueReportPage() {
  const summary = await getReportingSummary();

  return (
    <AdminPage title="Revenue report" description="Monthly revenue and outstanding balances.">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Revenue" value={formatRand(summary.revenue)} />
        <MetricCard title="Outstanding" value={formatRand(summary.outstandingBalances)} />
        <MetricCard title="Months tracked" value={String(summary.monthlyRevenue.length)} />
      </div>
      <Card className="rounded-lg">
        <CardContent className="grid gap-3">
          {summary.monthlyRevenue.map((item) => (
            <div key={item.month} className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-mono">{item.month}</span>
              <span>{item.bookings} bookings</span>
              <span className="font-medium">{formatRand(item.revenue)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
