import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRand } from "@/lib/pricing";
import { markPaystackReferenceFailed } from "@/lib/payments";
import { getBookingByReference } from "@/lib/supabase/queries";
import type { BookingWithService } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{
    reference?: string;
    trxref?: string;
    bookingReference?: string;
  }>;
}) {
  const params = await searchParams;
  const reference = params.reference ?? params.trxref ?? null;
  const booking = reference
    ? await markFailed(reference)
    : params.bookingReference
      ? await getBookingByReference(params.bookingReference)
      : null;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <Card className="w-full max-w-2xl rounded-lg border border-border/80 bg-card text-center shadow-sm">
        <CardContent className="grid gap-7 px-6 py-10 sm:px-10 sm:py-12">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-destructive/10 text-destructive ring-8 ring-destructive/5">
            <CircleAlert className="size-10" />
          </div>
          <div className="grid gap-3">
            <h1 className="text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              Payment failed
            </h1>
            <p className="mx-auto max-w-xl leading-7 text-muted-foreground">
              We could not confirm this payment. The booking remains pending
              until a successful Paystack transaction is verified.
            </p>
          </div>

          {booking ? <FailedDetails booking={booking} /> : null}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/book" className={buttonVariants({ className: "h-11 px-4" })}>
              Start again
            </Link>
            <Link
              href="/"
              className={buttonVariants({
                variant: "outline",
                className:
                  "h-11 border-border/80 bg-card px-4 shadow-sm hover:border-primary/30 hover:bg-primary/5",
              })}
            >
              Back home
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

async function markFailed(reference: string) {
  try {
    return await markPaystackReferenceFailed(reference);
  } catch {
    return null;
  }
}

function FailedDetails({ booking }: { booking: BookingWithService }) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/80 bg-background/60 p-5 text-left shadow-sm">
      <DetailRow label="Booking Reference" value={booking.booking_reference} />
      <DetailRow label="Payment Status" value={booking.payment_status} />
      <DetailRow label="Payment Type" value={booking.payment_type ?? "Not selected"} />
      <DetailRow label="Total Amount" value={formatRand(booking.total_amount)} />
      <DetailRow label="Amount Paid" value={formatRand(booking.amount_paid)} />
      <DetailRow label="Balance Due" value={formatRand(booking.balance_due)} />
      <DetailRow label="Booking Status" value={booking.status} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium leading-6 sm:text-right">{value}</span>
    </div>
  );
}
