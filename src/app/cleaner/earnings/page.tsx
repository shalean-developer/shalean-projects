import { MetricCard } from "@/components/platform/metric-card";
import { StatusBadge } from "@/components/platform/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRand } from "@/lib/pricing";
import { requireCleaner } from "@/lib/auth";
import { getCleanerEarnings, getPayrollRecords } from "@/lib/supabase/queries";

export default async function CleanerEarningsPage() {
  const { cleaner } = await requireCleaner("/cleaner/earnings");
  const [earnings, payroll] = await Promise.all([
    getCleanerEarnings(cleaner.id),
    getPayrollRecords(),
  ]);
  const ownPayroll = payroll.filter((record) => record.cleaner_id === cleaner.id);
  const paid = earnings.filter((earning) => earning.status === "Paid");
  const pending = earnings.filter((earning) => earning.status !== "Paid");

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Earnings</h2>
        <p className="mt-2 text-muted-foreground">Completed jobs, expected earnings, pending earnings, and paid payroll.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Expected" value={formatRand(earnings.reduce((sum, earning) => sum + earning.net_amount, 0))} />
        <MetricCard title="Pending" value={formatRand(pending.reduce((sum, earning) => sum + earning.net_amount, 0))} />
        <MetricCard title="Paid" value={formatRand(paid.reduce((sum, earning) => sum + earning.net_amount, 0))} />
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Completed job earnings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {earnings.length ? (
            earnings.map((earning) => (
              <div key={earning.id} className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="font-medium">{earning.booking?.service_name ?? "Booking"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{earning.booking?.booking_reference ?? earning.booking_id}</p>
                </div>
                <StatusBadge status={earning.status} />
                <p className="font-medium">{formatRand(earning.net_amount)}</p>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Earnings are created when jobs are completed.</p>
          )}
        </CardContent>
      </Card>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Payroll records</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {ownPayroll.map((record) => (
            <div key={record.id} className="flex items-center justify-between rounded-lg border p-3">
              <StatusBadge status={record.status} />
              <span>{record.booking?.booking_reference ?? "Manual adjustment"}</span>
              <span className="font-medium">{formatRand(record.amount + record.bonus - record.deduction)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
