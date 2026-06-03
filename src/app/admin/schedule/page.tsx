import Link from "next/link";

import { updateCleanerLeaveRequestStatus } from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusBadge } from "@/components/platform/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getBookings,
  getCleanerDateAvailability,
  getCleanerLeaveRequestsInRange,
  getServiceConfigs,
} from "@/lib/supabase/queries";
import type { BookingWithService, CleanerDateAvailability } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    area?: string;
    service?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const [bookings, services] = await Promise.all([getBookings(), getServiceConfigs()]);
  const selectedDate = normaliseDate(params.date);
  const selectedService = services.find((service) => service.slug === params.service) ?? services[0];
  const selectedArea = params.area?.trim() ?? "";
  const selectedStatus = normaliseAvailabilityStatus(params.status);
  const daily = bookings
    .filter(
      (booking) =>
        booking.booking_date === selectedDate &&
        (!selectedArea || booking.suburb.toLowerCase().includes(selectedArea.toLowerCase())) &&
        (!selectedService || booking.service_name === selectedService.name)
    )
    .sort(sortBySchedule);
  const weekStart = new Date(`${selectedDate}T00:00:00`);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day.toISOString().slice(0, 10);
  });
  const weekEnd = new Date(`${weekDays[6]}T00:00:00`);
  weekEnd.setDate(weekEnd.getDate() + 1);
  const weekly = bookings
    .filter((booking) => {
      const date = new Date(`${booking.booking_date}T00:00:00`);
      return (
        date >= weekStart &&
        date < weekEnd &&
        (!selectedArea ||
          booking.suburb.toLowerCase().includes(selectedArea.toLowerCase())) &&
        (!selectedService || booking.service_name === selectedService.name)
      );
    })
    .sort(sortBySchedule);
  const unassigned = weekly.filter((booking) => !booking.assigned_cleaner_id);
  const [availability, pendingLeave] = await Promise.all([
    selectedService
      ? getCleanerDateAvailability({
          serviceName: selectedService.name,
          bookingDate: selectedDate,
          bookingTime: "08:00",
        })
      : Promise.resolve([]),
    getCleanerLeaveRequestsInRange({
      startDate: selectedDate,
      endDate: weekDays[6],
      status: "Pending",
    }),
  ]);
  const filteredAvailability = selectedStatus
    ? availability.filter((item) => item.status === selectedStatus)
    : availability;

  return (
    <AdminPage
      title="Schedule"
      description="Daily and weekly calendar views with workload and unassigned booking visibility."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Selected day" value={String(daily.length)} />
        <MetricCard title="This week" value={String(weekly.length)} />
        <MetricCard title="Unassigned" value={String(unassigned.length)} />
        <MetricCard
          title="Available cleaners"
          value={String(availability.filter((item) => item.status === "available").length)}
        />
      </div>

      <form
        action="/admin/schedule"
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Start date</span>
          <input
            name="date"
            type="date"
            defaultValue={selectedDate}
            className="h-9 rounded-lg border bg-background px-3 text-sm"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Area</span>
          <input
            name="area"
            defaultValue={selectedArea}
            placeholder="Suburb"
            className="h-9 rounded-lg border bg-background px-3 text-sm"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Service Type</span>
          <select
            name="service"
            defaultValue={selectedService?.slug ?? ""}
            className="h-9 rounded-lg border bg-background px-3 text-sm"
          >
            {services.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Availability Status</span>
          <select
            name="status"
            defaultValue={selectedStatus ?? ""}
            className="h-9 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">All</option>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="leave">Leave</option>
            <option value="inactive">Inactive</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <Button type="submit" variant="outline">
          Update schedule
        </Button>
        <Link href="/admin/schedule" className={buttonVariants({ variant: "ghost" })}>
          Reset
        </Link>
      </form>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Daily schedule</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {daily.length ? (
                daily.map((booking) => <ScheduleItem key={booking.id} booking={booking} />)
              ) : (
                <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  No jobs scheduled for this day.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Weekly calendar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
              {weekDays.map((day) => {
                const dayBookings = weekly.filter(
                  (booking) => booking.booking_date === day
                );

                return (
                  <div
                    key={day}
                    className="grid min-h-40 gap-2 rounded-lg border bg-background p-3"
                  >
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{day}</p>
                      <p className="font-medium">{formatDayName(day)}</p>
                    </div>
                    {dayBookings.length ? (
                      dayBookings.map((booking) => (
                        <Link
                          key={booking.id}
                          href={`/admin/bookings/${booking.id}`}
                          className="rounded-lg border p-2 text-xs hover:bg-muted/50"
                        >
                          <p className="font-medium">
                            {booking.booking_time.slice(0, 5)}
                          </p>
                          <p>{booking.service_name}</p>
                          <p className="text-muted-foreground">
                            {booking.assigned_cleaner?.full_name ?? "Unassigned"}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <p className="self-end text-xs text-muted-foreground">No jobs</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="grid h-fit gap-5">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Unassigned bookings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {unassigned.length ? (
                unassigned.map((booking) => (
                  <ScheduleItem key={booking.id} booking={booking} compact />
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
              <CardTitle>Cleaner availability</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {filteredAvailability.map((item) => (
                <div key={item.cleaner.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.cleaner.full_name}</p>
                    <AvailabilityBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.reason} - {item.cleaner.working_start_time.slice(0, 5)} to{" "}
                    {item.cleaner.working_end_time.slice(0, 5)}
                  </p>
                </div>
              ))}
              {!filteredAvailability.length ? (
                <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  No cleaners match these filters.
                </p>
              ) : null}
              <Link href="/admin/bookings" className={buttonVariants({ variant: "outline" })}>
                Assign jobs
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Pending leave</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {pendingLeave.length ? (
                pendingLeave.map((request) => (
                  <div key={request.id} className="grid gap-3 rounded-lg border bg-background p-3">
                    <div>
                      <p className="font-medium">
                        {request.cleaner?.full_name ?? "Cleaner"} - {request.request_type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.start_date} to {request.end_date}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{request.reason}</p>
                    </div>
                    <LeaveDecisionForm requestId={request.id} />
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  No pending leave requests.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}

function AvailabilityBadge({ status }: { status: CleanerDateAvailability["status"] }) {
  const label =
    status === "available"
      ? "Available"
      : status === "busy"
        ? "Busy"
        : status === "leave"
          ? "Leave"
          : status === "inactive"
            ? "Inactive"
            : "Unavailable";
  const variant =
    status === "available" ? "default" : status === "busy" ? "destructive" : "secondary";

  return <Badge variant={variant}>{label}</Badge>;
}

function LeaveDecisionForm({ requestId }: { requestId: string }) {
  return (
    <div className="grid gap-2">
      <form action={updateCleanerLeaveRequestStatus} className="grid gap-2">
        <input type="hidden" name="leave_request_id" value={requestId} />
        <input type="hidden" name="status" value="Approved" />
        <textarea
          name="admin_notes"
          placeholder="Admin notes"
          className="min-h-16 rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" size="sm">
          Approve
        </Button>
      </form>
      <form action={updateCleanerLeaveRequestStatus}>
        <input type="hidden" name="leave_request_id" value={requestId} />
        <input type="hidden" name="status" value="Rejected" />
        <Button type="submit" size="sm" variant="outline" className="w-full">
          Reject
        </Button>
      </form>
    </div>
  );
}

function ScheduleItem({
  booking,
  compact = false,
}: {
  booking: BookingWithService;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/admin/bookings/${booking.id}`}
      className="grid gap-3 rounded-lg border bg-background p-3 hover:bg-muted/50 sm:grid-cols-[140px_1fr_auto] sm:items-center"
    >
      <div className="font-mono text-sm">
        {booking.booking_date}
        <br />
        {booking.booking_time.slice(0, 5)}
      </div>
      <div>
        <p className="font-medium">{booking.service_name}</p>
        <p className="text-sm text-muted-foreground">
          {booking.assigned_cleaner?.full_name ?? "Unassigned"} - {booking.suburb}
        </p>
      </div>
      {compact ? null : <StatusBadge status={booking.job_status} />}
    </Link>
  );
}

function normaliseDate(value: string | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

function normaliseAvailabilityStatus(value: string | undefined) {
  if (
    value === "available" ||
    value === "busy" ||
    value === "leave" ||
    value === "inactive" ||
    value === "unavailable"
  ) {
    return value;
  }

  return null;
}

function sortBySchedule(a: BookingWithService, b: BookingWithService) {
  return (
    new Date(`${a.booking_date}T${a.booking_time.slice(0, 5)}:00`).getTime() -
    new Date(`${b.booking_date}T${b.booking_time.slice(0, 5)}:00`).getTime()
  );
}

function formatDayName(date: string) {
  return new Intl.DateTimeFormat("en-ZA", { weekday: "short" }).format(
    new Date(`${date}T00:00:00`)
  );
}
