import { notFound } from "next/navigation";

import { updateCleanerJobWorkflow } from "@/app/actions";
import { StatusBadge } from "@/components/platform/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireCleaner } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { formatRand } from "@/lib/pricing";
import { getCleanerBookingById, getCleanerEarnings } from "@/lib/supabase/queries";
import type { JobStatus } from "@/lib/types";

const workflowActions: { status: JobStatus; label: string }[] = [
  { status: "Accepted", label: "Accept job" },
  { status: "Declined", label: "Decline job" },
  { status: "On The Way", label: "On the way" },
  { status: "In Progress", label: "Start job" },
  { status: "Completed", label: "Complete job" },
];

export default async function CleanerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { cleaner } = await requireCleaner(`/cleaner/jobs/${id}`);
  const [job, earnings] = await Promise.all([
    getCleanerBookingById(cleaner.id, id),
    getCleanerEarnings(cleaner.id),
  ]);

  if (!job) {
    notFound();
  }

  const earning = earnings.find((item) => item.booking_id === job.id);

  return (
    <div className="grid gap-5">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{job.booking_reference}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-normal">{job.service_name}</h2>
        <p className="mt-2 text-muted-foreground">{formatDateTime(job.booking_date, job.booking_time)}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-5">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Customer address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <DetailRow label="Customer" value={job.customer_name} />
              <DetailRow label="Phone" value={job.customer_phone} />
              <DetailRow
                label="Cleaners assigned"
                value={String(job.assigned_cleaners.length || job.number_of_cleaners)}
              />
              <Separator />
              <DetailRow label="Address" value={job.address} />
              <DetailRow label="Suburb" value={job.suburb} />
              <DetailRow label="City" value={job.city} />
              <DetailRow label="Notes" value={job.notes ?? "No job notes"} />
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Service notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {job.service_data.questions.map((question) => (
                <DetailRow key={question.id} label={question.label} value={String(question.value)} />
              ))}
              {job.selected_addons.length ? (
                job.selected_addons.map((addon) => (
                  <DetailRow key={addon.id} label="Add-on" value={addon.label} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No add-ons selected.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit rounded-lg">
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-sm text-muted-foreground">Estimated earning</p>
              <p className="mt-1 text-2xl font-semibold tracking-normal">
                {formatRand(earning?.net_amount ?? estimateCleanerEarning(job.service_name))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {earning
                  ? "Calculated from the current Shalean earning rules."
                  : "Estimated from the current Shalean earning rules."}
              </p>
            </div>
            <StatusBadge status={job.job_status} />
            {workflowActions.map((action) => (
              <form key={action.status} action={updateCleanerJobWorkflow}>
                <input type="hidden" name="booking_id" value={job.id} />
                <input type="hidden" name="job_status" value={action.status} />
                <Button type="submit" variant={action.status === "Declined" ? "destructive" : "outline"} className="w-full">
                  {action.label}
                </Button>
              </form>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function estimateCleanerEarning(serviceName: string) {
  if (serviceName === "Deep Cleaning" || serviceName === "Moving Cleaning") {
    return 250;
  }

  return 250;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium">{value}</span>
    </div>
  );
}
