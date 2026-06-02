import { createHmac, timingSafeEqual } from "crypto";

import type { BookingWithService, PaymentType } from "@/lib/types";

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const DEFAULT_CURRENCY = "ZAR";

export type PaymentAmountBreakdown = {
  totalAmount: number;
  amountDue: number;
  balanceDueAfterPayment: number;
};

type InitializePaystackPayload = {
  booking: Pick<
    BookingWithService,
    | "id"
    | "booking_reference"
    | "customer_email"
    | "customer_name"
    | "service_name"
  >;
  paymentReference: string;
  paymentType: PaymentType;
  amountDue: number;
};

export type PaystackInitializeResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type PaystackVerificationResponse = {
  status: "success" | "failed" | "abandoned" | string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  channel: string | null;
  gateway_response: string | null;
};

export function hasPaystackConfig() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function getPaystackPublicKey() {
  return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
}

export function calculatePaymentAmount(
  totalAmount: number,
  paymentType: PaymentType
): PaymentAmountBreakdown {
  const normalizedTotal = roundMoney(totalAmount);
  const amountDue =
    paymentType === "Deposit"
      ? roundMoney(normalizedTotal * 0.5)
      : normalizedTotal;

  return {
    totalAmount: normalizedTotal,
    amountDue,
    balanceDueAfterPayment: roundMoney(normalizedTotal - amountDue),
  };
}

export function createPaymentReference(bookingReference: string) {
  const randomSegment = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY-${bookingReference}-${randomSegment}`;
}

export async function initializePaystackTransaction({
  booking,
  paymentReference,
  paymentType,
  amountDue,
}: InitializePaystackPayload): Promise<PaystackInitializeResponse> {
  const siteUrl = getSiteUrl();
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: getPaystackHeaders(),
    body: JSON.stringify({
      email: booking.customer_email,
      amount: toPaystackSubunit(amountDue),
      currency: DEFAULT_CURRENCY,
      reference: paymentReference,
      callback_url: `${siteUrl}/payment/success?bookingReference=${encodeURIComponent(
        booking.booking_reference
      )}`,
      metadata: {
        booking_id: booking.id,
        booking_reference: booking.booking_reference,
        customer_name: booking.customer_name,
        service_name: booking.service_name,
        payment_type: paymentType,
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok || !payload.status) {
    throw new Error(
      payload.message ?? "Paystack could not initialize this payment."
    );
  }

  return payload.data as PaystackInitializeResponse;
}

export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerificationResponse> {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: getPaystackHeaders(),
    }
  );
  const payload = await response.json();

  if (!response.ok || !payload.status) {
    throw new Error(payload.message ?? "Unable to verify Paystack payment.");
  }

  return payload.data as PaystackVerificationResponse;
}

export function verifyPaystackWebhookSignature(
  rawBody: string,
  signature: string | null
) {
  const webhookSecret =
    process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY;

  if (!webhookSecret || !signature) {
    return false;
  }

  const expected = createHmac("sha512", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

export function fromPaystackSubunit(amount: number) {
  return roundMoney(amount / 100);
}

function toPaystackSubunit(amount: number) {
  return Math.round(roundMoney(amount) * 100);
}

function getPaystackHeaders() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing PAYSTACK_SECRET_KEY environment variable.");
  }

  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
