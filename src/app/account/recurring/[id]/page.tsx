import Link from "next/link";
import { notFound } from "next/navigation";

import {
  requestRecurringPlanChange,
  updateCustomerRecurringStatus,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { requireCustomer } from "@/lib/auth";
import { formatRand } from "@/lib/pricing";
import {
  getCustomerRecurringBookingById,
  getRecurringPlanChangeRequests,
} from "@/lib/supabase/queries";
import type { RecurringBookingStatus, RequestStatus } from "@/lib/types";

export default async function AccountRecurringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { customer } = await requireCustomer(`/account/recurring/${id}`);
  const plan = await getCustomerRecurringBookingById(customer.id, id);

  if (!plan) {
    notFound();
  }

  const changeRequests = await getRecurringPlanChangeRequests(plan.id);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Recurring plan</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">
            {plan.service_name}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {plan.frequency} on {plan.preferred_day} at{" "}
            {plan.preferred_time.slice(0, 5)}
          </p>
        </div>
        <Link
          href="/account/recurring"
          className={buttonVariants({ variant: "outline" })}
        >
          Back to plans
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-5">
          <DetailCard title="Plan details">
            <DetailRow label="Service" value={plan.service_name} />
            <DetailRow label="Frequency" value={plan.frequency} />
            <DetailRow label="Preferred day" value={plan.preferred_day} />
            <DetailRow label="Preferred time" value={plan.preferred_time.slice(0, 5)} />
            <DetailRow label="Next booking date" value={plan.next_booking_date} />
            <DetailRow label="Estimated price" value={formatRand(plan.estimated_price)} />
          </DetailCard>

          <DetailCard title="Service data">
            {plan.service_data.questions.map((question) => (
              <DetailRow
                key={question.id}
                label={question.label}
                value={String(question.value)}
              />
            ))}
          </DetailCard>

          <DetailCard title="Add-ons">
            {plan.selected_addons.length ? (
              plan.selected_addons.map((addon) => (
                <DetailRow key={addon.id} label={addon.label} value={formatRand(addon.price)} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No add-ons selected.</p>
            )}
          </DetailCard>

          <DetailCard title="Address">
            {plan.address ? (
              <>
                <DetailRow label="Label" value={plan.address.label} />
                <DetailRow label="Street address" value={plan.address.address} />
                <DetailRow label="Suburb" value={plan.address.suburb} />
                <DetailRow label="City" value={plan.address.city} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Address details are no longer available.
              </p>
            )}
          </DetailCard>

          <DetailCard title="Request changes">
            <form action={requestRecurringPlanChange} className="grid gap-3">
              <input type="hidden" name="recurring_booking_id" value={plan.id} />
              <Textarea
                name="requested_changes"
                className="min-h-28"
                placeholder="Tell us what you would like to change."
                required
              />
              <Button type="submit" className="w-fit">
                Send request
              </Button>
            </form>
            <Separator />
            {changeRequests.length ? (
              <div className="grid gap-3">
                {changeRequests.map((request) => (
                  <div key={request.id} className="grid gap-2 rounded-lg border bg-background p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">Change request</p>
                      <RequestBadge status={request.request_status} />
                    </div>
                    <p className="text-muted-foreground">{request.requested_changes}</p>
                    {request.admin_notes ? (
                      <p className="rounded-lg bg-muted p-3 text-muted-foreground">
                        {request.admin_notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No change requests for this plan yet.
              </p>
            )}
          </DetailCard>
        </div>

        <Card className="h-fit rounded-lg border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Manage plan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={plan.status} />
            </div>
            <Separator />
            <StatusForm planId={plan.id} status="Paused" disabled={plan.status !== "Active"} />
            <StatusForm
              planId={plan.id}
              status="Cancelled"
              disabled={plan.status === "Cancelled"}
              destructive
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusForm({
  planId,
  status,
  disabled,
  destructive = false,
}: {
  planId: string;
  status: "Paused" | "Cancelled";
  disabled: boolean;
  destructive?: boolean;
}) {
  return (
    <form action={updateCustomerRecurringStatus}>
      <input type="hidden" name="recurring_booking_id" value={planId} />
      <input type="hidden" name="status" value={status} />
      <Button
        type="submit"
        variant={destructive ? "destructive" : "outline"}
        className="w-full"
        disabled={disabled}
      >
        {status === "Paused" ? "Pause plan" : "Cancel plan"}
      </Button>
    </form>
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

function StatusBadge({ status }: { status: RecurringBookingStatus }) {
  return (
    <Badge variant={status === "Cancelled" ? "destructive" : "secondary"}>
      {status}
    </Badge>
  );
}

function RequestBadge({ status }: { status: RequestStatus }) {
  const variant =
    status === "Approved"
      ? "default"
      : status === "Declined"
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}
