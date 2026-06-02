import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { StatusBadge } from "@/components/platform/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCleaner } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getBookingsByCleanerId } from "@/lib/supabase/queries";

export default async function CleanerJobsPage() {
  const { cleaner } = await requireCleaner("/cleaner/jobs");
  const jobs = await getBookingsByCleanerId(cleaner.id);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Jobs</h2>
        <p className="mt-2 text-muted-foreground">Accept, decline, travel, start, and complete assigned jobs.</p>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Assigned jobs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {jobs.length ? (
            jobs.map((job) => (
              <Link key={job.id} href={`/cleaner/jobs/${job.id}`} className="grid gap-3 rounded-lg border bg-background p-4 hover:bg-muted/50 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{job.booking_reference}</p>
                  <p className="font-medium">{job.service_name}</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(job.booking_date, job.booking_time)} · {job.address}, {job.suburb}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={job.job_status} />
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No jobs assigned yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
