import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRand } from "@/lib/pricing";
import { getBookingByReference } from "@/lib/supabase/queries";
import { verifyAndFinalizePayment } from "@/lib/payments";
import type { BookingWithService } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
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
  const result = reference
    ? await verifyPayment(reference)
    : {
        ok: false,
        message: "No Paystack reference was provided.",
        booking: params.bookingReference
          ? await getBookingByReference(params.bookingReference)
          : null,
      };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <Card className="w-full max-w-2xl rounded-lg text-center">
        <CardContent className="grid gap-6 px-6 py-10">
          <div
            className={
              result.ok
                ? "mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary"
                : "mx-auto grid size-16 place-items-center rounded-full bg-destructive/10 text-destructive"
            }
          >
            {result.ok ? (
              <CheckCircle2 className="size-9" />
            ) : (
              <CircleAlert className="size-9" />
            )}
          </div>
          <div className="grid gap-3">
            <h1 className="text-3xl font-semibold tracking-normal">
              {result.ok ? "Booking confirmed" : "Payment not confirmed"}
            </h1>
            <p className="text-muted-foreground">{result.message}</p>
          </div>

          {result.booking ? <PaymentDetails booking={result.booking} /> : null}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/book" className={buttonVariants()}>
              Create another booking
            </Link>
            <Link
              href="/admin/bookings"
              className={buttonVariants({ variant: "outline" })}
            >
              View admin dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

async function verifyPayment(reference: string) {
  try {
    return await verifyAndFinalizePayment(reference);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to verify this payment.",
      booking: null,
    };
  }
}

function PaymentDetails({ booking }: { booking: BookingWithService }) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 text-left">
      <DetailRow label="Booking Reference" value={booking.booking_reference} />
      <DetailRow label="Payment Status" value={booking.payment_status} />
      <DetailRow label="Payment Type" value={booking.payment_type ?? "Not selected"} />
      <DetailRow label="Total Amount" value={formatRand(booking.total_amount)} />
      <DetailRow label="Amount Paid" value={formatRand(booking.amount_paid)} />
      <DetailRow label="Balance Due" value={formatRand(booking.balance_due)} />
      <DetailRow label="Booking Status" value={booking.status} />
      <DetailRow
        label="Confirmation"
        value={
          booking.status === "Confirmed"
            ? "A confirmation email has been prepared for the customer."
            : "Payment is still pending verification."
        }
      />
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
