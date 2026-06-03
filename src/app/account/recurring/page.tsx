import Link from "next/link";
import { CalendarDays, Repeat, Settings } from "lucide-react";

import { RecurringPlanForm } from "@/components/account/recurring-plan-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCustomer } from "@/lib/auth";
import { formatRand } from "@/lib/pricing";
import { getV15SchemaStatus } from "@/lib/supabase/schema";
import {
  getCustomerAddresses,
  getCustomerRecurringBookings,
  getServiceConfigs,
} from "@/lib/supabase/queries";
import type { RecurringBooking, RecurringBookingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountRecurringPage() {
  const { customer } = await requireCustomer("/account/recurring");
  const schema = await getV15SchemaStatus();

  if (!schema.ready) {
    return <SetupNotice message={schema.message} />;
  }

  const [plans, addresses, services] = await Promise.all([
    getCustomerRecurringBookings(customer.id),
    getCustomerAddresses(customer.id),
    getServiceConfigs(),
  ]);
  const activePlans = plans.filter((plan) => plan.status === "Active");

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-normal">
            Recurring cleaning
          </h2>
          <p className="mt-2 text-muted-foreground">
            Create and manage weekly, bi-weekly, or monthly cleaning plans.
          </p>
        </div>
        <Badge variant="secondary">{activePlans.length} active</Badge>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Your recurring plans</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {plans.length ? (
            plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)
          ) : (
            <div className="grid min-h-36 place-items-center rounded-lg border border-dashed p-5 text-center">
              <div>
                <Repeat className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 font-medium">No recurring plans yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Build a plan below and Shalean will generate future bookings
                  from it.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="text-2xl font-semibold tracking-normal">
          Create recurring plan
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a service, repeat schedule, address, then pay securely before the plan is activated.
        </p>
      </div>
      <RecurringPlanForm services={services} savedAddresses={addresses} />
    </div>
  );
}

function PlanCard({ plan }: { plan: RecurringBooking }) {
  return (
    <Link
      href={`/account/recurring/${plan.id}`}
      className="grid gap-3 rounded-lg border bg-background p-4 hover:bg-muted/50 sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{plan.service_name}</p>
          <StatusBadge status={plan.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          <CalendarDays className="mr-1 inline size-4" />
          {plan.frequency} on {plan.preferred_day} at{" "}
          {plan.preferred_time.slice(0, 5)}
        </p>
        <p className="text-sm text-muted-foreground">
          Next booking: {formatDate(plan.next_booking_date)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-medium">{formatRand(plan.estimated_price)}</span>
        <Settings className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: RecurringBookingStatus }) {
  const variant = status === "Cancelled" ? "destructive" : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function SetupNotice({ message }: { message?: string }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Supabase V1.5 migration is required</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
        <p>{message}</p>
        <Link href="/account" className={buttonVariants({ className: "w-fit" })}>
          Back to account
        </Link>
      </CardContent>
    </Card>
  );
}
