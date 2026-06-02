import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRand } from "@/lib/pricing";
import { hasSupabaseConfig } from "@/lib/supabase/admin";
import { getBookingByReference } from "@/lib/supabase/queries";
import type { BookingWithService } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const reference = (await searchParams).reference;
  const booking =
    reference && hasSupabaseConfig()
      ? await getBookingByReference(reference)
      : null;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <Card className="w-full max-w-2xl rounded-lg text-center">
        <CardContent className="grid gap-6 px-6 py-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-9" />
          </div>
          <div className="grid gap-3">
            <h1 className="text-3xl font-semibold tracking-normal">
              Booking received
            </h1>
            <p className="text-muted-foreground">
              Thanks for booking with Shalean Cleaning Services. Your request is
              pending payment until Paystack verifies the transaction.
            </p>
          </div>

          {booking ? <SuccessDetails booking={booking} /> : null}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/book" className={buttonVariants()}>
              Create another booking
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

function SuccessDetails({ booking }: { booking: BookingWithService }) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 text-left">
      <DetailRow label="Booking Reference" value={booking.booking_reference} />
      <DetailRow label="Service Name" value={booking.service_name} />
      <DetailRow label="Booking Date" value={booking.booking_date} />
      <DetailRow label="Booking Time" value={booking.booking_time.slice(0, 5)} />
      <DetailRow
        label="Selected Add-ons"
        value={
          booking.selected_addons.length
            ? booking.selected_addons.map((addon) => addon.label).join(", ")
            : "None"
        }
      />
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
            ? "Your booking is confirmed."
            : "Complete payment to confirm this booking."
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
