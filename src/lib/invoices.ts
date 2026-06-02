import { revalidatePath } from "next/cache";

import { sendInvoiceEmail } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { toSupabaseError } from "@/lib/supabase/errors";
import { getBookingById, getInvoiceById } from "@/lib/supabase/queries";
import type { BookingWithService, Invoice, InvoiceStatus } from "@/lib/types";

export async function generateInvoiceForBooking(
  bookingOrId: BookingWithService | string,
  options: { send?: boolean } = {}
): Promise<Invoice | null> {
  const booking =
    typeof bookingOrId === "string"
      ? await getBookingById(bookingOrId)
      : bookingOrId;

  if (!booking) {
    return null;
  }

  const existing = await getInvoiceByBookingId(booking.id);
  const status = inferInvoiceStatus(booking, existing?.invoice_status);
  const payload = {
    customer_id: booking.customer_id,
    invoice_status: status,
    subtotal: booking.estimated_price,
    total: booking.total_amount || booking.estimated_price,
    amount_paid: booking.amount_paid,
    balance_due: booking.balance_due,
    issued_at:
      status === "Sent" || status === "Paid" || status === "Partially Paid"
        ? existing?.issued_at ?? new Date().toISOString()
        : existing?.issued_at ?? null,
    paid_at:
      status === "Paid" ? existing?.paid_at ?? new Date().toISOString() : null,
  };

  let invoiceId = existing?.id;

  if (existing) {
    const { error } = await getSupabaseAdmin()
      .from("invoices")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      throw toSupabaseError(error);
    }
  } else {
    const { data, error } = await getSupabaseAdmin()
      .from("invoices")
      .insert({
        ...payload,
        booking_id: booking.id,
        invoice_number: await createInvoiceNumber(),
      })
      .select("id")
      .single();

    if (error) {
      throw toSupabaseError(error);
    }

    invoiceId = String(data.id);
  }

  if (!invoiceId) {
    return null;
  }

  const invoice = await getInvoiceById(invoiceId);

  if (invoice && options.send) {
    await sendInvoiceAndLog(invoice);
  }

  revalidateInvoicePaths(invoiceId, booking.id);
  return invoice;
}

export async function sendInvoiceAndLog(invoice: Invoice) {
  const result = await sendInvoiceEmail(invoice);
  const now = new Date().toISOString();

  if (invoice.invoice_status === "Draft") {
    const { error } = await getSupabaseAdmin()
      .from("invoices")
      .update({ invoice_status: "Sent", issued_at: invoice.issued_at ?? now })
      .eq("id", invoice.id);

    if (error) {
      throw toSupabaseError(error);
    }
  }

  await getSupabaseAdmin().from("automation_logs").insert({
    booking_id: invoice.booking_id,
    customer_id: invoice.customer_id,
    automation_type: "Invoice Sent",
    channel: "Email",
    status: result.sent ? "Sent" : result.skipped ? "Skipped" : "Failed",
    sent_at: result.sent ? now : null,
  });

  revalidateInvoicePaths(invoice.id, invoice.booking_id);
}

export async function updateInvoiceStatus(
  invoiceId: string,
  invoiceStatus: InvoiceStatus
) {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    invoice_status: invoiceStatus,
  };

  if (invoiceStatus === "Sent" || invoiceStatus === "Partially Paid") {
    update.issued_at = now;
  }

  if (invoiceStatus === "Paid") {
    update.issued_at = now;
    update.paid_at = now;
    update.balance_due = 0;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("invoices")
    .update(update)
    .eq("id", invoiceId)
    .select("booking_id")
    .single();

  if (error) {
    throw toSupabaseError(error);
  }

  revalidateInvoicePaths(invoiceId, String(data.booking_id));
}

async function getInvoiceByBookingId(bookingId: string): Promise<Invoice | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("invoices")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  return data ? getInvoiceById(String(data.id)) : null;
}

async function createInvoiceNumber() {
  const { data, error } = await getSupabaseAdmin().rpc("next_invoice_number");

  if (!error && typeof data === "string" && data) {
    return data;
  }

  const randomSegment = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${Date.now().toString(36).toUpperCase()}-${randomSegment}`;
}

function inferInvoiceStatus(
  booking: BookingWithService,
  existingStatus?: InvoiceStatus
): InvoiceStatus {
  if (existingStatus === "Cancelled") {
    return "Cancelled";
  }

  if (booking.balance_due <= 0 && booking.amount_paid > 0) {
    return "Paid";
  }

  if (booking.amount_paid > 0 && booking.balance_due > 0) {
    return "Partially Paid";
  }

  if (booking.status === "Completed") {
    return "Sent";
  }

  return existingStatus ?? "Draft";
}

function revalidateInvoicePaths(invoiceId: string, bookingId: string) {
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/account/invoices");
  revalidatePath(`/account/invoices/${invoiceId}`);
  revalidatePath("/admin/automation");
  revalidatePath(`/admin/bookings/${bookingId}`);
}
