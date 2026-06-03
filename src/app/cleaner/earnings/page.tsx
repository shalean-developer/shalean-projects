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
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthly = earnings.filter((earning) =>
    earning.created_at.startsWith(currentMonth)
  );
  const completedJobs = new Set(
    earnings
      .filter((earning) => earning.booking?.status === "Completed")
      .map((earning) => earning.booking_id)
  );

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Earnings</h2>
        <p className="mt-2 text-muted-foreground">
          Booking payouts, fee deductions, monthly earnings, and payroll status.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Expected" value={formatRand(earnings.reduce((sum, earning) => sum + earning.net_amount, 0))} />
        <MetricCard title="Pending" value={formatRand(pending.reduce((sum, earning) => sum + earning.net_amount, 0))} />
        <MetricCard title="Paid" value={formatRand(paid.reduce((sum, earning) => sum + earning.net_amount, 0))} />
        <MetricCard title="This month" value={formatRand(monthly.reduce((sum, earning) => sum + earning.net_amount, 0))} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard title="Completed jobs" value={String(completedJobs.size)} />
        <MetricCard
          title="Tenure band"
          value={getTenureLabel(earnings[0]?.tenure_months ?? getTenureMonths(cleaner.started_at ?? cleaner.created_at))}
        />
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Completed job earnings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {earnings.length ? (
            earnings.map((earning) => (
              <div key={earning.id} className="grid gap-3 rounded-lg border bg-background p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{earning.booking?.service_name ?? "Booking"}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {earning.booking?.booking_reference ?? earning.booking_id}
                    </p>
                  </div>
                  <StatusBadge status={earning.status} />
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  <Detail label="Booking ID" value={earning.booking?.booking_reference ?? earning.booking_id ?? "Booking"} />
                  <Detail label="Booking date" value={earning.booking?.booking_date ?? "Not set"} />
                  <Detail label="Customer" value={earning.booking?.customer_name ?? "Customer"} />
                  <Detail label="Booking amount" value={formatRand(earning.booking_amount)} />
                  <Detail label="Payment status" value={earning.booking?.payment_status ?? "Pending Payment"} />
                  <Detail label="Calculation" value={formatCalculation(earning)} />
                  <Detail label="Cleaner earning" value={formatRand(earning.net_amount)} />
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              Earnings are created when jobs are completed.
            </p>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatCalculation(earning: {
  cleaner_percentage: number | null;
  net_booking_value: number;
  cleaner_role: string;
}) {
  if (earning.cleaner_percentage === null) {
    return `${earning.cleaner_role} fixed rate`;
  }

  return `${earning.cleaner_percentage}% of ${formatRand(earning.net_booking_value)}`;
}

function getTenureMonths(startedAt: string | null | undefined) {
  if (!startedAt) {
    return 0;
  }

  const started = new Date(startedAt);
  const now = new Date();
  const months =
    (now.getFullYear() - started.getFullYear()) * 12 +
    now.getMonth() -
    started.getMonth();

  return Math.max(months, 0);
}

function getTenureLabel(months: number) {
  return months >= 4 ? "Experienced, 4+ months" : "New, <4 months";
}
