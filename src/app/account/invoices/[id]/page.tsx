import Link from "next/link";
import { notFound } from "next/navigation";

import { initializeInvoicePaymentAction } from "@/app/actions";
import { PrintButton } from "@/components/account/print-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRand } from "@/lib/pricing";
import { requireCustomer } from "@/lib/auth";
import { getCustomerInvoiceById } from "@/lib/supabase/queries";
import type { Invoice, InvoiceStatus } from "@/lib/types";

export default async function AccountInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { customer } = await requireCustomer(`/account/invoices/${id}`);
  const invoice = await getCustomerInvoiceById(customer.id, id);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <p className="font-mono text-sm text-primary">{invoice.invoice_number}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">
            Invoice detail
          </h2>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <Link
            href="/account/invoices"
            className={buttonVariants({ variant: "outline" })}
          >
            Back to invoices
          </Link>
        </div>
      </div>

      <InvoiceLayout invoice={invoice} />
      {invoice.invoice_status !== "Paid" ? (
        <form action={initializeInvoicePaymentAction} className="print:hidden">
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <Button type="submit">Pay invoice</Button>
        </form>
      ) : null}
    </div>
  );
}

function InvoiceLayout({ invoice }: { invoice: Invoice }) {
  const booking = invoice.booking;

  return (
    <Card className="rounded-lg print:border-0 print:shadow-none">
      <CardHeader className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <CardTitle>Shalean Cleaning Services</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Invoice {invoice.invoice_number}
          </p>
        </div>
        <StatusBadge status={invoice.invoice_status} />
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="grid gap-2 text-sm">
            <p className="font-medium">Customer</p>
            <p className="text-muted-foreground">
              {booking?.customer_name ?? invoice.customer?.full_name ?? "Customer"}
            </p>
            <p className="text-muted-foreground">
              {booking?.customer_email ?? invoice.customer?.email ?? ""}
            </p>
          </section>
          <section className="grid gap-2 text-sm md:text-right">
            <p className="font-medium">{booking ? "Booking" : "Invoice"}</p>
            <p className="font-mono text-muted-foreground">
              {booking?.booking_reference ?? invoice.invoice_number}
            </p>
            <p className="text-muted-foreground">
              {booking ? `${booking.booking_date} at ${booking.booking_time.slice(0, 5)}` : ""}
            </p>
          </section>
        </div>
        <Separator />
        {invoice.line_items.length ? (
          <>
            <div className="grid gap-3">
              {invoice.line_items.map((item) => (
                <DetailRow
                  key={item.id}
                  label={`${item.booking_date} - ${item.service_type}`}
                  value={formatRand(item.amount)}
                />
              ))}
            </div>
            <Separator />
          </>
        ) : null}
        <div className="grid gap-3">
          <DetailRow label="Service" value={booking?.service_name ?? "Cleaning service"} />
          <DetailRow
            label="Add-ons"
            value={
              booking?.selected_addons.length
                ? booking.selected_addons.map((addon) => addon.label).join(", ")
                : "None"
            }
          />
          <DetailRow label="Subtotal" value={formatRand(invoice.subtotal)} />
          <DetailRow label="Total" value={formatRand(invoice.total)} />
          <DetailRow label="Amount paid" value={formatRand(invoice.amount_paid)} />
          <DetailRow label="Balance due" value={formatRand(invoice.balance_due)} />
          <DetailRow label="Due date" value={invoice.due_date ?? "Not set"} />
          <DetailRow label="Payment link" value={invoice.payment_link ?? "Not generated"} />
        </div>
      </CardContent>
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

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const variant =
    status === "Cancelled"
      ? "destructive"
      : status === "Paid"
        ? "default"
        : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}
