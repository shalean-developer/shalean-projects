import Link from "next/link";

import { decideBookingRequest } from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getBookingRequests } from "@/lib/supabase/queries";
import type { BookingRequest, RequestStatus } from "@/lib/types";

export default async function AdminRequestsPage() {
  const requests = await getBookingRequests();

  return (
    <AdminPage
      eyebrow="Admin dashboard"
      title="Customer requests"
      description="Approve or decline reschedule and cancellation requests."
    >
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>All requests</CardTitle>
              <Badge variant="secondary">{requests.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {requests.length ? (
              requests.map((request) => (
                <RequestAdminCard key={request.id} request={request} />
              ))
            ) : (
              <div className="grid min-h-52 place-items-center rounded-lg border border-dashed text-center">
                <div className="grid gap-2">
                  <p className="font-medium">No customer requests yet</p>
                  <p className="text-sm text-muted-foreground">
                    Reschedule and cancellation requests will appear here.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </AdminPage>
  );
}

function RequestAdminCard({ request }: { request: BookingRequest }) {
  const booking = request.booking;

  return (
    <div className="grid gap-4 rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{request.request_type}</p>
            <RequestStatusBadge status={request.request_status} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {booking?.booking_reference ?? request.booking_id}
          </p>
          <p className="text-sm text-muted-foreground">
            {booking?.service_name ?? "Unknown service"} for{" "}
            {request.customer?.full_name ?? booking?.customer_name ?? "Customer"}
          </p>
        </div>
        {booking ? (
          <Link
            href={`/admin/bookings/${booking.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            View booking
          </Link>
        ) : null}
      </div>

      <div className="grid gap-2 text-sm">
        <DetailRow label="Current booking" value={booking ? formatBookingDateTime(booking.booking_date, booking.booking_time) : "Unknown"} />
        {request.request_type === "Reschedule" ? (
          <DetailRow
            label="Requested"
            value={`${request.requested_date ?? ""} at ${request.requested_time?.slice(0, 5) ?? ""}`}
          />
        ) : null}
        <DetailRow label="Reason" value={request.reason} />
        {request.admin_notes ? (
          <DetailRow label="Admin notes" value={request.admin_notes} />
        ) : null}
      </div>

      {request.request_status === "Pending" ? (
        <form action={decideBookingRequest} className="grid gap-3">
          <input type="hidden" name="request_id" value={request.id} />
          <Textarea
            name="admin_notes"
            className="min-h-20"
            placeholder="Admin notes"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="submit" name="decision" value="Declined" variant="outline">
              Decline request
            </Button>
            <Button type="submit" name="decision" value="Approved">
              Approve request
            </Button>
          </div>
        </form>
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

  return <Badge variant={variant}>{status}</Badge>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right font-medium">{value}</span>
    </div>
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
