import { AdminPage } from "@/components/admin/admin-page";
import { MetricCard } from "@/components/platform/metric-card";
import { Card, CardContent } from "@/components/ui/card";
import { formatRand } from "@/lib/pricing";
import { getReportingSummary } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function CustomersReportPage() {
  const summary = await getReportingSummary();

  return (
    <AdminPage title="Customers report" description="Repeat customers and top service demand.">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Repeat customers" value={String(summary.repeatCustomers)} />
        <MetricCard title="Average rating" value={summary.averageRating.toFixed(1)} />
        <MetricCard title="Total revenue" value={formatRand(summary.revenue)} />
      </div>
      <Card className="rounded-lg">
        <CardContent className="grid gap-3">
          {summary.topServices.map((service) => (
            <div key={service.name} className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">{service.name}</span>
              <span>{service.count} bookings</span>
              <span>{formatRand(service.revenue)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
