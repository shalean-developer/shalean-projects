import type { AutomationType, BookingWithService, Invoice } from "@/lib/types";

type EmailResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
};

type EmailAttachment = {
  filename: string;
  content: string;
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

export async function sendAutomationEmail({
  booking,
  automationType,
}: {
  booking: BookingWithService;
  automationType: AutomationType;
}): Promise<EmailResult> {
  const template = automationTemplate(booking, automationType);

  return sendEmail({
    to: template.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendInvoiceEmail(
  invoice: Invoice
): Promise<EmailResult> {
  if (!invoice.booking && !invoice.customer) {
    return { sent: false, error: "Invoice booking details are missing." };
  }

  return sendEmail({
    to: invoice.booking?.customer_email ?? invoice.customer?.email ?? "",
    subject: `Shalean invoice ${invoice.invoice_number}`,
    html: invoiceEmailHtml(invoice),
    text: invoiceEmailText(invoice),
    attachments: [
      {
        filename: `${invoice.invoice_number}.pdf`,
        content: createInvoicePdfBase64(invoice),
      },
    ],
  });
}

export async function sendInvoicePaymentConfirmationEmail(
  invoice: Invoice
): Promise<EmailResult> {
  return sendEmail({
    to: invoice.booking?.customer_email ?? invoice.customer?.email ?? "",
    subject: `Payment received for invoice ${invoice.invoice_number}`,
    html: layoutEmail(
      "Payment received",
      `
        <p>Thank you. We have received payment for invoice ${escapeHtml(invoice.invoice_number)}.</p>
        ${invoiceTable(invoice, invoice.booking ?? null)}
      `
    ),
    text: [
      `Payment received for invoice ${invoice.invoice_number}`,
      "",
      `Total paid: ${formatMoney(invoice.total)}`,
      `Invoice status: ${invoice.invoice_status}`,
    ].join("\n"),
  });
}

async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
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
      ...(attachments?.length ? { attachments } : {}),
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

function automationTemplate(
  booking: BookingWithService,
  automationType: AutomationType
) {
  const cleanerEmail = booking.assigned_cleaner?.email ?? booking.customer_email;
  const cleanerName = booking.assigned_cleaner?.full_name ?? "Shalean cleaner";
  const bookingTime = booking.booking_time.slice(0, 5);
  const commonDetails = detailTable(booking);

  if (automationType === "Cleaner Reminder") {
    return {
      to: cleanerEmail,
      subject: `Cleaner reminder: ${booking.booking_reference}`,
      html: layoutEmail(
        "Cleaner reminder",
        `
          <p>Hi ${escapeHtml(cleanerName)}, this is a 24-hour reminder for your assigned Shalean job.</p>
          ${commonDetails}
        `
      ),
      text: [
        "Cleaner reminder",
        "",
        `Hi ${cleanerName}, this is a 24-hour reminder for your assigned Shalean job.`,
        "",
        ...textDetails(booking),
      ].join("\n"),
    };
  }

  if (automationType === "Payment Reminder") {
    return {
      to: booking.customer_email,
      subject: `Payment reminder: ${booking.booking_reference}`,
      html: layoutEmail(
        "Payment reminder",
        `
          <p>Your Shalean booking has a remaining balance of ${formatMoney(booking.balance_due)}.</p>
          ${commonDetails}
        `
      ),
      text: [
        "Payment reminder",
        "",
        `Your Shalean booking has a remaining balance of ${formatMoney(booking.balance_due)}.`,
        "",
        ...textDetails(booking),
      ].join("\n"),
    };
  }

  if (automationType === "Post-Cleaning Follow-Up") {
    return {
      to: booking.customer_email,
      subject: `How was your Shalean cleaning? ${booking.booking_reference}`,
      html: layoutEmail(
        "Post-cleaning follow-up",
        `
          <p>Thank you for choosing Shalean. We hope your space feels fresh and cared for.</p>
          <p>If anything needs attention, reply to this email and our team will help.</p>
          ${commonDetails}
        `
      ),
      text: [
        "Post-cleaning follow-up",
        "",
        "Thank you for choosing Shalean. We hope your space feels fresh and cared for.",
        "If anything needs attention, reply to this email and our team will help.",
        "",
        ...textDetails(booking),
      ].join("\n"),
    };
  }

  if (automationType === "Review Request") {
    return {
      to: booking.customer_email,
      subject: `Review your Shalean cleaning: ${booking.booking_reference}`,
      html: layoutEmail(
        "Review request",
        `
          <p>Your feedback helps us keep the service personal and reliable.</p>
          <p>You can leave a review from your Shalean account after this completed booking.</p>
          ${commonDetails}
        `
      ),
      text: [
        "Review request",
        "",
        "Your feedback helps us keep the service personal and reliable.",
        "You can leave a review from your Shalean account after this completed booking.",
        "",
        ...textDetails(booking),
      ].join("\n"),
    };
  }

  return {
    to: booking.customer_email,
    subject: `Booking reminder: ${booking.booking_reference}`,
    html: layoutEmail(
      "Booking reminder",
      `
        <p>Your Shalean cleaning is scheduled for ${booking.booking_date} at ${bookingTime}.</p>
        ${commonDetails}
      `
    ),
    text: [
      "Booking reminder",
      "",
      `Your Shalean cleaning is scheduled for ${booking.booking_date} at ${bookingTime}.`,
      "",
      ...textDetails(booking),
    ].join("\n"),
  };
}

function invoiceEmailHtml(invoice: Invoice) {
  const booking = invoice.booking;

  if (!booking && !invoice.customer) {
    return "";
  }

  return layoutEmail(
    `Invoice ${invoice.invoice_number}`,
    `
      <p>Your Shalean invoice is ready.</p>
      <p><strong>Total due:</strong> ${formatMoney(invoice.balance_due || invoice.total)}</p>
      <p><strong>Due date:</strong> ${escapeHtml(invoice.due_date ?? "Not set")}</p>
      ${invoiceTable(invoice, booking ?? null)}
      ${
        invoice.payment_link
          ? `<p><a href="${escapeHtml(invoice.payment_link)}">View and pay invoice</a></p>`
          : ""
      }
    `
  );
}

function invoiceEmailText(invoice: Invoice) {
  const booking = invoice.booking;

  if (!booking && !invoice.customer) {
    return "";
  }

  return [
    `Invoice ${invoice.invoice_number}`,
    "",
    ...(booking
      ? [
          `Booking reference: ${booking.booking_reference}`,
          `Service: ${booking.service_name}`,
          `Booking date: ${booking.booking_date}`,
        ]
      : invoice.line_items.map(
          (item) =>
            `${item.booking_date} - ${item.service_type} - ${formatMoney(item.amount)}`
        )),
    `Subtotal: ${formatMoney(invoice.subtotal)}`,
    `Total: ${formatMoney(invoice.total)}`,
    `Amount paid: ${formatMoney(invoice.amount_paid)}`,
    `Balance due: ${formatMoney(invoice.balance_due)}`,
    `Due date: ${invoice.due_date ?? "Not set"}`,
    `Payment link: ${invoice.payment_link ?? "Sign in to view invoice"}`,
    `Invoice status: ${invoice.invoice_status}`,
  ].join("\n");
}

function invoiceTable(invoice: Invoice, booking: BookingWithService | null) {
  const rows = [
    ["Invoice number", invoice.invoice_number],
    ["Customer", booking?.customer_name ?? invoice.customer?.full_name ?? "Customer"],
    ...(booking
      ? [
          ["Booking reference", booking.booking_reference],
          ["Service", booking.service_name],
          ["Add-ons", formatAddons(booking)],
          ["Booking date", booking.booking_date],
        ]
      : invoice.line_items.map((item) => [
          item.booking_id,
          `${item.booking_date} - ${item.service_type} - ${formatMoney(item.amount)}`,
        ])),
    ["Subtotal", formatMoney(invoice.subtotal)],
    ["Total", formatMoney(invoice.total)],
    ["Amount paid", formatMoney(invoice.amount_paid)],
    ["Balance due", formatMoney(invoice.balance_due)],
    ["Due date", invoice.due_date ?? "Not set"],
    ["Invoice status", invoice.invoice_status],
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

function createInvoicePdfBase64(invoice: Invoice) {
  const lines = [
    "Shalean Cleaning Services",
    `Invoice ${invoice.invoice_number}`,
    `Customer: ${invoice.booking?.customer_name ?? invoice.customer?.full_name ?? "Customer"}`,
    `Total: ${formatMoney(invoice.total)}`,
    `Balance due: ${formatMoney(invoice.balance_due)}`,
    `Due date: ${invoice.due_date ?? "Not set"}`,
    "",
    ...invoice.line_items.map(
      (item) => `${item.booking_date} ${item.service_type} ${formatMoney(item.amount)}`
    ),
  ];
  const body = lines.map(escapePdfText).join("\\n");
  const stream = `BT /F1 11 Tf 50 780 Td (${body}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf).toString("base64");
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
