"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addressSchema,
  adminRequestDecisionSchema,
  authSchema,
  bookingRequestSchema,
  profileSchema,
  signupSchema,
  type AddressValues,
  type ProfileValues,
} from "@/lib/account-schema";
import {
  generateDueRecurringBookings,
  runAutomationSweep,
  sendCompletedBookingAutomations,
} from "@/lib/automation";
import {
  ensureCustomerForUser,
  getOptionalCustomer,
  getOptionalCleaner,
  isAdminUser,
  requireAdmin,
  requireCleaner,
  requireCustomer,
  requireUser,
} from "@/lib/auth";
import { getServiceBySlug } from "@/config/services";
import { bookingWizardSchema, type BookingWizardValues } from "@/lib/booking-schema";
import { generateInvoiceForBooking, sendInvoiceAndLog, updateInvoiceStatus } from "@/lib/invoices";
import { calculatePaymentAmount } from "@/lib/paystack";
import { initializeBookingPayment } from "@/lib/payments";
import {
  availabilityFormSchema,
  cleanerFormSchema,
  type CleanerFormValues,
} from "@/lib/cleaner-schema";
import { calculateEstimatedTotal, getSelectedAddons } from "@/lib/pricing";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toSupabaseError } from "@/lib/supabase/errors";
import {
  getBookingById,
  getCleanerBookingById,
  getCustomerRecurringBookingById,
  getDatabaseServiceByName,
  getScheduleConflicts,
  getInvoiceById,
} from "@/lib/supabase/queries";
import {
  invoiceStatusSchema,
  recurringBookingSchema,
  recurringChangeRequestSchema,
  recurringStatusSchema,
  reviewSchema,
  type RecurringBookingValues,
} from "@/lib/recurring-schema";
import {
  bookingStatuses,
  recurringBookingStatuses,
  jobStatuses,
  type BookingStatus,
  type JobStatus,
  payrollStatuses,
  supportPriorities,
  supportTicketStatuses,
  type PayrollStatus,
  type SupportPriority,
  type SupportTicketStatus,
} from "@/lib/types";

export async function createBooking(values: BookingWizardValues) {
  const parsed = bookingWizardSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete all required booking details.");
  }

  const service = getServiceBySlug(parsed.data.serviceSlug);

  if (!service) {
    throw new Error("Selected service is no longer available.");
  }

  const databaseService = await getDatabaseServiceByName(service.name);
  const selectedAddons = getSelectedAddons(service, parsed.data.selectedAddons);
  const bookingReference = createBookingReference();
  const account = await getOptionalCustomer();
  const estimatedTotal = calculateEstimatedTotal(
    service,
    parsed.data.selectedAddons
  );
  const { totalAmount } = calculatePaymentAmount(
    estimatedTotal,
    parsed.data.paymentType
  );

  const booking = {
    booking_reference: bookingReference,
    customer_name: parsed.data.customerName,
    customer_email: parsed.data.customerEmail,
    customer_phone: parsed.data.customerPhone,
    customer_id: account?.customer.id ?? null,
    service_id: databaseService.id,
    address: parsed.data.address,
    suburb: parsed.data.suburb,
    city: parsed.data.city,
    booking_date: parsed.data.bookingDate,
    booking_time: parsed.data.bookingTime,
    scheduled_start_time: toScheduledTimestamp(
      parsed.data.bookingDate,
      parsed.data.bookingTime
    ),
    scheduled_end_time: toScheduledTimestamp(
      parsed.data.bookingDate,
      parsed.data.bookingTime,
      3
    ),
    notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
    service_data: {
      serviceSlug: service.slug,
      serviceName: service.name,
      questions: service.questions.map((question) => ({
        id: question.id,
        label: question.label,
        value: parsed.data.serviceData[question.id],
      })),
    },
    selected_addons: selectedAddons,
    estimated_price: estimatedTotal,
    status: "Pending Payment",
    payment_status: "Pending Payment",
    payment_type: parsed.data.paymentType,
    total_amount: totalAmount,
    amount_paid: 0,
    balance_due: totalAmount,
    can_reschedule: true,
    can_cancel: true,
  };

  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .insert(booking)
    .select("id")
    .single();

  if (error) {
    throw toSupabaseError(error);
  }

  const createdBooking = await getBookingById(String(data.id));

  if (!createdBooking) {
    throw new Error("Booking was created but could not be loaded for payment.");
  }

  const payment = await initializeBookingPayment(
    createdBooking,
    parsed.data.paymentType
  );

  if (account?.customer && parsed.data.saveAddress) {
    await saveBookingAddress(account.customer.id, parsed.data);
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/account");
  revalidatePath("/account/bookings");

  if (account?.customer.user_id) {
    await createNotification({
      userId: account.customer.user_id,
      userRole: "customer",
      title: "New booking received",
      message: `${service.name} is awaiting payment confirmation.`,
      type: "New booking",
    });
  }

  return {
    bookingReference,
    authorizationUrl: payment.authorizationUrl,
  };
}

export async function createRecurringBooking(values: RecurringBookingValues) {
  const { customer } = await requireCustomer("/account/recurring");
  const parsed = recurringBookingSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete all required recurring plan details.");
  }

  const service = getServiceBySlug(parsed.data.serviceSlug);

  if (!service) {
    throw new Error("Selected service is no longer available.");
  }

  const databaseService = await getDatabaseServiceByName(service.name);
  const selectedAddons = getSelectedAddons(service, parsed.data.selectedAddons);
  const estimatedTotal = calculateEstimatedTotal(
    service,
    parsed.data.selectedAddons
  );
  const addressId =
    parsed.data.selectedAddressId ||
    (await saveRecurringAddress(customer.id, parsed.data));

  const { data, error } = await getSupabaseAdmin()
    .from("recurring_bookings")
    .insert({
      customer_id: customer.id,
      service_id: databaseService.id,
      address_id: addressId || null,
      frequency: parsed.data.frequency,
      preferred_day: parsed.data.preferredDay,
      preferred_time: parsed.data.preferredTime,
      service_data: {
        serviceSlug: service.slug,
        serviceName: service.name,
        questions: service.questions.map((question) => ({
          id: question.id,
          label: question.label,
          value: parsed.data.serviceData[question.id],
        })),
      },
      selected_addons: selectedAddons,
      estimated_price: estimatedTotal,
      status: "Active",
      next_booking_date: parsed.data.nextBookingDate,
    })
    .select("id")
    .single();

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account");
  revalidatePath("/account/recurring");
  revalidatePath("/admin/recurring");

  return { id: String(data.id) };
}

export async function signUpCustomer(values: unknown) {
  const parsed = signupSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete all signup details.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user) {
    await ensureCustomerForUser(data.user);
  }

  return { ok: true };
}

export async function loginCustomer(values: unknown) {
  const parsed = authSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Enter your email and password.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function logoutCustomer() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateCustomerProfile(values: ProfileValues) {
  const { customer } = await requireCustomer("/account/profile");
  const parsed = profileSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete your profile details.");
  }

  const { error } = await getSupabaseAdmin()
    .from("customers")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
    })
    .eq("id", customer.id);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account");
  revalidatePath("/account/profile");
}

export async function createCustomerAddress(values: AddressValues) {
  const { customer } = await requireCustomer("/account/addresses");
  const parsed = addressSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete the address details.");
  }

  const { error } = await getSupabaseAdmin()
    .from("customer_addresses")
    .insert(toAddressPayload(customer.id, parsed.data));

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account/addresses");
}

export async function updateCustomerAddress(
  addressId: string,
  values: AddressValues
) {
  const { customer } = await requireCustomer("/account/addresses");
  const parsed = addressSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete the address details.");
  }

  const { error } = await getSupabaseAdmin()
    .from("customer_addresses")
    .update(toAddressPayload(customer.id, parsed.data))
    .eq("id", addressId)
    .eq("customer_id", customer.id);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account/addresses");
}

export async function deleteCustomerAddress(formData: FormData) {
  const { customer } = await requireCustomer("/account/addresses");
  const addressId = getRequiredString(formData, "address_id");

  const { error } = await getSupabaseAdmin()
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", customer.id);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account/addresses");
}

export async function setDefaultCustomerAddress(formData: FormData) {
  const { customer } = await requireCustomer("/account/addresses");
  const addressId = getRequiredString(formData, "address_id");

  const { error } = await getSupabaseAdmin()
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("customer_id", customer.id);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account/addresses");
}

export async function createBookingRequest(values: unknown) {
  const { customer } = await requireCustomer("/account/bookings");
  const parsed = bookingRequestSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete the request details.");
  }

  const booking = await getBookingById(parsed.data.bookingId);

  if (!booking || booking.customer_id !== customer.id) {
    throw new Error("Booking could not be found.");
  }

  if (parsed.data.requestType === "Reschedule" && !booking.can_reschedule) {
    throw new Error("This booking cannot be rescheduled online.");
  }

  if (parsed.data.requestType === "Cancel" && !booking.can_cancel) {
    throw new Error("This booking cannot be cancelled online.");
  }

  const { error } = await getSupabaseAdmin().from("booking_requests").insert({
    booking_id: parsed.data.bookingId,
    customer_id: customer.id,
    request_type: parsed.data.requestType,
    requested_date:
      parsed.data.requestType === "Reschedule" ? parsed.data.requestedDate : null,
    requested_time:
      parsed.data.requestType === "Reschedule" ? parsed.data.requestedTime : null,
    reason: parsed.data.reason,
    request_status: "Pending",
  });

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account");
  revalidatePath("/account/bookings");
  revalidatePath(`/account/bookings/${parsed.data.bookingId}`);
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/bookings/${parsed.data.bookingId}`);
}

export async function updateCustomerRecurringStatus(formData: FormData) {
  const { customer } = await requireCustomer("/account/recurring");
  const parsed = recurringStatusSchema.safeParse({
    recurringBookingId: formData.get("recurring_booking_id"),
    status: formData.get("status"),
  });

  if (!parsed.success || parsed.data.status === "Active") {
    throw new Error("Recurring plan status update is invalid.");
  }

  const { error } = await getSupabaseAdmin()
    .from("recurring_bookings")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.recurringBookingId)
    .eq("customer_id", customer.id);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account/recurring");
  revalidatePath(`/account/recurring/${parsed.data.recurringBookingId}`);
  revalidatePath("/admin/recurring");
}

export async function updateAdminRecurringStatus(formData: FormData) {
  await requireAdmin("/admin/recurring");
  const parsed = recurringStatusSchema.safeParse({
    recurringBookingId: formData.get("recurring_booking_id"),
    status: formData.get("status"),
  });

  if (!parsed.success || !recurringBookingStatuses.includes(parsed.data.status)) {
    throw new Error("Recurring plan status update is invalid.");
  }

  const { error } = await getSupabaseAdmin()
    .from("recurring_bookings")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.recurringBookingId);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/admin/recurring");
  revalidatePath("/account/recurring");
}

export async function requestRecurringPlanChange(formData: FormData) {
  const { customer } = await requireCustomer("/account/recurring");
  const parsed = recurringChangeRequestSchema.safeParse({
    recurringBookingId: formData.get("recurring_booking_id"),
    requestedChanges: formData.get("requested_changes"),
  });

  if (!parsed.success) {
    throw new Error("Please describe the recurring plan change you need.");
  }

  const plan = await getCustomerRecurringBookingById(
    customer.id,
    parsed.data.recurringBookingId
  );

  if (!plan) {
    throw new Error("Recurring plan could not be found.");
  }

  const { error } = await getSupabaseAdmin()
    .from("recurring_plan_change_requests")
    .insert({
      recurring_booking_id: plan.id,
      customer_id: customer.id,
      requested_changes: parsed.data.requestedChanges,
      request_status: "Pending",
    });

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account/recurring");
  revalidatePath(`/account/recurring/${plan.id}`);
  revalidatePath("/admin/recurring");
}

export async function decideBookingRequest(formData: FormData) {
  await requireAdmin("/admin/requests");

  const parsed = adminRequestDecisionSchema.safeParse({
    requestId: formData.get("request_id"),
    decision: formData.get("decision"),
    adminNotes: formData.get("admin_notes"),
  });

  if (!parsed.success) {
    throw new Error("Request decision is invalid.");
  }

  const { data: request, error: requestError } = await getSupabaseAdmin()
    .from("booking_requests")
    .select("id, booking_id, request_type, requested_date, requested_time")
    .eq("id", parsed.data.requestId)
    .single();

  if (requestError) {
    throw toSupabaseError(requestError);
  }

  if (parsed.data.decision === "Approved") {
    if (request.request_type === "Reschedule") {
      const { error } = await getSupabaseAdmin()
        .from("bookings")
        .update({
          booking_date: request.requested_date,
          booking_time: request.requested_time,
        })
        .eq("id", request.booking_id);

      if (error) {
        throw toSupabaseError(error);
      }
    }

    if (request.request_type === "Cancel") {
      const { error } = await getSupabaseAdmin()
        .from("bookings")
        .update({
          status: "Cancelled",
          job_status: "Cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason:
            parsed.data.adminNotes?.trim() ||
            "Customer cancellation request approved.",
          can_reschedule: false,
          can_cancel: false,
        })
        .eq("id", request.booking_id);

      if (error) {
        throw toSupabaseError(error);
      }
    }
  }

  const { error: updateError } = await getSupabaseAdmin()
    .from("booking_requests")
    .update({
      request_status: parsed.data.decision,
      admin_notes: parsed.data.adminNotes?.trim() || null,
    })
    .eq("id", parsed.data.requestId);

  if (updateError) {
    throw toSupabaseError(updateError);
  }

  revalidatePath("/admin/requests");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${request.booking_id}`);
  revalidatePath("/account");
  revalidatePath("/account/bookings");
  revalidatePath(`/account/bookings/${request.booking_id}`);
}

export async function updateBookingStatus(formData: FormData) {
  await requireAdmin("/admin/bookings");
  const bookingId = getRequiredString(formData, "booking_id");
  const status = getRequiredString(formData, "status") as BookingStatus;

  if (!bookingStatuses.includes(status)) {
    throw new Error("Invalid booking status.");
  }

  const update: Record<string, unknown> = { status };

  if (status === "Completed") {
    update.completed_at = new Date().toISOString();
    update.job_status = "Completed";
  }

  if (status === "Cancelled") {
    update.cancelled_at = new Date().toISOString();
    update.job_status = "Cancelled";
    update.can_reschedule = false;
    update.can_cancel = false;
  }

  const { error } = await getSupabaseAdmin()
    .from("bookings")
    .update(update)
    .eq("id", bookingId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);

  if (status === "Completed") {
    await sendCompletedBookingAutomations(bookingId);
    await ensureEarningsForCompletedBooking(bookingId);
  }
}

export async function createCleaner(values: CleanerFormValues) {
  await requireAdmin("/admin/cleaners");
  const parsed = cleanerFormSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete all required cleaner details.");
  }

  const { data, error } = await getSupabaseAdmin()
    .from("cleaners")
    .insert(toCleanerPayload(parsed.data))
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/cleaners");

  return { id: String(data.id) };
}

export async function updateCleaner(cleanerId: string, values: CleanerFormValues) {
  await requireAdmin("/admin/cleaners");
  const parsed = cleanerFormSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete all required cleaner details.");
  }

  const { error } = await getSupabaseAdmin()
    .from("cleaners")
    .update(toCleanerPayload(parsed.data))
    .eq("id", cleanerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/cleaners");
  revalidatePath(`/admin/cleaners/${cleanerId}`);

  return { id: cleanerId };
}

export async function setCleanerActive(formData: FormData) {
  await requireAdmin("/admin/cleaners");
  const cleanerId = getRequiredString(formData, "cleaner_id");
  const active = getRequiredString(formData, "active") === "true";

  const { error } = await getSupabaseAdmin()
    .from("cleaners")
    .update({ active })
    .eq("id", cleanerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/cleaners");
  revalidatePath(`/admin/cleaners/${cleanerId}`);
}

export async function addCleanerAvailability(formData: FormData) {
  const user = await requireUser("/cleaner/availability");
  const parsed = availabilityFormSchema.safeParse({
    cleanerId: formData.get("cleaner_id"),
    availableDate: formData.get("available_date"),
    startTime: formData.get("start_time"),
    endTime: formData.get("end_time"),
    isAvailable: formData.get("is_available"),
  });

  if (!parsed.success) {
    throw new Error("Please enter a valid availability window.");
  }

  const cleanerAccount = await getOptionalCleaner();

  if (!isAdminUser(user) && cleanerAccount?.cleaner.id !== parsed.data.cleanerId) {
    throw new Error("You can only manage your own availability.");
  }

  const { error } = await getSupabaseAdmin()
    .from("cleaner_availability")
    .insert({
      cleaner_id: parsed.data.cleanerId,
      available_date: parsed.data.availableDate,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      is_available: parsed.data.isAvailable,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/cleaners/${parsed.data.cleanerId}`);
  revalidatePath("/cleaner/availability");
}

export async function deleteCleanerAvailability(formData: FormData) {
  const user = await requireUser("/cleaner/availability");
  const cleanerId = getRequiredString(formData, "cleaner_id");
  const availabilityId = getRequiredString(formData, "availability_id");
  const cleanerAccount = await getOptionalCleaner();

  if (!isAdminUser(user) && cleanerAccount?.cleaner.id !== cleanerId) {
    throw new Error("You can only manage your own availability.");
  }

  const { error } = await getSupabaseAdmin()
    .from("cleaner_availability")
    .delete()
    .eq("id", availabilityId)
    .eq("cleaner_id", cleanerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/cleaners/${cleanerId}`);
  revalidatePath("/cleaner/availability");
}

export async function updateBookingJobStatus(formData: FormData) {
  await requireAdmin("/admin/bookings");
  const bookingId = getRequiredString(formData, "booking_id");
  const jobStatus = getRequiredString(formData, "job_status") as JobStatus;

  if (!jobStatuses.includes(jobStatus)) {
    throw new Error("Invalid job status.");
  }

  const update: Record<string, unknown> = { job_status: jobStatus };

  if (jobStatus === "Completed") {
    update.status = "Completed";
    update.completed_at = new Date().toISOString();
  }

  if (jobStatus === "Cancelled") {
    update.status = "Cancelled";
    update.cancelled_at = new Date().toISOString();
  }

  const { error } = await getSupabaseAdmin()
    .from("bookings")
    .update(update)
    .eq("id", bookingId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);

  if (jobStatus === "Completed") {
    await sendCompletedBookingAutomations(bookingId);
    await ensureEarningsForCompletedBooking(bookingId);
  }
}

export async function runAdminAutomationSweepAction() {
  await requireAdmin("/admin/automation");
  await runAutomationSweep();
}

export async function generateRecurringBookingsNowAction() {
  await requireAdmin("/admin/automation");
  await generateDueRecurringBookings();
  revalidatePath("/admin/automation");
  revalidatePath("/admin/recurring");
}

export async function submitCustomerReview(formData: FormData) {
  const { customer } = await requireCustomer("/account/reviews");
  const parsed = reviewSchema.safeParse({
    bookingId: formData.get("booking_id"),
    rating: formData.get("rating"),
    reviewText: formData.get("review_text"),
    public: formData.get("public") === "on",
  });

  if (!parsed.success) {
    throw new Error("Please complete the review form.");
  }

  const booking = await getBookingById(parsed.data.bookingId);

  if (!booking || booking.customer_id !== customer.id) {
    throw new Error("Booking could not be found.");
  }

  if (booking.status !== "Completed") {
    throw new Error("Reviews can only be submitted after completed bookings.");
  }

  const { error } = await getSupabaseAdmin()
    .from("reviews")
    .upsert(
      {
        booking_id: booking.id,
        customer_id: customer.id,
        rating: parsed.data.rating,
        review_text: parsed.data.reviewText,
        public: parsed.data.public,
      },
      { onConflict: "booking_id,customer_id" }
    );

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account/reviews");
  revalidatePath("/admin/reviews");
}

export async function setReviewPublic(formData: FormData) {
  await requireAdmin("/admin/reviews");
  const reviewId = getRequiredString(formData, "review_id");
  const isPublic = getRequiredString(formData, "public") === "true";

  const { error } = await getSupabaseAdmin()
    .from("reviews")
    .update({ public: isPublic })
    .eq("id", reviewId);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/account/reviews");
}

export async function generateInvoiceForBookingAction(formData: FormData) {
  await requireAdmin("/admin/invoices");
  const bookingId = getRequiredString(formData, "booking_id");
  await generateInvoiceForBooking(bookingId);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function sendInvoiceAction(formData: FormData) {
  await requireAdmin("/admin/invoices");
  const invoiceId = getRequiredString(formData, "invoice_id");
  const invoice = await getInvoiceById(invoiceId);

  if (!invoice) {
    throw new Error("Invoice could not be found.");
  }

  await sendInvoiceAndLog(invoice);
}

export async function updateInvoiceStatusAction(formData: FormData) {
  await requireAdmin("/admin/invoices");
  const parsed = invoiceStatusSchema.safeParse({
    invoiceId: formData.get("invoice_id"),
    invoiceStatus: formData.get("invoice_status"),
  });

  if (!parsed.success) {
    throw new Error("Invoice status update is invalid.");
  }

  await updateInvoiceStatus(parsed.data.invoiceId, parsed.data.invoiceStatus);
}

export async function assignCleanerToBooking(formData: FormData) {
  await requireAdmin("/admin/bookings");
  const bookingId = getRequiredString(formData, "booking_id");
  const cleanerId = getRequiredString(formData, "cleaner_id");
  const currentCleanerId = getOptionalString(formData, "current_cleaner_id");
  const manualOverride = formData.get("manual_override") === "on";
  const assignmentStatus = currentCleanerId ? "Reassigned" : "Assigned";
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking could not be found.");
  }

  const conflicts = await getScheduleConflicts(booking, cleanerId);

  if (!conflicts) {
    throw new Error("Cleaner could not be found.");
  }

  if ((conflicts.inactive || conflicts.outsideAvailability) && !manualOverride) {
    throw new Error("Cleaner is inactive or outside availability. Use manual override to assign anyway.");
  }

  if (conflicts.overlappingBookings.length && !manualOverride) {
    throw new Error("Cleaner already has an overlapping job. Use manual override to assign anyway.");
  }

  const { error: bookingError } = await getSupabaseAdmin()
    .from("bookings")
    .update({
      assigned_cleaner_id: cleanerId,
      job_status: "Assigned",
    })
    .eq("id", bookingId);

  if (bookingError) {
    throw new Error(bookingError.message);
  }

  const { error: assignmentError } = await getSupabaseAdmin()
    .from("booking_assignments")
    .insert({
      booking_id: bookingId,
      cleaner_id: cleanerId,
      assignment_status: assignmentStatus,
    });

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/schedule");
  revalidatePath("/cleaner/jobs");

  await Promise.all([
    conflicts.cleaner.user_id
      ? createNotification({
          userId: conflicts.cleaner.user_id,
          userRole: "cleaner",
          title: "New job assigned",
          message: `${booking.service_name} on ${booking.booking_date} at ${booking.booking_time.slice(0, 5)}.`,
          type: "Cleaner assigned",
        })
      : Promise.resolve(),
    booking.customer_id
      ? createCustomerNotification(booking.customer_id, {
          title: "Cleaner assigned",
          message: `${conflicts.cleaner.full_name} has been assigned to your booking.`,
          type: "Cleaner assigned",
        })
      : Promise.resolve(),
  ]);
}

export async function removeCleanerAssignment(formData: FormData) {
  await requireAdmin("/admin/bookings");
  const bookingId = getRequiredString(formData, "booking_id");
  const currentCleanerId = getRequiredString(formData, "current_cleaner_id");

  const { error: bookingError } = await getSupabaseAdmin()
    .from("bookings")
    .update({
      assigned_cleaner_id: null,
      job_status: "Not Assigned",
    })
    .eq("id", bookingId);

  if (bookingError) {
    throw new Error(bookingError.message);
  }

  const { error: assignmentError } = await getSupabaseAdmin()
    .from("booking_assignments")
    .insert({
      booking_id: bookingId,
      cleaner_id: currentCleanerId,
      assignment_status: "Cancelled",
    });

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function updateCleanerJobWorkflow(formData: FormData) {
  const { cleaner } = await requireCleaner("/cleaner/jobs");
  const bookingId = getRequiredString(formData, "booking_id");
  const jobStatus = getRequiredString(formData, "job_status") as JobStatus;

  if (!jobStatuses.includes(jobStatus) || jobStatus === "Not Assigned") {
    throw new Error("Invalid cleaner job status.");
  }

  const booking = await getCleanerBookingById(cleaner.id, bookingId);

  if (!booking) {
    throw new Error("Job could not be found.");
  }

  const update: Record<string, unknown> = { job_status: jobStatus };

  if (jobStatus === "Completed") {
    update.status = "Completed";
    update.completed_at = new Date().toISOString();
  }

  if (jobStatus === "Declined") {
    update.assigned_cleaner_id = null;
  }

  const { error } = await getSupabaseAdmin()
    .from("bookings")
    .update(update)
    .eq("id", bookingId)
    .eq("assigned_cleaner_id", cleaner.id);

  if (error) {
    throw toSupabaseError(error);
  }

  if (jobStatus === "Declined") {
    await getSupabaseAdmin().from("booking_assignments").insert({
      booking_id: bookingId,
      cleaner_id: cleaner.id,
      assignment_status: "Cancelled",
    });
  }

  if (jobStatus === "Completed") {
    await sendCompletedBookingAutomations(bookingId);
    await ensureEarningsForCompletedBooking(bookingId);
  }

  if (booking.customer_id) {
    await createCustomerNotification(booking.customer_id, {
      title: `Job ${jobStatus.toLowerCase()}`,
      message: `${cleaner.full_name} updated your ${booking.service_name} booking.`,
      type: jobStatus === "Completed" ? "Job completed" : "Job accepted",
    });
  }

  revalidatePath("/cleaner");
  revalidatePath("/cleaner/jobs");
  revalidatePath(`/cleaner/jobs/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function createSupportTicket(formData: FormData) {
  const { user, customer } = await requireCustomer("/account/support");
  const bookingId = getOptionalString(formData, "booking_id");
  const subject = getRequiredString(formData, "subject");
  const message = getRequiredString(formData, "message");
  const priority = normaliseSupportPriority(formData.get("priority"));

  if (bookingId) {
    const booking = await getBookingById(bookingId);

    if (!booking || booking.customer_id !== customer.id) {
      throw new Error("Booking could not be found for this customer.");
    }
  }

  const { data, error } = await getSupabaseAdmin()
    .from("support_tickets")
    .insert({
      customer_id: customer.id,
      booking_id: bookingId,
      subject,
      message,
      priority,
      status: "Open",
    })
    .select("id")
    .single();

  if (error) {
    throw toSupabaseError(error);
  }

  const { error: messageError } = await getSupabaseAdmin().from("support_messages").insert({
    ticket_id: data.id,
    sender_id: user.id,
    sender_role: "customer",
    message,
  });

  if (messageError) {
    throw toSupabaseError(messageError);
  }

  revalidatePath("/account/support");
  revalidatePath("/admin/support");
}

export async function addSupportMessage(formData: FormData) {
  const ticketId = getRequiredString(formData, "ticket_id");
  const message = getRequiredString(formData, "message");
  const senderRole = getRequiredString(formData, "sender_role");
  const ticket = await getSupportTicketIdentity(ticketId);

  if (!ticket) {
    throw new Error("Support ticket could not be found.");
  }

  let senderId: string;

  if (senderRole === "admin") {
    const user = await requireAdmin("/admin/support");
    senderId = user.id;
  } else if (senderRole === "customer") {
    const { user, customer } = await requireCustomer("/account/support");

    if (ticket.customer_id !== customer.id) {
      throw new Error("Support ticket could not be found for this customer.");
    }

    senderId = user.id;
  } else {
    throw new Error("Invalid support sender role.");
  }

  const { error } = await getSupabaseAdmin().from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: senderId,
    sender_role: senderRole === "admin" ? "admin" : "customer",
    message,
  });

  if (error) {
    throw toSupabaseError(error);
  }

  await getSupabaseAdmin()
    .from("support_tickets")
    .update({
      status: senderRole === "admin" ? "Waiting For Customer" : "In Progress",
    })
    .eq("id", ticketId);

  revalidatePath("/account/support");
  revalidatePath("/admin/support");

  if (senderRole === "admin" && ticket.customer_id) {
    await createCustomerNotification(ticket.customer_id, {
      title: "Support ticket update",
      message: `Shalean replied to "${ticket.subject}".`,
      type: "Support ticket update",
    });
  }
}

export async function updateSupportTicketStatus(formData: FormData) {
  await requireAdmin("/admin/support");
  const ticketId = getRequiredString(formData, "ticket_id");
  const status = normaliseSupportStatus(formData.get("status"));
  const priority = normaliseSupportPriority(formData.get("priority"));
  const ticket = await getSupportTicketIdentity(ticketId);

  if (!ticket) {
    throw new Error("Support ticket could not be found.");
  }

  const { error } = await getSupabaseAdmin()
    .from("support_tickets")
    .update({ status, priority })
    .eq("id", ticketId);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/admin/support");
  revalidatePath("/account/support");

  if (ticket.customer_id) {
    await createCustomerNotification(ticket.customer_id, {
      title: "Support ticket update",
      message: `"${ticket.subject}" is now ${status} priority ${priority}.`,
      type: "Support ticket update",
    });
  }
}

export async function upsertPayrollRecord(formData: FormData) {
  await requireAdmin("/admin/payroll");
  const cleanerId = getRequiredString(formData, "cleaner_id");
  const bookingId = getOptionalString(formData, "booking_id");
  const amount = getNumber(formData, "amount");
  const bonus = getNumber(formData, "bonus");
  const deduction = getNumber(formData, "deduction");
  const status = normalisePayrollStatus(formData.get("status"));
  const payload = {
    cleaner_id: cleanerId,
    booking_id: bookingId,
    amount,
    bonus,
    deduction,
    status,
    paid_at: status === "Paid" ? new Date().toISOString() : null,
  };

  const { error } = bookingId
    ? await getSupabaseAdmin()
        .from("payroll_records")
        .upsert(payload, { onConflict: "booking_id,cleaner_id" })
    : await getSupabaseAdmin().from("payroll_records").insert(payload);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/admin/payroll");
  revalidatePath("/cleaner/earnings");
}

export async function updatePayrollStatus(formData: FormData) {
  await requireAdmin("/admin/payroll");
  const payrollId = getRequiredString(formData, "payroll_id");
  const status = normalisePayrollStatus(formData.get("status"));

  const { error } = await getSupabaseAdmin()
    .from("payroll_records")
    .update({
      status,
      paid_at: status === "Paid" ? new Date().toISOString() : null,
    })
    .eq("id", payrollId);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/admin/payroll");
  revalidatePath("/cleaner/earnings");
}

export async function updatePlatformSetting(formData: FormData) {
  await requireAdmin("/admin/settings");
  const settingKey = getRequiredString(formData, "setting_key");
  const rawValue = getRequiredString(formData, "setting_value");
  let settingValue: Record<string, unknown>;

  try {
    settingValue = JSON.parse(rawValue) as Record<string, unknown>;
  } catch {
    throw new Error("Setting value must be valid JSON.");
  }

  const { error } = await getSupabaseAdmin()
    .from("platform_settings")
    .upsert(
      {
        setting_key: settingKey,
        setting_value: settingValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    );

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/admin/settings");
}

export async function markNotificationRead(formData: FormData) {
  const user = await requireUser("/account");
  const notificationId = getRequiredString(formData, "notification_id");

  const { error } = await getSupabaseAdmin()
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account");
  revalidatePath("/cleaner");
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

async function saveBookingAddress(
  customerId: string,
  values: BookingWizardValues
) {
  const hasExistingAddress = Boolean(values.selectedAddressId);

  if (hasExistingAddress) {
    return;
  }

  const label = values.addressLabel?.trim() || "Booking address";
  const { error } = await getSupabaseAdmin().from("customer_addresses").insert({
    customer_id: customerId,
    label,
    address: values.address,
    suburb: values.suburb,
    city: values.city,
    access_instructions: values.accessInstructions?.trim() || null,
    gate_code: values.gateCode?.trim() || null,
    parking_instructions: values.parkingInstructions?.trim() || null,
    is_default: false,
  });

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account/addresses");
}

async function saveRecurringAddress(
  customerId: string,
  values: RecurringBookingValues
) {
  if (values.selectedAddressId) {
    return values.selectedAddressId;
  }

  if (!values.saveAddress) {
    const { data, error } = await getSupabaseAdmin()
      .from("customer_addresses")
      .insert({
        customer_id: customerId,
        label: values.addressLabel?.trim() || "Recurring plan address",
        address: values.address,
        suburb: values.suburb,
        city: values.city,
        access_instructions: values.accessInstructions?.trim() || null,
        gate_code: values.gateCode?.trim() || null,
        parking_instructions: values.parkingInstructions?.trim() || null,
        is_default: false,
      })
      .select("id")
      .single();

    if (error) {
      throw toSupabaseError(error);
    }

    return String(data.id);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("customer_addresses")
    .insert({
      customer_id: customerId,
      label: values.addressLabel?.trim() || "Recurring plan address",
      address: values.address,
      suburb: values.suburb,
      city: values.city,
      access_instructions: values.accessInstructions?.trim() || null,
      gate_code: values.gateCode?.trim() || null,
      parking_instructions: values.parkingInstructions?.trim() || null,
      is_default: false,
    })
    .select("id")
    .single();

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/account/addresses");
  return String(data.id);
}

function toAddressPayload(customerId: string, values: AddressValues) {
  return {
    customer_id: customerId,
    label: values.label,
    address: values.address,
    suburb: values.suburb,
    city: values.city,
    access_instructions: values.accessInstructions?.trim() || null,
    gate_code: values.gateCode?.trim() || null,
    parking_instructions: values.parkingInstructions?.trim() || null,
    is_default: values.isDefault,
  };
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
}

function getNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${key} must be a positive number.`);
  }

  return value;
}

function toCleanerPayload(values: CleanerFormValues) {
  return {
    full_name: values.fullName,
    email: values.email,
    phone: values.phone,
    profile_photo: values.profilePhoto || null,
    bio: values.bio || null,
    specialties: values.specialties,
    rating: values.rating,
    completed_jobs: values.completedJobs,
    active: values.active,
  };
}

function toScheduledTimestamp(date: string, time: string, addHours = 0) {
  const scheduled = new Date(`${date}T${time.slice(0, 5)}:00`);
  scheduled.setHours(scheduled.getHours() + addHours);
  return scheduled.toISOString();
}

async function ensureEarningsForCompletedBooking(bookingId: string) {
  const booking = await getBookingById(bookingId);

  if (!booking?.assigned_cleaner_id) {
    return;
  }

  const settings = await getSupabaseAdmin()
    .from("platform_settings")
    .select("setting_value")
    .eq("setting_key", "payroll")
    .maybeSingle();
  const configuredPercentage =
    settings.data?.setting_value &&
    typeof settings.data.setting_value === "object" &&
    "defaultCleanerPercentage" in settings.data.setting_value
      ? Number(
          (settings.data.setting_value as Record<string, unknown>)
            .defaultCleanerPercentage
        )
      : 65;
  const cleanerPercentage = Number.isFinite(configuredPercentage)
    ? configuredPercentage
    : 65;
  const grossAmount = booking.total_amount;
  const netAmount = Math.round(grossAmount * cleanerPercentage) / 100;
  const platformFee = Math.max(grossAmount - netAmount, 0);

  const { error: earningError } = await getSupabaseAdmin()
    .from("cleaner_earnings")
    .upsert(
      {
        cleaner_id: booking.assigned_cleaner_id,
        booking_id: booking.id,
        gross_amount: grossAmount,
        platform_fee: platformFee,
        net_amount: netAmount,
        status: "Pending",
      },
      { onConflict: "booking_id,cleaner_id" }
    );

  if (earningError) {
    throw toSupabaseError(earningError);
  }

  const { error: payrollError } = await getSupabaseAdmin()
    .from("payroll_records")
    .upsert(
      {
        cleaner_id: booking.assigned_cleaner_id,
        booking_id: booking.id,
        amount: netAmount,
        bonus: 0,
        deduction: 0,
        status: "Pending",
      },
      { onConflict: "booking_id,cleaner_id" }
    );

  if (payrollError) {
    throw toSupabaseError(payrollError);
  }
}

async function getSupportTicketIdentity(ticketId: string): Promise<{
  customer_id: string | null;
  subject: string;
} | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("support_tickets")
    .select("customer_id, subject")
    .eq("id", ticketId)
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  if (!data) {
    return null;
  }

  return {
    customer_id: typeof data.customer_id === "string" ? data.customer_id : null,
    subject: String(data.subject ?? "Support ticket"),
  };
}

async function createCustomerNotification(
  customerId: string,
  notification: { title: string; message: string; type: string }
) {
  const { data, error } = await getSupabaseAdmin()
    .from("customers")
    .select("user_id")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  if (!data?.user_id) {
    return;
  }

  await createNotification({
    userId: String(data.user_id),
    userRole: "customer",
    ...notification,
  });
}

async function createNotification({
  userId,
  userRole,
  title,
  message,
  type,
}: {
  userId: string;
  userRole: "customer" | "cleaner" | "admin";
  title: string;
  message: string;
  type: string;
}) {
  const { error } = await getSupabaseAdmin().from("notifications").insert({
    user_id: userId,
    user_role: userRole,
    title,
    message,
    notification_type: type,
  });

  if (error) {
    throw toSupabaseError(error);
  }
}

function normaliseSupportStatus(value: FormDataEntryValue | null): SupportTicketStatus {
  const status = String(value ?? "Open") as SupportTicketStatus;

  if (!supportTicketStatuses.includes(status)) {
    throw new Error("Invalid support ticket status.");
  }

  return status;
}

function normaliseSupportPriority(value: FormDataEntryValue | null): SupportPriority {
  const priority = String(value ?? "Medium") as SupportPriority;

  if (!supportPriorities.includes(priority)) {
    throw new Error("Invalid support priority.");
  }

  return priority;
}

function normalisePayrollStatus(value: FormDataEntryValue | null): PayrollStatus {
  const status = String(value ?? "Pending") as PayrollStatus;

  if (!payrollStatuses.includes(status)) {
    throw new Error("Invalid payroll status.");
  }

  return status;
}

function createBookingReference() {
  const randomSegment = Math.random().toString(36).slice(2, 7).toUpperCase();
  const timeSegment = Date.now().toString(36).toUpperCase();

  return `SHL-${timeSegment}-${randomSegment}`;
}
