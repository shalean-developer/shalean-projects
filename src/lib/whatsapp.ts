import type { AutomationType, BookingWithService, Invoice } from "@/lib/types";

export function generateCustomerWhatsAppMessage(booking: BookingWithService) {
  return `Hi ${booking.customer_name}, your Shalean Cleaning Services booking ${booking.booking_reference} for ${booking.service_name} on ${booking.booking_date} at ${booking.booking_time.slice(0, 5)} has been confirmed. Amount paid: R${formatAmount(booking.amount_paid)}. Balance due: R${formatAmount(booking.balance_due)}. Thank you for booking with Shalean.`;
}

export function generateAdminWhatsAppMessage(booking: BookingWithService) {
  return `New paid booking: ${booking.booking_reference}. Service: ${booking.service_name}. Customer: ${booking.customer_name}. Date: ${booking.booking_date}. Time: ${booking.booking_time.slice(0, 5)}. Paid: R${formatAmount(booking.amount_paid)}. Balance: R${formatAmount(booking.balance_due)}.`;
}

export function generateAutomationWhatsAppMessage(
  booking: BookingWithService,
  automationType: AutomationType
) {
  const dateTime = `${booking.booking_date} at ${booking.booking_time.slice(0, 5)}`;

  if (automationType === "Cleaner Reminder") {
    return `Cleaner reminder: Shalean job ${booking.booking_reference} for ${booking.service_name} is scheduled on ${dateTime}. Customer: ${booking.customer_name}. Address: ${booking.address}, ${booking.suburb}, ${booking.city}.`;
  }

  if (automationType === "Payment Reminder") {
    return `Hi ${booking.customer_name}, reminder that booking ${booking.booking_reference} has a balance due of R${formatAmount(booking.balance_due)}. Thank you, Shalean Cleaning Services.`;
  }

  if (automationType === "Post-Cleaning Follow-Up") {
    return `Hi ${booking.customer_name}, thank you for choosing Shalean for booking ${booking.booking_reference}. Reply here if anything needs attention.`;
  }

  if (automationType === "Review Request") {
    return `Hi ${booking.customer_name}, we would love your feedback on Shalean booking ${booking.booking_reference}. You can submit a review from your account.`;
  }

  if (automationType === "Invoice Sent") {
    return `Hi ${booking.customer_name}, your Shalean invoice for booking ${booking.booking_reference} has been sent. Balance due: R${formatAmount(booking.balance_due)}.`;
  }

  return `Hi ${booking.customer_name}, reminder: your Shalean cleaning booking ${booking.booking_reference} is scheduled for ${dateTime}.`;
}

export function generateInvoiceWhatsAppMessage(invoice: Invoice) {
  const bookingReference = invoice.booking?.booking_reference ?? invoice.booking_id;

  return `Hi ${invoice.booking?.customer_name ?? "Shalean customer"}, invoice ${invoice.invoice_number} for booking ${bookingReference} is ready. Total: R${formatAmount(invoice.total)}. Paid: R${formatAmount(invoice.amount_paid)}. Balance: R${formatAmount(invoice.balance_due)}.`;
}

export function createWhatsAppCloudApiPayload({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: message,
    },
  };
}

function formatAmount(value: number) {
  return value.toFixed(2);
}
