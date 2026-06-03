import Link from "next/link";

import { AdminPage } from "@/components/admin/admin-page";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusBadge } from "@/components/platform/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRand } from "@/lib/pricing";
import { getCleanerEarnings } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AdminCleanerEarningsPage() {
  const earnings = await getCleanerEarnings();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyEarnings = earnings.filter((earning) =>
    earning.created_at.startsWith(currentMonth)
  );
  const completedJobs = new Set(
    earnings
      .filter((earning) => earning.booking?.status === "Completed")
      .map((earning) => earning.booking_id)
  );
  const csvHref = toCsvDataUri(earnings);

  return (
    <AdminPage
      title="Cleaner Earnings Management"
      description="Booking-level earnings, service fee deductions, tenure rules, monthly payouts, and payout export."
      actions={
        <a
          href={csvHref}
          download={`cleaner-payouts-${currentMonth}.csv`}
          className={buttonVariants({ variant: "outline" })}
        >
          Export payout report
        </a>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Pending payouts"
          value={formatRand(
            earnings
              .filter((earning) => earning.status !== "Paid")
              .reduce((sum, earning) => sum + earning.net_amount, 0)
          )}
        />
        <MetricCard
          title="Paid payouts"
          value={formatRand(
            earnings
              .filter((earning) => earning.status === "Paid")
              .reduce((sum, earning) => sum + earning.net_amount, 0)
          )}
        />
        <MetricCard
          title="This month"
          value={formatRand(monthlyEarnings.reduce((sum, earning) => sum + earning.net_amount, 0))}
        />
        <MetricCard title="Completed jobs" value={String(completedJobs.size)} />
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Earnings per booking</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cleaner</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Tenure</TableHead>
                    <TableHead className="text-right">Customer payment</TableHead>
                    <TableHead className="text-right">Service fee</TableHead>
                    <TableHead className="text-right">Net value</TableHead>
                    <TableHead>Calculation</TableHead>
                    <TableHead className="text-right">Final payout</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>{earning.cleaner?.full_name ?? "Unknown"}</TableCell>
                      <TableCell>
                        {earning.booking ? (
                          <Link
                            href={`/admin/bookings/${earning.booking.id}`}
                            className="font-mono text-xs hover:underline"
                          >
                            {earning.booking.booking_reference}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Manual</span>
                        )}
                      </TableCell>
                      <TableCell>{earning.cleaner_role}</TableCell>
                      <TableCell>
                        {earning.tenure_months >= 4 ? "4+ months" : "<4 months"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRand(earning.booking_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRand(earning.service_fee)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRand(earning.net_booking_value)}
                      </TableCell>
                      <TableCell className="min-w-56 text-sm text-muted-foreground">
                        {formatCalculation(earning)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRand(earning.net_amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={earning.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              Earnings are created automatically when completed bookings have assigned cleaners.
            </p>
          )}
        </CardContent>
      </Card>
    </AdminPage>
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

  return `${earning.cleaner_percentage}% of ${formatRand(earning.net_booking_value)}, then R250-R300 limits`;
}

function toCsvDataUri(
  earnings: Awaited<ReturnType<typeof getCleanerEarnings>>
) {
  const rows = [
    [
      "Cleaner",
      "Booking",
      "Service",
      "Role",
      "Tenure months",
      "Customer payment",
      "Service fee",
      "Net booking value",
      "Cleaner percentage",
      "Final payout",
      "Status",
    ],
    ...earnings.map((earning) => [
      earning.cleaner?.full_name ?? "",
      earning.booking?.booking_reference ?? "",
      earning.booking?.service_name ?? "",
      earning.cleaner_role,
      String(earning.tenure_months),
      String(earning.booking_amount),
      String(earning.service_fee),
      String(earning.net_booking_value),
      earning.cleaner_percentage === null ? "" : String(earning.cleaner_percentage),
      String(earning.net_amount),
      earning.status,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");

  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}
