import { AdminPage } from "@/components/admin/admin-page";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusBadge } from "@/components/platform/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRand } from "@/lib/pricing";
import { getBookings } from "@/lib/supabase/queries";
import { paymentStatuses } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const bookings = await getBookings();
  const payments = sortPayments(
    bookings
      .flatMap((booking) =>
        booking.payments.map((payment) => ({ booking, payment }))
      )
      .filter(({ booking, payment }) => {
        const query = params.q?.trim().toLowerCase();
        const matchesStatus =
          !params.status || payment.payment_status === params.status;
        const matchesQuery =
          !query ||
          [
            booking.booking_reference,
            booking.customer_name,
            booking.customer_email,
            payment.payment_reference,
            payment.paystack_reference ?? "",
            payment.payment_type,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

        return matchesStatus && matchesQuery;
      }),
    params.sort
  );

  return (
    <AdminPage
      title="Payments"
      description="Paystack payment records and outstanding balances."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Paid"
          value={formatRand(
            bookings.reduce((sum, booking) => sum + booking.amount_paid, 0)
          )}
        />
        <MetricCard
          title="Outstanding"
          value={formatRand(
            bookings.reduce((sum, booking) => sum + booking.balance_due, 0)
          )}
        />
        <MetricCard title="Transactions" value={String(payments.length)} />
      </div>

      <form
        action="/admin/payments"
        className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_180px_180px_auto]"
      >
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search payments"
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {paymentStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "created_desc"}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="created_desc">Newest first</option>
          <option value="amount_desc">Highest paid</option>
          <option value="customer_asc">Customer A-Z</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <Card className="rounded-lg">
        <CardContent>
          {payments.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Paystack</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(({ booking, payment }) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {booking.booking_reference}
                      </TableCell>
                      <TableCell>{booking.customer_name}</TableCell>
                      <TableCell>{payment.payment_type}</TableCell>
                      <TableCell>
                        <StatusBadge status={payment.payment_status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRand(payment.amount_paid)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.paystack_reference ?? "None"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              No payment records match these filters.
            </p>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}

function sortPayments<
  T extends {
    booking: { customer_name: string };
    payment: { amount_paid: number; created_at: string };
  },
>(payments: T[], sort = "created_desc") {
  return [...payments].sort((a, b) => {
    if (sort === "amount_desc") {
      return b.payment.amount_paid - a.payment.amount_paid;
    }

    if (sort === "customer_asc") {
      return a.booking.customer_name.localeCompare(b.booking.customer_name);
    }

    return (
      new Date(b.payment.created_at).getTime() -
      new Date(a.payment.created_at).getTime()
    );
  });
}
