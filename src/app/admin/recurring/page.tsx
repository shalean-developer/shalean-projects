import Link from "next/link";
import { CalendarDays, Play, Pause, XCircle } from "lucide-react";

import { updateAdminRecurringStatus } from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
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
import { formatRand } from "@/lib/pricing";
import { getV15SchemaStatus } from "@/lib/supabase/schema";
import { getRecurringBookings } from "@/lib/supabase/queries";
import type { RecurringBooking, RecurringBookingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminRecurringPage() {
  const schema = await getV15SchemaStatus();

  if (!schema.ready) {
    return <SetupNotice message={schema.message} />;
  }

  const plans = await getRecurringBookings();

  return (
    <AdminPage
      eyebrow="Admin dashboard"
      title="Recurring plans"
      description="View and manage weekly, bi-weekly, and monthly customer plans."
    >
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>All recurring plans</CardTitle>
              <Badge variant="secondary">{plans.length} plans</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {plans.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Preferred slot</TableHead>
                      <TableHead>Next booking</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Estimate</TableHead>
                      <TableHead>Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <PlanRow key={plan.id} plan={plan} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid min-h-44 place-items-center rounded-lg border border-dashed text-center">
                <div>
                  <p className="font-medium">No recurring plans yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Customer recurring plans will appear here.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </AdminPage>
  );
}

function PlanRow({ plan }: { plan: RecurringBooking }) {
  return (
    <TableRow>
      <TableCell>
        <div className="grid gap-1">
          <span className="font-medium">{plan.customer?.full_name ?? "Customer"}</span>
          <span className="text-xs text-muted-foreground">
            {plan.customer?.email ?? "No email"}
          </span>
        </div>
      </TableCell>
      <TableCell>{plan.service_name}</TableCell>
      <TableCell>{plan.frequency}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <span>
            {plan.preferred_day} at {plan.preferred_time.slice(0, 5)}
          </span>
        </div>
      </TableCell>
      <TableCell>{plan.next_booking_date}</TableCell>
      <TableCell>
        <StatusBadge status={plan.status} />
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatRand(plan.estimated_price)}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <StatusButton planId={plan.id} status="Active" disabled={plan.status === "Active"} />
          <StatusButton planId={plan.id} status="Paused" disabled={plan.status === "Paused"} />
          <StatusButton
            planId={plan.id}
            status="Cancelled"
            disabled={plan.status === "Cancelled"}
            destructive
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function StatusButton({
  planId,
  status,
  disabled,
  destructive = false,
}: {
  planId: string;
  status: RecurringBookingStatus;
  disabled: boolean;
  destructive?: boolean;
}) {
  const Icon = status === "Active" ? Play : status === "Paused" ? Pause : XCircle;

  return (
    <form action={updateAdminRecurringStatus}>
      <input type="hidden" name="recurring_booking_id" value={planId} />
      <input type="hidden" name="status" value={status} />
      <Button
        type="submit"
        size="sm"
        variant={destructive ? "destructive" : "outline"}
        disabled={disabled}
      >
        <Icon className="size-3.5" />
        {status}
      </Button>
    </form>
  );
}

function StatusBadge({ status }: { status: RecurringBookingStatus }) {
  return (
    <Badge variant={status === "Cancelled" ? "destructive" : "secondary"}>
      {status}
    </Badge>
  );
}

function SetupNotice({ message }: { message?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <Card className="w-full max-w-xl rounded-lg">
        <CardHeader>
          <CardTitle>Supabase V1.5 migration is required</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
          <p>{message}</p>
          <Link href="/admin/bookings" className={buttonVariants({ className: "w-fit" })}>
            Back to bookings
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
