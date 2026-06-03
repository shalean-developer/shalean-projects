import Link from "next/link";
import { Eye, FileText } from "lucide-react";

import { generateMonthlyInvoiceAction } from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
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
import { formatRand } from "@/lib/pricing";
import { getV15SchemaStatus } from "@/lib/supabase/schema";
import { getCustomers, getInvoices } from "@/lib/supabase/queries";
import { invoiceStatuses, type Invoice, type InvoiceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const schema = await getV15SchemaStatus();

  if (!schema.ready) {
    return <SetupNotice message={schema.message} />;
  }

  const params = await searchParams;
  const [invoices, customers] = await Promise.all([getInvoices(), getCustomers()]);
  const filtered = params.status
    ? invoices.filter((invoice) => invoice.invoice_status === params.status)
    : invoices;

  return (
    <AdminPage
      eyebrow="Admin dashboard"
      title="Invoices"
      description="View invoices, filter by status, and manage payment state."
    >
        <Card className="mb-5 rounded-lg">
          <CardHeader>
            <CardTitle>Monthly invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={generateMonthlyInvoiceAction}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_160px_160px_auto_auto]"
            >
              <select name="customer_id" required className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Choose customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </select>
              <input
                name="month"
                type="month"
                required
                defaultValue={new Date().toISOString().slice(0, 7)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <input
                name="due_date"
                type="date"
                required
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <label className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
                <input name="send_invoice" type="checkbox" className="size-4" />
                Email
              </label>
              <button className={buttonVariants()} type="submit">
                Generate
              </button>
            </form>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>All invoices</CardTitle>
                <Badge variant="secondary">{filtered.length} shown</Badge>
              </div>
              <form action="/admin/invoices" className="flex gap-2">
                <select
                  name="status"
                  defaultValue={params.status ?? ""}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">All statuses</option>
                  {invoiceStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button className={buttonVariants({ variant: "outline" })} type="submit">
                  Filter
                </button>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((invoice) => (
                      <InvoiceRow key={invoice.id} invoice={invoice} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid min-h-44 place-items-center rounded-lg border border-dashed text-center">
                <div>
                  <FileText className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-3 font-medium">No invoices match this filter</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Invoice records appear after payments or completed bookings.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </AdminPage>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{invoice.invoice_number}</TableCell>
      <TableCell>
        <div className="grid gap-1">
          <span>{invoice.booking?.service_name ?? "Booking"}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {invoice.booking?.booking_reference ?? invoice.booking_id}
          </span>
        </div>
      </TableCell>
      <TableCell>{invoice.customer?.full_name ?? invoice.booking?.customer_name ?? "Customer"}</TableCell>
      <TableCell>
        <StatusBadge status={invoice.invoice_status} />
      </TableCell>
      <TableCell className="text-right font-medium">{formatRand(invoice.total)}</TableCell>
      <TableCell className="text-right">{formatRand(invoice.amount_paid)}</TableCell>
      <TableCell className="text-right">{formatRand(invoice.balance_due)}</TableCell>
      <TableCell className="text-right">
        <Link
          href={`/admin/invoices/${invoice.id}`}
          className={buttonVariants({ variant: "outline", size: "icon" })}
          aria-label={`View invoice ${invoice.invoice_number}`}
        >
          <Eye className="size-4" />
        </Link>
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const variant =
    status === "Cancelled"
      ? "destructive"
      : status === "Paid"
        ? "default"
        : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
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
