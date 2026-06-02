import type { BookingWithService } from "@/lib/types";

export function generateCustomerWhatsAppMessage(booking: BookingWithService) {
  return `Hi ${booking.customer_name}, your Shalean Cleaning Services booking ${booking.booking_reference} for ${booking.service_name} on ${booking.booking_date} at ${booking.booking_time.slice(0, 5)} has been confirmed. Amount paid: R${formatAmount(booking.amount_paid)}. Balance due: R${formatAmount(booking.balance_due)}. Thank you for booking with Shalean.`;
}

export function generateAdminWhatsAppMessage(booking: BookingWithService) {
  return `New paid booking: ${booking.booking_reference}. Service: ${booking.service_name}. Customer: ${booking.customer_name}. Date: ${booking.booking_date}. Time: ${booking.booking_time.slice(0, 5)}. Paid: R${formatAmount(booking.amount_paid)}. Balance: R${formatAmount(booking.balance_due)}.`;
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
