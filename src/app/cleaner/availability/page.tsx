import Link from "next/link";

import { createCleanerLeaveRequest } from "@/app/actions";
import { StatusBadge } from "@/components/platform/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCleaner } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import {
  getBookingsByCleanerId,
  getCleanerLeaveRequests,
} from "@/lib/supabase/queries";
import type {
  BookingWithService,
  CleanerLeaveRequest,
  CleanerWithAvailability,
  WorkingDay,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CleanerAvailabilityPage() {
  const { cleaner } = await requireCleaner("/cleaner/availability");
  const [jobs, leaveRequests] = await Promise.all([
    getBookingsByCleanerId(cleaner.id),
    getCleanerLeaveRequests(cleaner.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const upcomingJobs = jobs.filter(
    (job) => job.booking_date >= today && job.status !== "Cancelled"
  );
  const calendarDays = buildCalendarDays(today, 30);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Availability</h2>
        <p className="mt-2 text-muted-foreground">
          Availability is calculated from your working schedule, bookings, and approved leave.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Availability calendar</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <Legend color="bg-emerald-500" label="Available" />
              <Legend color="bg-red-500" label="Booked" />
              <Legend color="bg-neutral-900" label="Leave" />
              <Legend color="bg-muted-foreground" label="Not working" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {calendarDays.map((date) => {
                const status = getCalendarStatus(date, cleaner, upcomingJobs, leaveRequests);

                return (
                  <div
                    key={date}
                    className="grid min-h-28 gap-2 rounded-lg border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs text-muted-foreground">{date}</p>
                      <span className={`size-3 rounded-full ${status.color}`} />
                    </div>
                    <p className="font-medium">{formatDay(date)}</p>
                    <p className="text-sm text-muted-foreground">{status.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid h-fit gap-5">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Working schedule</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Detail label="Working days" value={cleaner.working_days.join(", ")} />
              <Detail
                label="Working hours"
                value={`${cleaner.working_start_time.slice(0, 5)} - ${cleaner.working_end_time.slice(0, 5)}`}
              />
              <Detail label="Status" value={cleaner.active ? "Active" : "Inactive"} />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Request leave</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createCleanerLeaveRequest} className="grid gap-3">
                <input type="hidden" name="cleaner_id" value={cleaner.id} />
                <select
                  name="request_type"
                  defaultValue="Leave"
                  className="h-10 rounded-lg border bg-background px-3 text-sm"
                >
                  <option value="Leave">Leave request</option>
                  <option value="Sick Leave">Sick leave request</option>
                </select>
                <input
                  name="start_date"
                  type="date"
                  required
                  className="h-10 rounded-lg border bg-background px-3 text-sm"
                />
                <input
                  name="end_date"
                  type="date"
                  required
                  className="h-10 rounded-lg border bg-background px-3 text-sm"
                />
                <textarea
                  name="reason"
                  required
                  placeholder="Reason"
                  className="min-h-24 rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <Button type="submit">Submit request</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Upcoming bookings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {upcomingJobs.length ? (
              upcomingJobs.slice(0, 8).map((job) => (
                <Link
                  key={job.id}
                  href={`/cleaner/jobs/${job.id}`}
                  className="grid gap-2 rounded-lg border bg-background p-3 hover:bg-muted/50 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-medium">{job.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(job.booking_date, job.booking_time)} - {job.suburb}
                    </p>
                  </div>
                  <StatusBadge status={job.job_status} />
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                No upcoming bookings assigned.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Leave requests</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {leaveRequests.length ? (
              leaveRequests.map((request) => (
                <div key={request.id} className="grid gap-2 rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{request.request_type}</p>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {request.start_date} - {request.end_date}
                  </p>
                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                No leave requests submitted.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[62%] text-right font-medium">{value}</span>
    </div>
  );
}

function getCalendarStatus(
  date: string,
  cleaner: CleanerWithAvailability,
  jobs: BookingWithService[],
  leaveRequests: CleanerLeaveRequest[]
) {
  const day = formatWeekday(date);
  const hasBooking = jobs.some((job) => job.booking_date === date);
  const hasLeave = leaveRequests.some(
    (request) =>
      request.status === "Approved" &&
      request.start_date <= date &&
      request.end_date >= date
  );

  if (!cleaner.active) {
    return { label: "Inactive", color: "bg-muted-foreground" };
  }

  if (hasLeave) {
    return { label: "Leave", color: "bg-neutral-900" };
  }

  if (hasBooking) {
    return { label: "Booked", color: "bg-red-500" };
  }

  if (!cleaner.working_days.includes(day)) {
    return { label: "Not working", color: "bg-muted-foreground" };
  }

  return { label: "Available", color: "bg-emerald-500" };
}

function buildCalendarDays(startDate: string, count: number) {
  const start = new Date(`${startDate}T00:00:00`);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function formatWeekday(date: string): WorkingDay {
  return new Intl.DateTimeFormat("en-ZA", { weekday: "long" }).format(
    new Date(`${date}T00:00:00`)
  ) as WorkingDay;
}
