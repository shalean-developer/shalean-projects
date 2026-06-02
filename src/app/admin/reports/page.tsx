import Link from "next/link";

import { AdminPage } from "@/components/admin/admin-page";
import { MetricCard } from "@/components/platform/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRand } from "@/lib/pricing";
import { getReportingSummary } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

const reportLinks = [
  ["/admin/reports/revenue", "Revenue"],
  ["/admin/reports/bookings", "Bookings"],
  ["/admin/reports/cleaners", "Cleaners"],
  ["/admin/reports/customers", "Customers"],
];

export default async function AdminReportsPage() {
  const summary = await getReportingSummary();

  return (
    <AdminPage title="Reports" description="Revenue, booking, cleaner, and customer analytics.">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Revenue" value={formatRand(summary.revenue)} />
        <MetricCard title="Outstanding" value={formatRand(summary.outstandingBalances)} />
        <MetricCard title="Average rating" value={summary.averageRating.toFixed(1)} />
        <MetricCard title="Repeat customers" value={String(summary.repeatCustomers)} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {reportLinks.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg border bg-card p-4 hover:bg-muted/50">
            <p className="font-medium">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">Open report</p>
          </Link>
        ))}
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Monthly revenue</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {summary.monthlyRevenue.map((item) => (
            <div key={item.month} className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[120px_1fr_auto] sm:items-center">
              <p className="font-mono text-sm">{item.month}</p>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{
                    width: `${Math.max(8, Math.min(100, (item.revenue / Math.max(summary.revenue, 1)) * 100))}%`,
                  }}
                />
              </div>
              <p className="font-medium">{formatRand(item.revenue)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
