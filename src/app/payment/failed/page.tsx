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
      <Card className="w-full max-w-2xl rounded-lg text-center">
        <CardContent className="grid gap-6 px-6 py-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-destructive/10 text-destructive">
            <CircleAlert className="size-9" />
          </div>
          <div className="grid gap-3">
            <h1 className="text-3xl font-semibold tracking-normal">
              Payment failed
            </h1>
            <p className="text-muted-foreground">
              We could not confirm this payment. The booking remains pending
              until a successful Paystack transaction is verified.
            </p>
          </div>

          {booking ? <FailedDetails booking={booking} /> : null}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/book" className={buttonVariants()}>
              Start again
            </Link>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
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
    <div className="grid gap-3 rounded-lg border bg-card p-4 text-left">
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
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium">{value}</span>
    </div>
  );
}
