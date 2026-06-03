import { revalidatePath } from "next/cache";

import { sendAutomationEmail } from "@/lib/email";
import { generateInvoiceForBooking } from "@/lib/invoices";
import { calculateBookingPricing, getSelectedAddons } from "@/lib/pricing";
import { getNextRecurringDate } from "@/lib/recurring-schedule";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { toSupabaseError } from "@/lib/supabase/errors";
import { getBookingById, getServiceConfigBySlug } from "@/lib/supabase/queries";
import type {
  AutomationChannel,
  AutomationType,
  BookingWithService,
  RecurringBooking,
  RecurringFrequency,
} from "@/lib/types";

type AutomationRunResult = {
  generatedBookings: number;
  reminders: number;
  followUps: number;
  invoices: number;
};

export async function runAutomationSweep(): Promise<AutomationRunResult> {
  const [generatedBookings, reminders, followUps, invoices] = await Promise.all([
    generateDueRecurringBookings(),
    sendDueBookingReminders(),
    sendCompletedBookingFollowUps(),
    generateDueInvoices(),
  ]);

  revalidatePath("/admin/automation");
  revalidatePath("/admin/recurring");
  revalidatePath("/admin/invoices");

  return {
    generatedBookings,
    reminders,
    followUps,
    invoices,
  };
}

export async function generateDueRecurringBookings() {
  const today = toDateInput(new Date());
  const { data, error } = await getSupabaseAdmin()
    .from("recurring_bookings")
    .select(
      "id, customer_id, service_id, address_id, frequency, preferred_day, preferred_time, service_data, selected_addons, estimated_price, status, next_booking_date, created_at, customer_addresses(id, customer_id, label, address, suburb, city, access_instructions, gate_code, parking_instructions, is_default, created_at), customers(id, user_id, full_name, email, phone, created_at), services(name)"
    )
    .eq("status", "Active")
    .lte("next_booking_date", today);

  if (error) {
    throw toSupabaseError(error);
  }

  let generated = 0;

  for (const recurring of data ?? []) {
    const plan = recurring as unknown as RecurringBooking & {
      customer_addresses?: {
        address?: string;
        suburb?: string;
        city?: string;
      } | null;
      customers?: {
        full_name?: string;
        email?: string;
        phone?: string | null;
      } | null;
    };

    if (!plan.customer_addresses || !plan.customers) {
      await logAutomation({
        customerId: plan.customer_id,
        automationType: "Booking Reminder",
        channel: "Email",
        status: "Skipped: missing address or customer",
      });
      continue;
    }

    const service = await getServiceConfigBySlug(plan.service_data.serviceSlug);
    const selectedAddonIds = plan.selected_addons.map((addon) => addon.id);
    const pricing = service
      ? calculateBookingPricing(service, selectedAddonIds, Object.fromEntries(
          plan.service_data.questions.map((question) => [
            question.id,
            question.value,
          ])
        ))
      : null;
    const selectedAddons = service
      ? getSelectedAddons(service, selectedAddonIds)
      : plan.selected_addons;
    const bookingTotal = pricing?.total ?? plan.estimated_price;
    const serviceData = pricing
      ? { ...plan.service_data, pricingBreakdown: pricing }
      : plan.service_data;

    const bookingReference = createBookingReference();
    const { data: booking, error: bookingError } = await getSupabaseAdmin()
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        recurring_booking_id: plan.id,
        customer_id: plan.customer_id,
        customer_name: plan.customers.full_name ?? "Shalean customer",
        customer_email: plan.customers.email ?? "",
        customer_phone: plan.customers.phone ?? "",
        service_id: plan.service_id,
        address: plan.customer_addresses.address,
        suburb: plan.customer_addresses.suburb,
        city: plan.customer_addresses.city,
        booking_date: plan.next_booking_date,
        booking_time: plan.preferred_time,
        scheduled_start_time: toScheduledTimestamp(
          plan.next_booking_date,
          plan.preferred_time
        ),
        scheduled_end_time: toScheduledTimestamp(
          plan.next_booking_date,
          plan.preferred_time,
          3
        ),
        service_data: serviceData,
        selected_addons: selectedAddons,
        estimated_price: bookingTotal,
        status: "Pending Confirmation",
        payment_status: "Pending Payment",
        total_amount: bookingTotal,
        amount_paid: 0,
        balance_due: bookingTotal,
        can_reschedule: true,
        can_cancel: true,
      })
      .select("id")
      .single();

    if (bookingError) {
      throw toSupabaseError(bookingError);
    }

    const nextBookingDate = getNextRecurringDate(
      String(plan.next_booking_date),
      plan.frequency as RecurringFrequency,
      plan.preferred_day
    );
    const { error: updateError } = await getSupabaseAdmin()
      .from("recurring_bookings")
      .update({ next_booking_date: nextBookingDate })
      .eq("id", plan.id);

    if (updateError) {
      throw toSupabaseError(updateError);
    }

    await logAutomation({
      bookingId: String(booking.id),
      customerId: plan.customer_id,
      automationType: "Booking Reminder",
      channel: "Email",
      status: `Generated recurring booking ${bookingReference}`,
    });
    generated += 1;
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/recurring");
  revalidatePath("/account/bookings");
  return generated;
}

export async function sendDueBookingReminders() {
  const tomorrow = toDateInput(addDays(new Date(), 1));
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select("id")
    .eq("booking_date", tomorrow)
    .neq("status", "Cancelled");

  if (error) {
    throw toSupabaseError(error);
  }

  let sent = 0;

  for (const item of data ?? []) {
    const booking = await getBookingById(String(item.id));

    if (!booking) {
      continue;
    }

    sent += await sendOneBookingAutomation(booking, "Booking Reminder");

    if (booking.assigned_cleaner_id) {
      sent += await sendOneBookingAutomation(booking, "Cleaner Reminder");
    }

    if (booking.balance_due > 0) {
      sent += await sendOneBookingAutomation(booking, "Payment Reminder");
    }
  }

  return sent;
}

export async function sendCompletedBookingAutomations(bookingId: string) {
  const booking = await getBookingById(bookingId);

  if (!booking || booking.status !== "Completed") {
    return 0;
  }

  const followUp = await sendOneBookingAutomation(
    booking,
    "Post-Cleaning Follow-Up"
  );
  const review = await sendOneBookingAutomation(booking, "Review Request");
  await generateInvoiceForBooking(booking);

  return followUp + review;
}

export async function sendCompletedBookingFollowUps() {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select("id")
    .eq("status", "Completed");

  if (error) {
    throw toSupabaseError(error);
  }

  let sent = 0;

  for (const item of data ?? []) {
    sent += await sendCompletedBookingAutomations(String(item.id));
  }

  return sent;
}

export async function generateDueInvoices() {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select("id")
    .or("status.eq.Completed,amount_paid.gt.0");

  if (error) {
    throw toSupabaseError(error);
  }

  let created = 0;

  for (const item of data ?? []) {
    const invoice = await generateInvoiceForBooking(String(item.id));
    if (invoice) {
      created += 1;
    }
  }

  return created;
}

async function sendOneBookingAutomation(
  booking: BookingWithService,
  automationType: AutomationType
) {
  if (await hasAutomationLog(booking.id, automationType, "Email")) {
    return 0;
  }

  const result = await sendAutomationEmail({ booking, automationType });
  await logAutomation({
    bookingId: booking.id,
    customerId: booking.customer_id,
    automationType,
    channel: "Email",
    status: result.sent ? "Sent" : result.skipped ? "Skipped" : "Failed",
    sentAt: result.sent ? new Date().toISOString() : null,
  });

  return result.sent ? 1 : 0;
}

async function hasAutomationLog(
  bookingId: string,
  automationType: AutomationType,
  channel: AutomationChannel
) {
  const { data, error } = await getSupabaseAdmin()
    .from("automation_logs")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("automation_type", automationType)
    .eq("channel", channel)
    .limit(1);

  if (error) {
    throw toSupabaseError(error);
  }

  return Boolean(data?.length);
}

async function logAutomation({
  bookingId = null,
  customerId = null,
  automationType,
  channel,
  status,
  sentAt = null,
}: {
  bookingId?: string | null;
  customerId?: string | null;
  automationType: AutomationType;
  channel: AutomationChannel;
  status: string;
  sentAt?: string | null;
}) {
  const { error } = await getSupabaseAdmin().from("automation_logs").insert({
    booking_id: bookingId,
    customer_id: customerId,
    automation_type: automationType,
    channel,
    status,
    sent_at: sentAt,
  });

  if (error) {
    throw toSupabaseError(error);
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createBookingReference() {
  const randomSegment = Math.random().toString(36).slice(2, 7).toUpperCase();
  const timeSegment = Date.now().toString(36).toUpperCase();

  return `SHL-${timeSegment}-${randomSegment}`;
}

function toScheduledTimestamp(date: string, time: string, addHours = 0) {
  const scheduled = new Date(`${date}T${time.slice(0, 5)}:00`);
  scheduled.setHours(scheduled.getHours() + addHours);
  return scheduled.toISOString();
}
