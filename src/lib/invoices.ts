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

export async function generateMonthlyInvoiceForCustomer({
  customerId,
  month,
  dueDate,
  send = false,
}: {
  customerId: string;
  month: string;
  dueDate: string;
  send?: boolean;
}) {
  const monthStart = `${month}-01`;
  const monthEnd = getNextMonthStart(monthStart);
  const { data: bookings, error } = await getSupabaseAdmin()
    .from("bookings")
    .select("id, booking_reference, service_id, customer_id, customer_name, customer_email, customer_phone, booking_date, booking_time, service_data, selected_addons, estimated_price, total_amount, amount_paid, balance_due, status")
    .eq("customer_id", customerId)
    .gte("booking_date", monthStart)
    .lt("booking_date", monthEnd)
    .gt("balance_due", 0)
    .in("status", ["Pending Invoice", "Invoiced", "Completed", "Confirmed"]);

  if (error) {
    throw toSupabaseError(error);
  }

  if (!bookings?.length) {
    return null;
  }

  const subtotal = bookings.reduce(
    (sum, booking) => sum + Number(booking.total_amount ?? booking.estimated_price ?? 0),
    0
  );
  const amountPaid = bookings.reduce(
    (sum, booking) => sum + Number(booking.amount_paid ?? 0),
    0
  );
  const balanceDue = bookings.reduce(
    (sum, booking) => sum + Number(booking.balance_due ?? 0),
    0
  );
  const invoiceNumber = await createInvoiceNumber();
  const { data: invoiceData, error: invoiceError } = await getSupabaseAdmin()
    .from("invoices")
    .insert({
      booking_id: null,
      customer_id: customerId,
      invoice_number: invoiceNumber,
      invoice_status: "Draft",
      subtotal,
      total: subtotal,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      due_date: dueDate,
      payment_link: `${getSiteUrl()}/account/invoices`,
    })
    .select("id")
    .single();

  if (invoiceError) {
    throw toSupabaseError(invoiceError);
  }

  const invoiceId = String(invoiceData.id);
  const lineItems = bookings.map((booking) => ({
    invoice_id: invoiceId,
    booking_id: String(booking.id),
    description: String(booking.booking_reference ?? ""),
    service_type: getServiceName(booking.service_data),
    booking_date: String(booking.booking_date ?? monthStart),
    amount: Number(booking.balance_due ?? booking.total_amount ?? booking.estimated_price ?? 0),
  }));
  const { error: lineError } = await getSupabaseAdmin()
    .from("invoice_line_items")
    .insert(lineItems);

  if (lineError) {
    throw toSupabaseError(lineError);
  }

  const { error: bookingError } = await getSupabaseAdmin()
    .from("bookings")
    .update({ status: "Invoiced" })
    .in("id", bookings.map((booking) => String(booking.id)));

  if (bookingError) {
    throw toSupabaseError(bookingError);
  }

  const paymentLink = `${getSiteUrl()}/account/invoices/${invoiceId}`;
  await getSupabaseAdmin()
    .from("invoices")
    .update({ payment_link: paymentLink })
    .eq("id", invoiceId);

  const invoice = await getInvoiceById(invoiceId);

  if (invoice && send) {
    await sendInvoiceAndLog(invoice);
  }

  revalidatePath("/admin/invoices");
  revalidatePath("/admin/bookings");
  revalidatePath("/account/invoices");
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

  revalidateInvoicePaths(
    invoiceId,
    typeof data.booking_id === "string" ? data.booking_id : null
  );

  if (invoiceStatus === "Paid") {
    await markInvoiceBookingsPaid(invoiceId);
  }
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

function revalidateInvoicePaths(invoiceId: string, bookingId: string | null) {
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/account/invoices");
  revalidatePath(`/account/invoices/${invoiceId}`);
  revalidatePath("/admin/automation");
  if (bookingId) {
    revalidatePath(`/admin/bookings/${bookingId}`);
  }
}

async function markInvoiceBookingsPaid(invoiceId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("invoice_line_items")
    .select("booking_id")
    .eq("invoice_id", invoiceId);

  if (error || !data?.length) {
    if (error) {
      throw toSupabaseError(error);
    }

    return;
  }

  const bookingIds = data.map((item) => String(item.booking_id));
  const { error: bookingError } = await getSupabaseAdmin()
    .from("bookings")
    .update({
      status: "Paid",
      payment_status: "Paid",
      balance_due: 0,
      confirmed_at: new Date().toISOString(),
    })
    .in("id", bookingIds);

  if (bookingError) {
    throw toSupabaseError(bookingError);
  }
}

function getNextMonthStart(monthStart: string) {
  const date = new Date(`${monthStart}T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function getServiceName(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return String((value as { serviceName?: unknown }).serviceName ?? "Cleaning service");
  }

  return "Cleaning service";
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}
