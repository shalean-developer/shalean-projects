import { revalidatePath } from "next/cache";

import {
  calculatePaymentAmount,
  createPaymentReference,
  fromPaystackSubunit,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import {
  sendBookingConfirmationEmail,
  sendPaymentReceiptEmail,
} from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { toSupabaseError } from "@/lib/supabase/errors";
import { getBookingById } from "@/lib/supabase/queries";
import type {
  BookingWithService,
  Payment,
  PaymentStatus,
  PaymentType,
} from "@/lib/types";

type InitializeBookingPaymentResult = {
  authorizationUrl: string;
  accessCode: string;
  paymentReference: string;
  paystackReference: string;
  amountDue: number;
};

type VerifyPaymentResult = {
  ok: boolean;
  paymentStatus: PaymentStatus;
  booking: BookingWithService | null;
  payment: Payment | null;
  message: string;
};

export async function initializeBookingPayment(
  booking: BookingWithService,
  paymentType: PaymentType
): Promise<InitializeBookingPaymentResult> {
  const { totalAmount, amountDue } =
    calculatePaymentAmount(booking.total_amount || booking.estimated_price, paymentType);
  const paymentReference = createPaymentReference(booking.booking_reference);

  const { data: payment, error: paymentError } = await getSupabaseAdmin()
    .from("payments")
    .insert({
      booking_id: booking.id,
      payment_reference: paymentReference,
      paystack_reference: paymentReference,
      payment_type: paymentType,
      amount_due: amountDue,
      amount_paid: 0,
      currency: "ZAR",
      payment_status: "Pending Payment",
    })
    .select(
      "id, booking_id, payment_reference, paystack_reference, payment_type, amount_due, amount_paid, currency, payment_status, payment_method, paid_at, created_at"
    )
    .single();

  if (paymentError) {
    throw toSupabaseError(paymentError);
  }

  await updateBookingPaymentFields(booking.id, {
    payment_status: "Pending Payment",
    payment_type: paymentType,
    total_amount: totalAmount,
    amount_paid: 0,
    balance_due: totalAmount,
    status: "Pending Payment",
  });

  try {
    const initialized = await initializePaystackTransaction({
      booking,
      paymentReference,
      paymentType,
      amountDue,
    });

    if (initialized.reference !== paymentReference) {
      await getSupabaseAdmin()
        .from("payments")
        .update({ paystack_reference: initialized.reference })
        .eq("id", payment.id);
    }

    return {
      authorizationUrl: initialized.authorization_url,
      accessCode: initialized.access_code,
      paymentReference,
      paystackReference: initialized.reference,
      amountDue,
    };
  } catch (error) {
    await markPaymentFailed(payment.id, booking.id);
    throw error;
  } finally {
    revalidateBookingPaths(booking.id);
  }
}

export async function verifyAndFinalizePayment(
  reference: string
): Promise<VerifyPaymentResult> {
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    return {
      ok: false,
      paymentStatus: "Failed",
      booking: null,
      payment: null,
      message: "Payment reference was not found.",
    };
  }

  const alreadyPaid =
    payment.payment_status === "Deposit Paid" || payment.payment_status === "Paid";

  if (alreadyPaid) {
    return {
      ok: true,
      paymentStatus: payment.payment_status,
      booking: await getBookingById(payment.booking_id),
      payment,
      message: "Payment was already verified.",
    };
  }

  let transaction;
  try {
    transaction = await verifyPaystackTransaction(
      payment.paystack_reference ?? payment.payment_reference
    );
  } catch (error) {
    await markPaymentFailed(payment.id, payment.booking_id);
    return {
      ok: false,
      paymentStatus: "Failed",
      booking: await getBookingById(payment.booking_id),
      payment: await getPaymentById(payment.id),
      message:
        error instanceof Error
          ? error.message
          : "Paystack verification failed.",
    };
  }

  const paidAmount = fromPaystackSubunit(transaction.amount);
  const verified =
    transaction.status === "success" &&
    transaction.currency === payment.currency &&
    paidAmount >= payment.amount_due;

  if (!verified) {
    await markPaymentFailed(payment.id, payment.booking_id);
    return {
      ok: false,
      paymentStatus: "Failed",
      booking: await getBookingById(payment.booking_id),
      payment: await getPaymentById(payment.id),
      message: "Paystack did not verify a successful payment.",
    };
  }

  const nextPaymentStatus: PaymentStatus =
    payment.payment_type === "Deposit" ? "Deposit Paid" : "Paid";
  const booking = await getBookingById(payment.booking_id);

  if (!booking) {
    return {
      ok: false,
      paymentStatus: "Failed",
      booking: null,
      payment,
      message: "Booking was not found for this payment.",
    };
  }

  const balanceDue = Math.max(
    0,
    roundMoney((booking.total_amount || booking.estimated_price) - paidAmount)
  );

  const { error: paymentError } = await getSupabaseAdmin()
    .from("payments")
    .update({
      amount_paid: paidAmount,
      payment_status: nextPaymentStatus,
      payment_method: transaction.channel,
      paid_at: transaction.paid_at,
      paystack_reference: transaction.reference,
    })
    .eq("id", payment.id);

  if (paymentError) {
    throw toSupabaseError(paymentError);
  }

  await updateBookingPaymentFields(payment.booking_id, {
    status: "Confirmed",
    payment_status: nextPaymentStatus,
    payment_type: payment.payment_type,
    total_amount: booking.total_amount || booking.estimated_price,
    amount_paid: paidAmount,
    balance_due: balanceDue,
    confirmed_at: new Date().toISOString(),
  });

  revalidateBookingPaths(payment.booking_id);

  const updatedBooking = await getBookingById(payment.booking_id);
  const updatedPayment = await getPaymentById(payment.id);

  if (updatedBooking) {
    await sendConfirmationEmails(updatedBooking);
  }

  return {
    ok: true,
    paymentStatus: nextPaymentStatus,
    booking: updatedBooking,
    payment: updatedPayment,
    message: "Payment verified and booking confirmed.",
  };
}

export async function markPaystackReferenceFailed(reference: string) {
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    return null;
  }

  await markPaymentFailed(payment.id, payment.booking_id);
  return getBookingById(payment.booking_id);
}

async function getPaymentByReference(reference: string): Promise<Payment | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("payments")
    .select(
      "id, booking_id, payment_reference, paystack_reference, payment_type, amount_due, amount_paid, currency, payment_status, payment_method, paid_at, created_at"
    )
    .or(
      `payment_reference.eq.${reference},paystack_reference.eq.${reference}`
    )
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  return data ? mapPayment(data) : null;
}

async function getPaymentById(paymentId: string): Promise<Payment | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("payments")
    .select(
      "id, booking_id, payment_reference, paystack_reference, payment_type, amount_due, amount_paid, currency, payment_status, payment_method, paid_at, created_at"
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  return data ? mapPayment(data) : null;
}

async function markPaymentFailed(paymentId: string, bookingId: string) {
  const { error: paymentError } = await getSupabaseAdmin()
    .from("payments")
    .update({ payment_status: "Failed" })
    .eq("id", paymentId);

  if (paymentError) {
    throw toSupabaseError(paymentError);
  }

  await updateBookingPaymentFields(bookingId, {
    payment_status: "Failed",
  });
  revalidateBookingPaths(bookingId);
}

async function updateBookingPaymentFields(
  bookingId: string,
  values: Record<string, unknown>
) {
  const { error } = await getSupabaseAdmin()
    .from("bookings")
    .update(values)
    .eq("id", bookingId);

  if (error) {
    throw toSupabaseError(error);
  }
}

async function sendConfirmationEmails(booking: BookingWithService) {
  const results = await Promise.allSettled([
    sendBookingConfirmationEmail(booking),
    sendPaymentReceiptEmail(booking),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Email confirmation failed", result.reason);
    } else if (result.value.error) {
      console.error("Email confirmation failed", result.value.error);
    }
  }
}

function mapPayment(payment: Record<string, unknown>): Payment {
  return {
    id: String(payment.id ?? ""),
    booking_id: String(payment.booking_id ?? ""),
    payment_reference: String(payment.payment_reference ?? ""),
    paystack_reference:
      typeof payment.paystack_reference === "string"
        ? payment.paystack_reference
        : null,
    payment_type:
      payment.payment_type === "Full Payment" ? "Full Payment" : "Deposit",
    amount_due: Number(payment.amount_due ?? 0),
    amount_paid: Number(payment.amount_paid ?? 0),
    currency: String(payment.currency ?? "ZAR"),
    payment_status: normalisePaymentStatus(payment.payment_status),
    payment_method:
      typeof payment.payment_method === "string" ? payment.payment_method : null,
    paid_at: typeof payment.paid_at === "string" ? payment.paid_at : null,
    created_at: String(payment.created_at ?? ""),
  };
}

function normalisePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value ?? "Pending Payment");

  if (
    status === "Deposit Paid" ||
    status === "Paid" ||
    status === "Failed" ||
    status === "Refunded"
  ) {
    return status;
  }

  return "Pending Payment";
}

function revalidateBookingPaths(bookingId: string) {
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
