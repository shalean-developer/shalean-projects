import { AdminPage } from "@/components/admin/admin-page";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusBadge } from "@/components/platform/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { getReportingSummary } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function BookingsReportPage() {
  const summary = await getReportingSummary();

  return (
    <AdminPage title="Bookings report" description="Booking statuses, completions, cancellations, and conversion trends.">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total" value={String(summary.totalBookings)} />
        <MetricCard title="Confirmed" value={String(summary.confirmedBookings)} />
        <MetricCard title="Completed" value={String(summary.completedBookings)} />
        <MetricCard title="Cancelled" value={String(summary.cancelledBookings)} />
      </div>
      <Card className="rounded-lg">
        <CardContent className="grid gap-3">
          {summary.bookingConversionTrends.map((item) => (
            <div key={item.status} className="flex items-center justify-between rounded-lg border p-3">
              <StatusBadge status={item.status} />
              <span className="font-semibold">{item.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
