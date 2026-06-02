import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AdminPage } from "@/components/admin/admin-page";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusBadge } from "@/components/platform/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRand } from "@/lib/pricing";
import { getBookings, getReportingSummary, getSupportTickets } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [summary, bookings, tickets] = await Promise.all([
    getReportingSummary(),
    getBookings(),
    getSupportTickets(),
  ]);
  const unassigned = bookings.filter((booking) => !booking.assigned_cleaner_id);
  const openTickets = tickets.filter((ticket) => ticket.status !== "Closed");

  return (
    <AdminPage
      title="Operations dashboard"
      description="Booking flow, revenue, support, cleaner workload, and scheduling risk in one place."
      actions={
        <>
          <Link href="/admin/schedule" className={buttonVariants({ variant: "outline" })}>
            Schedule
          </Link>
          <Link href="/admin/reports" className={buttonVariants()}>
            Reports
          </Link>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total bookings" value={String(summary.totalBookings)} />
        <MetricCard title="Completed" value={String(summary.completedBookings)} />
        <MetricCard title="Revenue" value={formatRand(summary.revenue)} />
        <MetricCard title="Open support" value={String(openTickets.length)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Unassigned bookings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {unassigned.length ? (
              unassigned.slice(0, 6).map((booking) => (
                <Link
                  key={booking.id}
                  href={`/admin/bookings/${booking.id}`}
                  className="grid gap-2 rounded-lg border bg-background p-3 hover:bg-muted/50 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {booking.booking_reference}
                    </p>
                    <p className="font-medium">{booking.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.booking_date} at {booking.booking_time.slice(0, 5)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                Every booking has a cleaner assigned.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Booking conversion</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {summary.bookingConversionTrends.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
              >
                <StatusBadge status={item.status} />
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminPage>
  );
}
