import { NextRequest, NextResponse } from "next/server";

import { verifyPaystackWebhookSignature } from "@/lib/paystack";
import { verifyAndFinalizeInvoicePayment } from "@/lib/invoices";
import {
  markPaystackReferenceFailed,
  verifyAndFinalizePayment,
} from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid Paystack webhook signature." },
      { status: 401 }
    );
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid Paystack webhook payload." },
      { status: 400 }
    );
  }
  const reference = event.data?.reference;

  if (!reference) {
    return NextResponse.json({ received: true });
  }

  if (event.event === "charge.success") {
    const payment = await verifyAndFinalizePayment(reference);

    if (!payment.ok) {
      await verifyAndFinalizeInvoicePayment(reference);
    }
  }

  if (event.event === "charge.failed") {
    await markPaystackReferenceFailed(reference);
  }

  return NextResponse.json({ received: true });
}
