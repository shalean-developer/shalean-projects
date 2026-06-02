import Link from "next/link";
import { notFound } from "next/navigation";

import {
  sendInvoiceAction,
  updateInvoiceStatusAction,
} from "@/app/actions";
import { PrintButton } from "@/components/account/print-button";
import { AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRand } from "@/lib/pricing";
import { getInvoiceById } from "@/lib/supabase/queries";
import { invoiceStatuses, type Invoice, type InvoiceStatus } from "@/lib/types";

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return (
    <AdminPage
      eyebrow={invoice.invoice_number}
      title="Invoice detail"
      description={invoice.booking?.booking_reference ?? invoice.booking_id}
      actions={
        <>
          <PrintButton />
          <Link href="/admin/invoices" className={buttonVariants({ variant: "outline" })}>
            Back to invoices
          </Link>
        </>
      }
    >
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <InvoiceLayout invoice={invoice} />
          <Card className="h-fit rounded-lg border-primary/20 bg-primary/5 print:hidden">
            <CardHeader>
              <CardTitle>Manage invoice</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">Current status</p>
                <StatusBadge status={invoice.invoice_status} />
              </div>
              <form action={updateInvoiceStatusAction} className="grid gap-2">
                <input type="hidden" name="invoice_id" value={invoice.id} />
                <select
                  name="invoice_status"
                  defaultValue={invoice.invoice_status}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {invoiceStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline">
                  Update status
                </Button>
              </form>
              <Separator />
              <form action={sendInvoiceAction}>
                <input type="hidden" name="invoice_id" value={invoice.id} />
                <Button type="submit" className="w-full">
                  Mark as sent and email
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
    </AdminPage>
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
            <p className="font-medium">Booking</p>
            <p className="font-mono text-muted-foreground">
              {booking?.booking_reference ?? invoice.booking_id}
            </p>
            <p className="text-muted-foreground">
              {booking ? `${booking.booking_date} at ${booking.booking_time.slice(0, 5)}` : ""}
            </p>
          </section>
        </div>
        <Separator />
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
          <DetailRow label="Issued at" value={invoice.issued_at ? formatTimestamp(invoice.issued_at) : "Not issued"} />
          <DetailRow label="Paid at" value={invoice.paid_at ? formatTimestamp(invoice.paid_at) : "Not paid"} />
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

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
