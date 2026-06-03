import Link from "next/link";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRand } from "@/lib/pricing";
import { requireCustomer } from "@/lib/auth";
import { getV15SchemaStatus } from "@/lib/supabase/schema";
import { getCustomerInvoices } from "@/lib/supabase/queries";
import type { Invoice, InvoiceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountInvoicesPage() {
  const { customer } = await requireCustomer("/account/invoices");
  const schema = await getV15SchemaStatus();

  if (!schema.ready) {
    return <SetupNotice message={schema.message} />;
  }

  const invoices = await getCustomerInvoices(customer.id);
  const outstanding = invoices.filter((invoice) => invoice.invoice_status !== "Paid");
  const paid = invoices.filter((invoice) => invoice.invoice_status === "Paid");

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Invoices</h2>
        <p className="mt-2 text-muted-foreground">
          View invoice records for paid and completed bookings.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Outstanding invoices</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {outstanding.length ? (
            outstanding.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />)
          ) : (
            <div className="grid min-h-36 place-items-center rounded-lg border border-dashed p-5 text-center">
              <div>
                <FileText className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 font-medium">No invoices yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Outstanding invoices appear here when payment is due.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Paid invoices</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {paid.length ? (
            paid.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />)
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              Paid invoices will appear here after Paystack confirms payment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  return (
    <Link
      href={`/account/invoices/${invoice.id}`}
      className="grid gap-3 rounded-lg border bg-background p-4 hover:bg-muted/50 sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="grid gap-1">
        <p className="font-mono text-sm">{invoice.invoice_number}</p>
        <p className="font-medium">
          {invoice.booking?.service_name ?? "Shalean booking"}
        </p>
        <p className="text-sm text-muted-foreground">
          {invoice.booking?.booking_reference ?? invoice.booking_id}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={invoice.invoice_status} />
        <span className="font-medium">{formatRand(invoice.total)}</span>
        {invoice.payment_link && invoice.invoice_status !== "Paid" ? (
          <span className="text-sm font-medium text-primary">Pay</span>
        ) : null}
      </div>
    </Link>
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
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Supabase V1.5 migration is required</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}
