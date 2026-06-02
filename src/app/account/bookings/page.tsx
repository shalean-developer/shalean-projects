import Link from "next/link";
import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { requireCustomer } from "@/lib/auth";
import { getCustomerBookings } from "@/lib/supabase/queries";
import type { BookingStatus, JobStatus, PaymentStatus } from "@/lib/types";

export default async function AccountBookingsPage() {
  const { customer } = await requireCustomer("/account/bookings");
  const bookings = await getCustomerBookings(customer.id);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Booking history</h2>
        <p className="mt-2 text-muted-foreground">
          Track every Shalean booking linked to your account.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>All bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length ? (
            <>
              <div className="grid gap-3 md:hidden">
                {bookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/account/bookings/${booking.id}`}
                    className="grid gap-3 rounded-lg border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {booking.booking_reference}
                        </p>
                        <p className="mt-1 font-medium">{booking.service_name}</p>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatBookingDateTime(booking.booking_date, booking.booking_time)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.address}, {booking.suburb}, {booking.city}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <PaymentStatusBadge status={booking.payment_status} />
                      <JobStatusBadge status={booking.job_status} />
                    </div>
                  </Link>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Date and time</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs">
                          {booking.booking_reference}
                        </TableCell>
                        <TableCell>{booking.service_name}</TableCell>
                        <TableCell>
                          {formatBookingDateTime(
                            booking.booking_date,
                            booking.booking_time
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.address}, {booking.suburb}, {booking.city}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={booking.payment_status} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={booking.status} />
                        </TableCell>
                        <TableCell>
                          <JobStatusBadge status={booking.job_status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/account/bookings/${booking.id}`}
                            className={buttonVariants({
                              variant: "outline",
                              size: "icon",
                            })}
                          >
                            <Eye className="size-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="grid min-h-52 place-items-center rounded-lg border border-dashed text-center">
              <div className="grid gap-3">
                <p className="font-medium">No bookings yet</p>
                <p className="text-sm text-muted-foreground">
                  Your booked cleaning services will appear here.
                </p>
                <Link href="/book" className={buttonVariants({ className: "mx-auto" })}>
                  Book a cleaning
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant={status === "Cancelled" ? "destructive" : "secondary"}>
      {status}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant =
    status === "Paid" || status === "Deposit Paid"
      ? "default"
      : status === "Failed" || status === "Refunded"
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  const variant =
    status === "Completed"
      ? "default"
      : status === "Cancelled"
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}

function formatBookingDateTime(date: string, time: string) {
  const formattedDate = new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

  return `${formattedDate} at ${time.slice(0, 5)}`;
}
