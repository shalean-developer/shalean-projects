import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingRequestForms } from "@/components/account/booking-request-forms";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRand } from "@/lib/pricing";
import { requireCustomer } from "@/lib/auth";
import {
  getCustomerBookingById,
  getCustomerBookingRequests,
} from "@/lib/supabase/queries";
import type {
  BookingRequest,
  BookingStatus,
  JobStatus,
  PaymentStatus,
  RequestStatus,
} from "@/lib/types";

export default async function AccountBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { customer } = await requireCustomer(`/account/bookings/${id}`);
  const booking = await getCustomerBookingById(customer.id, id);

  if (!booking) {
    notFound();
  }

  const requests = await getCustomerBookingRequests(customer.id, booking.id);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-sm text-primary">{booking.booking_reference}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">
            Booking detail
          </h2>
          <p className="mt-2 text-muted-foreground">{booking.service_name}</p>
        </div>
        <Link
          href="/account/bookings"
          className={buttonVariants({ variant: "outline" })}
        >
          Back to bookings
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-5">
          <DetailCard title="Service">
            <DetailRow label="Service" value={booking.service_name} />
            {booking.service_data.questions.map((question) => (
              <DetailRow
                key={question.id}
                label={question.label}
                value={String(question.value)}
              />
            ))}
          </DetailCard>

          <DetailCard title="Add-ons">
            {booking.selected_addons.length ? (
              booking.selected_addons.map((addon) => (
                <DetailRow key={addon.id} label={addon.label} value={formatRand(addon.price)} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No add-ons selected.</p>
            )}
          </DetailCard>

          <DetailCard title="Schedule and cleaner">
            <DetailRow
              label="Date and time"
              value={formatBookingDateTime(booking.booking_date, booking.booking_time)}
            />
            <DetailRow
              label="Assigned cleaner"
              value={booking.assigned_cleaner?.full_name ?? "Not assigned yet"}
            />
          </DetailCard>

          <DetailCard title="Address">
            <DetailRow label="Street address" value={booking.address} />
            <DetailRow label="Suburb" value={booking.suburb} />
            <DetailRow label="City" value={booking.city} />
            {booking.notes ? (
              <>
                <Separator />
                <DetailRow label="Notes" value={booking.notes} />
              </>
            ) : null}
          </DetailCard>

          <DetailCard title="Payment details">
            <DetailRow label="Payment status" value={booking.payment_status} />
            <DetailRow label="Payment option" value={booking.payment_type ?? "Not selected"} />
            <DetailRow label="Total amount" value={formatRand(booking.total_amount)} />
            <DetailRow label="Amount paid" value={formatRand(booking.amount_paid)} />
            <DetailRow label="Balance due" value={formatRand(booking.balance_due)} />
          </DetailCard>

          <DetailCard title="Requests">
            {requests.length ? (
              <div className="grid gap-3">
                {requests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No reschedule or cancel requests for this booking.
              </p>
            )}
            <BookingRequestForms
              bookingId={booking.id}
              canReschedule={booking.can_reschedule && booking.status !== "Cancelled"}
              canCancel={booking.can_cancel && booking.status !== "Cancelled"}
            />
          </DetailCard>
        </div>

        <Card className="h-fit rounded-lg border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Booking summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <DetailRow label="Date" value={booking.booking_date} />
            <DetailRow label="Time" value={booking.booking_time.slice(0, 5)} />
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">Payment status</p>
              <PaymentStatusBadge status={booking.payment_status} />
            </div>
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">Booking status</p>
              <StatusBadge status={booking.status} />
            </div>
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">Job status</p>
              <JobStatusBadge status={booking.job_status} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[62%] text-right font-medium">{value}</span>
    </div>
  );
}

function RequestCard({ request }: { request: BookingRequest }) {
  return (
    <div className="grid gap-2 rounded-lg border bg-background p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{request.request_type}</p>
        <RequestStatusBadge status={request.request_status} />
      </div>
      {request.request_type === "Reschedule" ? (
        <p className="text-muted-foreground">
          Preferred: {request.requested_date} at {request.requested_time?.slice(0, 5)}
        </p>
      ) : null}
      <p className="text-muted-foreground">{request.reason}</p>
      {request.admin_notes ? (
        <p className="rounded-lg bg-muted p-3 text-muted-foreground">
          {request.admin_notes}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={status === "Cancelled" ? "destructive" : "secondary"}>{status}</Badge>;
}

function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const variant =
    status === "Approved" ? "default" : status === "Declined" ? "destructive" : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
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
