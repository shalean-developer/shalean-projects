import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPage } from "@/components/admin/admin-page";
import { CleanerAssignmentControls } from "@/components/admin/cleaner-assignment-controls";
import { JobStatusSelectForm } from "@/components/admin/job-status-select-form";
import { StatusSelectForm } from "@/components/admin/status-select-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRand } from "@/lib/pricing";
import { hasSupabaseConfig } from "@/lib/supabase/admin";
import {
  getBookingById,
  getBookingRequestsByBookingId,
  getCleanerEarnings,
  getMatchingAvailableCleaners,
} from "@/lib/supabase/queries";
import {
  generateAdminWhatsAppMessage,
  generateCustomerWhatsAppMessage,
} from "@/lib/whatsapp";
import type {
  BookingRequest,
  BookingStatus,
  JobStatus,
  PaymentStatus,
  RequestStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasSupabaseConfig()) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5">
        <Card className="w-full max-w-xl rounded-lg">
          <CardHeader>
            <CardTitle>Supabase is not configured yet</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/bookings" className={buttonVariants()}>
              Back to bookings
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { id } = await params;
  const booking = await getBookingById(id);

  if (!booking) {
    notFound();
  }

  const [matchingCleaners, requests, earnings] = await Promise.all([
    getMatchingAvailableCleaners(booking),
    getBookingRequestsByBookingId(booking.id),
    getCleanerEarnings(),
  ]);
  const bookingEarnings = earnings.filter(
    (earning) => earning.booking_id === booking.id
  );
  const serviceFee = booking.service_data.pricingBreakdown?.serviceFee ?? 0;
  const netBookingValue = Math.max(booking.total_amount - serviceFee, 0);

  return (
    <AdminPage
      eyebrow={booking.booking_reference}
      title="Booking detail"
      description={`${booking.service_name} for ${booking.customer_name}`}
      actions={
        <Link href="/admin/bookings" className={buttonVariants({ variant: "outline" })}>
          Back to bookings
        </Link>
      }
    >
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-5">
            <DetailCard title="Service Details">
              <DetailRow label="Service Type" value={booking.service_name} />
              <DetailRow
                label="Date and Time"
                value={formatBookingDateTime(
                  booking.booking_date,
                  booking.booking_time
                )}
              />
              {booking.service_data.questions.map((question) => (
                <DetailRow
                  key={question.id}
                  label={question.label}
                  value={String(question.value)}
                />
              ))}
            </DetailCard>

            <DetailCard title="Selected Add-ons">
              {booking.selected_addons.length ? (
                booking.selected_addons.map((addon) => (
                  <DetailRow
                    key={addon.id}
                    label={addon.label}
                    value={formatRand(addon.price)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No add-ons selected.</p>
              )}
            </DetailCard>

            <DetailCard title="Customer and Address">
              <DetailRow label="Customer Name" value={booking.customer_name} />
              <DetailRow label="Customer Email" value={booking.customer_email} />
              <DetailRow label="Customer Phone" value={booking.customer_phone} />
              <Separator />
              <DetailRow label="Address" value={booking.address} />
              <DetailRow label="Suburb" value={booking.suburb} />
              <DetailRow label="City" value={booking.city} />
              {booking.notes ? (
                <>
                  <Separator />
                  <DetailRow label="Notes" value={booking.notes} />
                </>
              ) : null}
            </DetailCard>

            <DetailCard title="Payment Details">
              <DetailRow label="Payment Status" value={booking.payment_status} />
              <DetailRow
                label="Payment Type"
                value={booking.payment_type ?? "Not selected"}
              />
              <DetailRow label="Total Amount" value={formatRand(booking.total_amount)} />
              <DetailRow label="Service Fee" value={formatRand(serviceFee)} />
              <DetailRow label="Net Booking Value" value={formatRand(netBookingValue)} />
              <DetailRow label="Amount Paid" value={formatRand(booking.amount_paid)} />
              <DetailRow label="Balance Due" value={formatRand(booking.balance_due)} />
              <Separator />
              <DetailRow
                label="Payment Reference"
                value={booking.latest_payment?.payment_reference ?? "None"}
              />
              <DetailRow
                label="Paystack Reference"
                value={booking.latest_payment?.paystack_reference ?? "None"}
              />
              <DetailRow
                label="Payment Method"
                value={booking.latest_payment?.payment_method ?? "Not available"}
              />
              <DetailRow
                label="Paid At"
                value={
                  booking.latest_payment?.paid_at
                    ? formatTimestamp(booking.latest_payment.paid_at)
                    : "Not paid"
                }
              />
              <DetailRow
                label="Confirmed At"
                value={
                  booking.confirmed_at
                    ? formatTimestamp(booking.confirmed_at)
                    : "Not confirmed"
                }
              />
            </DetailCard>

            <DetailCard title="Cleaner Earnings">
              {bookingEarnings.length ? (
                bookingEarnings.map((earning) => (
                  <div key={earning.id} className="grid gap-3 rounded-lg border bg-background p-3">
                    <DetailRow
                      label="Assigned Cleaner"
                      value={earning.cleaner?.full_name ?? "Unknown cleaner"}
                    />
                    <DetailRow label="Cleaner Role" value={earning.cleaner_role} />
                    <DetailRow
                      label="Customer Payment"
                      value={formatRand(earning.booking_amount)}
                    />
                    <DetailRow
                      label="Service Fee Deducted"
                      value={formatRand(earning.service_fee)}
                    />
                    <DetailRow
                      label="Net Booking Value"
                      value={formatRand(earning.net_booking_value)}
                    />
                    <DetailRow
                      label="Earnings Calculation"
                      value={formatEarningCalculation(earning)}
                    />
                    <DetailRow
                      label="Final Payout"
                      value={formatRand(earning.net_amount)}
                    />
                    <DetailRow label="Payment Status" value={earning.status} />
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                  Earnings are generated after this booking is completed with an assigned cleaner.
                </p>
              )}
            </DetailCard>

            <DetailCard title="Customer Requests">
              {requests.length ? (
                requests.map((request) => (
                  <RequestSummary key={request.id} request={request} />
                ))
              ) : (
                <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                  No reschedule or cancellation requests for this booking.
                </p>
              )}
              <Link
                href="/admin/requests"
                className={buttonVariants({ variant: "outline", className: "w-fit" })}
              >
                Manage requests
              </Link>
            </DetailCard>

            <DetailCard title="WhatsApp Messages">
              <MessageBlock
                label="Customer message"
                value={generateCustomerWhatsAppMessage(booking)}
              />
              <MessageBlock
                label="Admin message"
                value={generateAdminWhatsAppMessage(booking)}
              />
            </DetailCard>

            <DetailCard title="Cleaner Assignment">
              <div className="grid gap-3">
                <DetailRow
                  label="Assigned Cleaner"
                  value={booking.assigned_cleaner?.full_name ?? "Not assigned"}
                />
                {booking.assigned_cleaner ? (
                  <>
                    <DetailRow
                      label="Cleaner Phone"
                      value={booking.assigned_cleaner.phone}
                    />
                    <DetailRow
                      label="Cleaner Email"
                      value={booking.assigned_cleaner.email}
                    />
                  </>
                ) : null}
                <Separator />
                <div className="grid gap-2">
                  <p className="text-sm text-muted-foreground">
                    Matching available cleaners
                  </p>
                  {matchingCleaners.length ? (
                    <div className="flex flex-wrap gap-2">
                      {matchingCleaners.map((cleaner) => (
                        <Link
                          key={cleaner.id}
                          href={`/admin/cleaners/${cleaner.id}`}
                          className="rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                          {cleaner.full_name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                      No available cleaner found for this booking time.
                    </p>
                  )}
                </div>
                <CleanerAssignmentControls
                  bookingId={booking.id}
                  currentCleanerId={booking.assigned_cleaner_id}
                  matchingCleaners={matchingCleaners}
                />
              </div>
            </DetailCard>
          </div>

          <Card className="h-fit rounded-lg border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailRow label="Date" value={booking.booking_date} />
              <DetailRow label="Time" value={booking.booking_time.slice(0, 5)} />
              <DetailRow label="Total Amount" value={formatRand(booking.total_amount)} />
              <DetailRow label="Amount Paid" value={formatRand(booking.amount_paid)} />
              <DetailRow label="Balance Due" value={formatRand(booking.balance_due)} />
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">Payment status</p>
                <PaymentStatusBadge status={booking.payment_status} />
              </div>
              <Separator />
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">Current booking status</p>
                <StatusBadge status={booking.status} />
                <StatusSelectForm
                  key={`${booking.id}-${booking.status}`}
                  bookingId={booking.id}
                  status={booking.status}
                />
              </div>
              <Separator />
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">Job status</p>
                <JobStatusBadge status={booking.job_status} />
                <JobStatusSelectForm
                  key={`${booking.id}-${booking.job_status}`}
                  bookingId={booking.id}
                  jobStatus={booking.job_status}
                />
              </div>
            </CardContent>
          </Card>
        </div>
    </AdminPage>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

function formatEarningCalculation(earning: {
  cleaner_percentage: number | null;
  net_booking_value: number;
  cleaner_role: string;
}) {
  if (earning.cleaner_percentage === null) {
    return `${earning.cleaner_role} fixed rate`;
  }

  return `${earning.cleaner_percentage}% of ${formatRand(earning.net_booking_value)}, with R250 minimum and R300 maximum`;
}

function MessageBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-lg border bg-background p-3 text-sm">
      <p className="font-medium">{label}</p>
      <p className="leading-6 text-muted-foreground">{value}</p>
    </div>
  );
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

function RequestSummary({ request }: { request: BookingRequest }) {
  return (
    <div className="grid gap-2 rounded-lg border bg-background p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{request.request_type}</p>
        <RequestStatusBadge status={request.request_status} />
      </div>
      {request.request_type === "Reschedule" ? (
        <p className="text-muted-foreground">
          Requested: {request.requested_date} at {request.requested_time?.slice(0, 5)}
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

function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const variant =
    status === "Approved"
      ? "default"
      : status === "Declined"
        ? "destructive"
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

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
