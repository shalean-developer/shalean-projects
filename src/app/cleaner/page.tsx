import Link from "next/link";

import { NotificationCenter } from "@/components/platform/notification-center";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusBadge } from "@/components/platform/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCleaner } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { formatRand } from "@/lib/pricing";
import { getBookingsByCleanerId, getCleanerEarnings, getNotificationsForUser } from "@/lib/supabase/queries";

export default async function CleanerDashboardPage() {
  const { user, cleaner } = await requireCleaner("/cleaner");
  const [jobs, earnings, notifications] = await Promise.all([
    getBookingsByCleanerId(cleaner.id),
    getCleanerEarnings(cleaner.id),
    getNotificationsForUser(user.id, "cleaner"),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const todaysJobs = jobs.filter((job) => job.booking_date === today);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-normal">Dashboard</h2>
          <p className="mt-2 text-muted-foreground">Assigned jobs, status updates, availability, and earnings.</p>
        </div>
        <Link href="/cleaner/jobs" className={buttonVariants()}>
          View jobs
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Today" value={String(todaysJobs.length)} />
        <MetricCard title="Assigned" value={String(jobs.filter((job) => job.job_status !== "Completed").length)} />
        <MetricCard title="Pending earnings" value={formatRand(earnings.filter((earning) => earning.status !== "Paid").reduce((sum, earning) => sum + earning.net_amount, 0))} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Today&apos;s jobs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {todaysJobs.length ? (
              todaysJobs.map((job) => (
                <Link key={job.id} href={`/cleaner/jobs/${job.id}`} className="grid gap-2 rounded-lg border bg-background p-3 hover:bg-muted/50 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-medium">{job.service_name}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(job.booking_date, job.booking_time)} · {job.suburb}</p>
                  </div>
                  <StatusBadge status={job.job_status} />
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No jobs assigned for today.</p>
            )}
          </CardContent>
        </Card>
        <NotificationCenter initialNotifications={notifications} userId={user.id} role="cleaner" />
      </div>
    </div>
  );
}
