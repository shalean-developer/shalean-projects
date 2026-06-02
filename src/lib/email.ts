import type { BookingWithService } from "@/lib/types";

type EmailResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
};

export function hasEmailConfig() {
  return Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL);
}

export async function sendBookingConfirmationEmail(
  booking: BookingWithService
): Promise<EmailResult> {
  return sendEmail({
    to: booking.customer_email,
    subject: `Shalean booking confirmed: ${booking.booking_reference}`,
    html: bookingConfirmationHtml(booking),
    text: bookingConfirmationText(booking),
  });
}

export async function sendPaymentReceiptEmail(
  booking: BookingWithService
): Promise<EmailResult> {
  return sendEmail({
    to: booking.customer_email,
    subject: `Payment receipt: ${booking.booking_reference}`,
    html: paymentReceiptHtml(booking),
    text: paymentReceiptText(booking),
  });
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  if (!hasEmailConfig()) {
    return { sent: false, skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    return {
      sent: false,
      error: payload?.message ?? "Resend could not send the email.",
    };
  }

  return { sent: true };
}

function bookingConfirmationHtml(booking: BookingWithService) {
  return layoutEmail(
    "Booking confirmed",
    `
      ${detailTable(booking)}
      <p>Your booking is confirmed. Thank you for booking with Shalean Cleaning Services.</p>
    `
  );
}

function paymentReceiptHtml(booking: BookingWithService) {
  return layoutEmail(
    "Payment receipt",
    `
      <p>We have received your ${booking.payment_type ?? "payment"} payment.</p>
      ${detailTable(booking)}
    `
  );
}

function bookingConfirmationText(booking: BookingWithService) {
  return [
    "Booking confirmed",
    "",
    ...textDetails(booking),
    "",
    "Your booking is confirmed. Thank you for booking with Shalean Cleaning Services.",
  ].join("\n");
}

function paymentReceiptText(booking: BookingWithService) {
  return [
    "Payment receipt",
    "",
    `We have received your ${booking.payment_type ?? "payment"} payment.`,
    "",
    ...textDetails(booking),
  ].join("\n");
}

function layoutEmail(title: string, body: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">${escapeHtml(title)}</h1>
      ${body}
    </div>
  `;
}

function detailTable(booking: BookingWithService) {
  const rows = [
    ["Customer name", booking.customer_name],
    ["Booking reference", booking.booking_reference],
    ["Service booked", booking.service_name],
    ["Booking date", booking.booking_date],
    ["Booking time", booking.booking_time.slice(0, 5)],
    ["Address", `${booking.address}, ${booking.suburb}, ${booking.city}`],
    ["Selected add-ons", formatAddons(booking)],
    ["Assigned cleaner", booking.assigned_cleaner?.full_name ?? "To be assigned"],
    ["Total amount", formatMoney(booking.total_amount)],
    ["Amount paid", formatMoney(booking.amount_paid)],
    ["Balance due", formatMoney(booking.balance_due)],
    ["Booking status", booking.status],
  ];

  return `
    <table style="border-collapse: collapse; width: 100%; max-width: 620px;">
      <tbody>
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 8px; color: #6b7280;">${escapeHtml(label)}</td>
                <td style="border: 1px solid #e5e7eb; padding: 8px; font-weight: 600;">${escapeHtml(value)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function textDetails(booking: BookingWithService) {
  return [
    `Customer name: ${booking.customer_name}`,
    `Booking reference: ${booking.booking_reference}`,
    `Service booked: ${booking.service_name}`,
    `Booking date: ${booking.booking_date}`,
    `Booking time: ${booking.booking_time.slice(0, 5)}`,
    `Address: ${booking.address}, ${booking.suburb}, ${booking.city}`,
    `Selected add-ons: ${formatAddons(booking)}`,
    `Assigned cleaner: ${booking.assigned_cleaner?.full_name ?? "To be assigned"}`,
    `Total amount: ${formatMoney(booking.total_amount)}`,
    `Amount paid: ${formatMoney(booking.amount_paid)}`,
    `Balance due: ${formatMoney(booking.balance_due)}`,
    `Booking status: ${booking.status}`,
  ];
}

function formatAddons(booking: BookingWithService) {
  return booking.selected_addons.length
    ? booking.selected_addons.map((addon) => addon.label).join(", ")
    : "None";
}

function formatMoney(value: number) {
  return `R${value.toFixed(2)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
