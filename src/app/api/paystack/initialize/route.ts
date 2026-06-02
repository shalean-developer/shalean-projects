import { NextRequest, NextResponse } from "next/server";

import { initializeBookingPayment } from "@/lib/payments";
import { getBookingById } from "@/lib/supabase/queries";
import { paymentTypes, type PaymentType } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bookingId = getString(body.bookingId);
    const paymentType = getPaymentType(body.paymentType);

    if (!bookingId || !paymentType) {
      return NextResponse.json(
        { error: "bookingId and paymentType are required." },
        { status: 400 }
      );
    }

    const booking = await getBookingById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking was not found." },
        { status: 404 }
      );
    }

    const payment = await initializeBookingPayment(booking, paymentType);

    return NextResponse.json({
      authorizationUrl: payment.authorizationUrl,
      accessCode: payment.accessCode,
      paymentReference: payment.paymentReference,
      paystackReference: payment.paystackReference,
      amountDue: payment.amountDue,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to initialize payment.",
      },
      { status: 500 }
    );
  }
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getPaymentType(value: unknown): PaymentType | null {
  return paymentTypes.includes(value as PaymentType)
    ? (value as PaymentType)
    : null;
}
