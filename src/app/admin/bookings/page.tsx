import Link from "next/link";
import { CalendarDays, Eye, Users } from "lucide-react";

import { StatusSelectForm } from "@/components/admin/status-select-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { services } from "@/config/services";
import { formatRand } from "@/lib/pricing";
import { hasSupabaseConfig } from "@/lib/supabase/admin";
import { isSupabaseSchemaMissingError } from "@/lib/supabase/errors";
import { getBookings, getCleaners } from "@/lib/supabase/queries";
import {
  bookingStatuses,
  jobStatuses,
  paymentStatuses,
  type BookingStatus,
  type BookingWithService,
  type Cleaner,
  type JobStatus,
  type PaymentStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string;
    status?: string;
    paymentStatus?: string;
    cleaner?: string;
    jobStatus?: string;
  }>;
}) {
  if (!hasSupabaseConfig()) {
    return <SupabaseSetupNotice />;
  }

  const params = await searchParams;
  const setupData = await getBookingsDataOrSetupNotice();

  if (!setupData) {
    return <SupabaseSetupNotice schemaMissing />;
  }

  const filteredBookings = filterBookings(setupData.bookings, params);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Admin dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              Bookings
            </h1>
            <p className="mt-3 text-muted-foreground">
              Review service-specific requests and update each booking status.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/cleaners"
              className={buttonVariants({ variant: "outline" })}
            >
              <Users className="size-4" />
              Cleaners
            </Link>
            <Link href="/admin/requests" className={buttonVariants({ variant: "outline" })}>
              Requests
            </Link>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Home
            </Link>
            <Link href="/book" className={buttonVariants()}>
              New booking
            </Link>
          </div>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="flex items-center justify-between gap-4">
                <CardTitle>All bookings</CardTitle>
                <Badge variant="secondary">{filteredBookings.length} shown</Badge>
              </div>
              <Filters
                service={params.service}
                status={params.status}
                paymentStatus={params.paymentStatus}
                cleaner={params.cleaner}
                jobStatus={params.jobStatus}
                cleaners={setupData.cleaners}
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredBookings.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date and Time</TableHead>
                      <TableHead>Selected Add-ons</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Payment Reference</TableHead>
                      <TableHead>Assigned Cleaner</TableHead>
                      <TableHead>Job Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs">
                          {booking.booking_reference}
                        </TableCell>
                        <TableCell>{booking.service_name}</TableCell>
                        <TableCell>
                          <div className="grid gap-1">
                            <span className="font-medium">
                              {booking.customer_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {booking.customer_email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="grid gap-2">
                            <PaymentStatusBadge
                              status={booking.payment_status}
                            />
                            <span className="text-xs text-muted-foreground">
                              {booking.payment_type ?? "Not selected"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatRand(booking.amount_paid)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatRand(booking.balance_due)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {booking.latest_payment?.payment_reference ?? "None"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="size-4 text-muted-foreground" />
                            <span>
                              {formatBookingDateTime(
                                booking.booking_date,
                                booking.booking_time
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.selected_addons.length
                            ? booking.selected_addons
                                .map((addon) => addon.label)
                                .join(", ")
                            : "None"}
                        </TableCell>
                        <TableCell>
                          <div className="grid gap-2">
                            <StatusBadge status={booking.status} />
                            <StatusSelectForm
                              key={`${booking.id}-${booking.status}`}
                              bookingId={booking.id}
                              status={booking.status}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.assigned_cleaner ? (
                            <Link
                              href={`/admin/cleaners/${booking.assigned_cleaner.id}`}
                              className="font-medium hover:underline"
                            >
                              {booking.assigned_cleaner.full_name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">
                              Not assigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <JobStatusBadge status={booking.job_status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatRand(booking.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className={buttonVariants({
                              variant: "outline",
                              size: "icon",
                            })}
                            aria-label={`View booking ${booking.booking_reference}`}
                          >
                            <Eye className="size-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid min-h-52 place-items-center rounded-lg border border-dashed text-center">
                <div className="grid gap-3">
                  <p className="font-medium">No bookings match these filters</p>
                  <p className="text-sm text-muted-foreground">
                    New customer bookings will appear here.
                  </p>
                  <Link
                    href="/admin/bookings"
                    className={buttonVariants({ className: "mx-auto w-fit" })}
                  >
                    Clear filters
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Filters({
  service,
  status,
  paymentStatus,
  cleaner,
  jobStatus,
  cleaners,
}: {
  service?: string;
  status?: string;
  paymentStatus?: string;
  cleaner?: string;
  jobStatus?: string;
  cleaners: Cleaner[];
}) {
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[180px_160px_180px_180px_170px_auto]"
      action="/admin/bookings"
    >
      <select
        name="service"
        defaultValue={service ?? ""}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="">All services</option>
        {services.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
          </option>
        ))}
      </select>
      <select
        name="status"
        defaultValue={status ?? ""}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="">All statuses</option>
        {bookingStatuses.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select
        name="paymentStatus"
        defaultValue={paymentStatus ?? ""}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="">All payment statuses</option>
        {paymentStatuses.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select
        name="cleaner"
        defaultValue={cleaner ?? ""}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="">All cleaners</option>
        {cleaners.map((item) => (
          <option key={item.id} value={item.id}>
            {item.full_name}
          </option>
        ))}
      </select>
      <select
        name="jobStatus"
        defaultValue={jobStatus ?? ""}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="">All job statuses</option>
        {jobStatuses.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" className="h-9">
          Filter
        </Button>
        <Link href="/admin/bookings" className={buttonVariants({ variant: "ghost" })}>
          Reset
        </Link>
      </div>
    </form>
  );
}

function filterBookings(
  bookings: BookingWithService[],
  params: {
    service?: string;
    status?: string;
    paymentStatus?: string;
    cleaner?: string;
    jobStatus?: string;
  }
) {
  return bookings.filter((booking) => {
    const matchesService =
      !params.service || booking.service_data.serviceSlug === params.service;
    const matchesStatus = !params.status || booking.status === params.status;
    const matchesPaymentStatus =
      !params.paymentStatus ||
      booking.payment_status === params.paymentStatus;
    const matchesCleaner =
      !params.cleaner || booking.assigned_cleaner_id === params.cleaner;
    const matchesJobStatus =
      !params.jobStatus || booking.job_status === params.jobStatus;

    return (
      matchesService &&
      matchesStatus &&
      matchesPaymentStatus &&
      matchesCleaner &&
      matchesJobStatus
    );
  });
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const variant = status === "Cancelled" ? "destructive" : "secondary";

  return (
    <Badge variant={variant} className="w-fit">
      {status}
    </Badge>
  );
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  const variant =
    status === "Cancelled"
      ? "destructive"
      : status === "Completed"
        ? "default"
        : "secondary";

  return (
    <Badge variant={variant} className="w-fit">
      {status}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant =
    status === "Failed" || status === "Refunded"
      ? "destructive"
      : status === "Paid" || status === "Deposit Paid"
        ? "default"
        : "secondary";

  return (
    <Badge variant={variant} className="w-fit">
      {status}
    </Badge>
  );
}

function formatBookingDateTime(date: string, time: string) {
  const formattedDate = new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

  return `${formattedDate} at ${time.slice(0, 5)}`;
}

async function getBookingsDataOrSetupNotice() {
  try {
    const [bookings, cleaners] = await Promise.all([getBookings(), getCleaners()]);

    return { bookings, cleaners };
  } catch (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return null;
    }

    throw error;
  }
}

function SupabaseSetupNotice({
  schemaMissing = false,
}: {
  schemaMissing?: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <Card className="w-full max-w-xl rounded-lg">
        <CardHeader>
          <CardTitle>
            {schemaMissing
              ? "Supabase tables are not created yet"
              : "Supabase is not configured yet"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
          <p>
            {schemaMissing
              ? "Run the SQL migrations in `supabase/migrations` from the Supabase SQL Editor, then refresh this page."
              : "Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to your local environment, then run the SQL migrations in `supabase/migrations`."}
          </p>
          <Link href="/" className={buttonVariants({ className: "w-fit" })}>
            Back home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
