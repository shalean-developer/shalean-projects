import Link from "next/link";
import { notFound } from "next/navigation";

import { initializeInvoicePaymentAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRand } from "@/lib/pricing";
import { isSupabaseSchemaMissingError } from "@/lib/supabase/errors";
import { getInvoiceById } from "@/lib/supabase/queries";
import type { InvoiceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublicInvoicePaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceOrSetupNotice(id);

  if (invoice === "schema-missing") {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5">
        <Card className="w-full max-w-xl rounded-lg">
          <CardHeader>
            <CardTitle>Invoice payments are being prepared</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            The latest Supabase invoice/payment migration still needs to be applied.
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!invoice) {
    notFound();
  }

  const customerName =
    invoice.booking?.customer_name ?? invoice.customer?.full_name ?? "Customer";

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <section className="mx-auto grid w-full max-w-4xl gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-sm text-primary">{invoice.invoice_number}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Shalean invoice payment
            </h1>
            <p className="mt-2 text-muted-foreground">{customerName}</p>
          </div>
          <StatusBadge status={invoice.invoice_status} />
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Booking details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {invoice.line_items.length ? (
              invoice.line_items.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 rounded-lg border bg-background p-4 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-medium">{item.service_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.booking_date}
                      {item.booking
                        ? ` - ${item.booking.address}, ${item.booking.suburb}`
                        : ""}
                    </p>
                  </div>
                  <p className="font-semibold">{formatRand(item.amount)}</p>
                </div>
              ))
            ) : invoice.booking ? (
              <div className="grid gap-2 rounded-lg border bg-background p-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-medium">{invoice.booking.service_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.booking.booking_date} - {invoice.booking.address},{" "}
                    {invoice.booking.suburb}
                  </p>
                </div>
                <p className="font-semibold">{formatRand(invoice.total)}</p>
              </div>
            ) : null}
            <Separator />
            <Detail label="Customer" value={customerName} />
            <Detail label="Due date" value={invoice.due_date ?? "Not set"} />
            <Detail label="Total amount due" value={formatRand(invoice.balance_due)} />
            <Detail label="Payment status" value={invoice.invoice_status} />
          </CardContent>
        </Card>

        <Card className="rounded-lg border-primary/20 bg-primary/5">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total due</p>
              <p className="text-3xl font-semibold tracking-normal">
                {formatRand(invoice.balance_due)}
              </p>
            </div>
            {invoice.invoice_status === "Paid" ? (
              <Link href="/login?redirect=/account/invoices" className={buttonVariants()}>
                View dashboard
              </Link>
            ) : (
              <form action={initializeInvoicePaymentAction}>
                <input type="hidden" name="invoice_id" value={invoice.id} />
                <Button type="submit" size="lg">
                  Pay now
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardContent className="grid gap-3 p-5 text-sm text-muted-foreground">
            <p>
              You can view and pay this invoice without logging in. After reviewing
              it, create an account or log in to keep this invoice in your customer
              dashboard with your booking history.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/signup?redirect=/account/invoices/${invoice.id}`} className={buttonVariants({ variant: "outline" })}>
                Create account
              </Link>
              <Link href={`/login?redirect=/account/invoices/${invoice.id}`} className={buttonVariants({ variant: "ghost" })}>
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

async function getInvoiceOrSetupNotice(invoiceId: string) {
  try {
    return await getInvoiceById(invoiceId);
  } catch (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return "schema-missing" as const;
    }

    throw error;
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[62%] text-right font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant={status === "Paid" ? "default" : "secondary"} className="w-fit">
      {status}
    </Badge>
  );
}
