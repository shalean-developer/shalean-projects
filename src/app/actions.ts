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
import type { ServiceConfig, ServiceQuestion } from "@/config/services";
import { bookingWizardSchema, type BookingWizardValues } from "@/lib/booking-schema";
import {
  generateInvoiceForBooking,
  generateInvoiceForBookings,
  generateMonthlyInvoiceForCustomer,
  initializeInvoicePayment,
  sendInvoiceAndLog,
  updateInvoiceStatus,
} from "@/lib/invoices";
import {
  cleanerAuthEmailFromPhone,
  isPhoneLoginIdentifier,
  normalizeSouthAfricanPhone,
} from "@/lib/phone-auth";
import { calculatePaymentAmount } from "@/lib/paystack";
import { initializeBookingPayment } from "@/lib/payments";
import {
  availabilityFormSchema,
  cleanerFormSchema,
  type CleanerFormValues,
} from "@/lib/cleaner-schema";
import {
  calculateBookingPricing,
  calculateEstimatedTotal,
  getSelectedAddons,
  type PricingBreakdown,
} from "@/lib/pricing";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toSupabaseError } from "@/lib/supabase/errors";
import {
  getBookingById,
  getCleanerById,
  getCleanerBookingById,
  getCustomerRecurringBookingById,
  getCleanerDateAvailability,
  getServiceConfigBySlug,
  getScheduleConflicts,
  getInvoiceById,
} from "@/lib/supabase/queries";
import {
  invoiceStatusSchema,
  getRecurringPreferredDayLabel,
  recurringBookingSchema,
  recurringChangeRequestSchema,
  recurringStatusSchema,
  reviewSchema,
  type RecurringBookingValues,
} from "@/lib/recurring-schema";
import {
  formatPreferredDays,
  getFirstRecurringDate,
  normalizeRecurringFrequency,
  weekdayNameFromDate,
} from "@/lib/recurring-schedule";
import {
  bookingStatuses,
  recurringBookingStatuses,
  jobStatuses,
  type BookingWithService,
  type BookingStatus,
  type Cleaner,
  type JobStatus,
  type PaymentType,
  payrollStatuses,
  supportPriorities,
  supportTicketStatuses,
  type PayrollStatus,
  type SupportPriority,
  type SupportTicketStatus,
} from "@/lib/types";

type RecurringPaymentSetup = {
  frequency: "Weekly" | "Bi-weekly" | "Monthly";
  preferredDay: string;
  preferredTime: string;
  firstBookingDate: string;
  addressId: string | null;
};

type PendingBookingInput = {
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerId: string | null;
  serviceId: string;
  address: string;
  suburb: string;
  city: string;
  bookingDate: string;
  bookingTime: string;
  notes: string | null;
  service: ServiceConfig;
  serviceData: Record<string, string | number>;
  selectedAddons: ReturnType<typeof getSelectedAddons>;
  estimatedTotal: number;
  pricingBreakdown: PricingBreakdown;
  paymentType: PaymentType;
  cleanerSelectionType?: "auto" | "preferred";
  numberOfCleaners?: number;
  preferredCleaner?: {
    preferredCleanerId: string;
    preferredCleanerName: string;
  };
  recurringSetup?: RecurringPaymentSetup;
};

export async function createBooking(values: BookingWizardValues) {
  const parsed = bookingWizardSchema.safeParse({
    ...values,
    recurringPreferredDays: values.recurringPreferredDays ?? ["Monday"],
  });

  if (!parsed.success) {
    throw new Error("Please complete all required booking details.");
  }

  const service = await getServiceConfigBySlug(parsed.data.serviceSlug);

  if (!service) {
    throw new Error("Selected service is no longer available.");
  }

  validateServiceInput(service, parsed.data.serviceData, parsed.data.selectedAddons);
  const selectedAddons = getSelectedAddons(service, parsed.data.selectedAddons);
  const bookingReference = createBookingReference();
  const account = await getOptionalCustomer();
  const recurringFrequency = getBookingRecurringFrequency(parsed.data);
  const pricingBreakdown = calculateBookingPricing(
    service,
    parsed.data.selectedAddons,
    parsed.data.serviceData
  );
  const estimatedTotal = calculateEstimatedTotal(
    service,
    parsed.data.selectedAddons,
    parsed.data.serviceData
  );
  const { totalAmount } = calculatePaymentAmount(
    estimatedTotal,
    parsed.data.paymentType
  );
  const cleanerSelectionType = parsed.data.cleanerSelectionType ?? "auto";
  const customerCanChooseCleaners = canCustomerChooseCleaners(service.name);
  const numberOfCleaners = customerCanChooseCleaners
    ? clampCleanerCount(parsed.data.numberOfCleaners)
    : 1;
  const preferredCleaner =
    customerCanChooseCleaners && cleanerSelectionType === "preferred"
      ? {
          preferredCleanerId: parsed.data.preferredCleanerId?.trim() ?? "",
          preferredCleanerName: parsed.data.preferredCleanerName?.trim() ?? "",
        }
      : {
          preferredCleanerId: "",
          preferredCleanerName: "",
        };

  if (preferredCleaner.preferredCleanerId) {
    await assertPreferredCleanerAvailable({
      serviceName: service.name,
      bookingDate: parsed.data.bookingDate,
      bookingTime: parsed.data.bookingTime,
      cleanerId: preferredCleaner.preferredCleanerId,
    });
  }

  if (recurringFrequency) {
    if (!account?.customer) {
      throw new Error("Please log in before creating a recurring cleaning plan.");
    }

    const addressId = await saveRecurringAddressFromBooking(
      account.customer.id,
      parsed.data
    );
    const preferredDay =
      recurringFrequency === "Weekly"
        ? formatPreferredDays(parsed.data.recurringPreferredDays)
        : weekdayNameFromDate(parsed.data.bookingDate);
    const firstBookingDate = getFirstRecurringDate(
      parsed.data.bookingDate,
      recurringFrequency,
      preferredDay
    );
    const createdBooking = await createPendingBookingForPayment({
      bookingReference,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      customerId: account.customer.id,
      serviceId: service.id,
      address: parsed.data.address,
      suburb: parsed.data.suburb,
      city: parsed.data.city,
      bookingDate: firstBookingDate,
      bookingTime: parsed.data.bookingTime,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
      service,
      serviceData: parsed.data.serviceData,
      selectedAddons,
      estimatedTotal,
      pricingBreakdown,
      paymentType: parsed.data.paymentType,
      cleanerSelectionType: customerCanChooseCleaners ? cleanerSelectionType : "auto",
      numberOfCleaners,
      preferredCleaner,
      recurringSetup: {
        frequency: recurringFrequency,
        preferredDay,
        preferredTime: parsed.data.bookingTime,
        firstBookingDate,
        addressId,
      },
    });
    const payment = await initializeBookingPayment(
      createdBooking,
      parsed.data.paymentType
    );

    revalidatePath("/account");
    revalidatePath("/account/bookings");
    revalidatePath("/admin/bookings");

    if (account.customer.user_id) {
      await createNotification({
        userId: account.customer.user_id,
        userRole: "customer",
        title: "Recurring payment started",
        message: `${service.name} will repeat ${recurringFrequency.toLowerCase()} after Paystack confirms payment.`,
        type: "New booking",
      });
    }

    return {
      bookingReference,
      authorizationUrl: payment.authorizationUrl,
      recurringPlanUrl: "",
    };
  }

  const booking = {
    booking_reference: bookingReference,
    customer_name: parsed.data.customerName,
    customer_email: parsed.data.customerEmail,
    customer_phone: parsed.data.customerPhone,
    customer_id: account?.customer.id ?? null,
    service_id: service.id,
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
      pricingBreakdown,
      cleanerSelectionType: customerCanChooseCleaners ? cleanerSelectionType : "auto",
      numberOfCleaners,
      ...preferredCleaner,
      questions: service.questions.map((question) => ({
        id: question.id,
        label: question.label,
        value: parsed.data.serviceData[question.id],
      })),
    },
    selected_addons: selectedAddons,
    estimated_price: estimatedTotal,
    number_of_cleaners: numberOfCleaners,
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
    recurringPlanUrl: "",
  };
}

export async function createRecurringBooking(values: RecurringBookingValues) {
  const { customer } = await requireCustomer("/account/recurring");
  const parsed = recurringBookingSchema.safeParse({
    ...values,
    preferredDays: values.preferredDays ?? ["Monday"],
  });

  if (!parsed.success) {
    throw new Error("Please complete all required recurring plan details.");
  }

  const service = await getServiceConfigBySlug(parsed.data.serviceSlug);

  if (!service) {
    throw new Error("Selected service is no longer available.");
  }

  validateServiceInput(service, parsed.data.serviceData, parsed.data.selectedAddons);
  const selectedAddons = getSelectedAddons(service, parsed.data.selectedAddons);
  const pricingBreakdown = calculateBookingPricing(
    service,
    parsed.data.selectedAddons,
    parsed.data.serviceData
  );
  const estimatedTotal = calculateEstimatedTotal(
    service,
    parsed.data.selectedAddons,
    parsed.data.serviceData
  );
  const addressId =
    parsed.data.selectedAddressId ||
    (await saveRecurringAddress(customer.id, parsed.data));

  const preferredDay = getRecurringPreferredDayLabel(parsed.data);
  const firstBookingDate = getFirstRecurringDate(
    parsed.data.nextBookingDate,
    parsed.data.frequency,
    preferredDay
  );
  const bookingReference = createBookingReference();
  const createdBooking = await createPendingBookingForPayment({
    bookingReference,
    customerName: customer.full_name,
    customerEmail: customer.email,
    customerPhone: customer.phone ?? "",
    customerId: customer.id,
    serviceId: service.id,
    address: parsed.data.address,
    suburb: parsed.data.suburb,
    city: parsed.data.city,
    bookingDate: firstBookingDate,
    bookingTime: parsed.data.preferredTime,
    notes: "Recurring cleaning plan setup.",
    service,
    serviceData: parsed.data.serviceData,
    selectedAddons,
    estimatedTotal,
    pricingBreakdown,
    paymentType: parsed.data.paymentType,
    recurringSetup: {
      frequency: parsed.data.frequency,
      preferredDay,
      preferredTime: parsed.data.preferredTime,
      firstBookingDate,
      addressId: addressId || null,
    },
  });
  const payment = await initializeBookingPayment(
    createdBooking,
    parsed.data.paymentType
  );

  revalidatePath("/account");
  revalidatePath("/account/bookings");
  revalidatePath("/admin/bookings");

  return {
    id: "",
    bookingReference,
    authorizationUrl: payment.authorizationUrl,
  };
}

export async function signUpCustomer(values: unknown) {
  const parsed = signupSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete all signup details.");
  }

  const supabase = await createSupabaseServerClient();
  const phone = normalizeSouthAfricanPhone(parsed.data.phone);

  if (!phone) {
    throw new Error("Enter a valid South African phone number.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone,
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
  const email = isPhoneLoginIdentifier(parsed.data.email)
    ? cleanerAuthEmailFromPhone(parsed.data.email)
    : parsed.data.email.trim();

  if (!email) {
    throw new Error("Enter a valid phone number or email address.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
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
      phone: normalizeSouthAfricanPhone(parsed.data.phone),
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
    await ensureEarningsForBooking(bookingId);
  }
}

export async function createAdminDraftBooking(formData: FormData) {
  await requireAdmin("/admin/bookings/new");
  const customerId = getRequiredString(formData, "customer_id");
  const serviceSlug = getRequiredString(formData, "service_slug");
  const bookingDate = getRequiredString(formData, "booking_date");
  const bookingTime = getRequiredString(formData, "booking_time");
  const address = getRequiredString(formData, "address");
  const suburb = getRequiredString(formData, "suburb");
  const city = getRequiredString(formData, "city");
  const status = getRequiredString(formData, "status") as BookingStatus;

  if (status !== "Draft" && status !== "Pending Invoice" && status !== "Confirmed") {
    throw new Error("Admin-created bookings must start as Draft, Pending Invoice, or Confirmed.");
  }

  const [service, customerResult] = await Promise.all([
    getServiceConfigBySlug(serviceSlug, { includeInactive: true }),
    getSupabaseAdmin()
      .from("customers")
      .select("id, full_name, email, phone")
      .eq("id", customerId)
      .single(),
  ]);

  if (!service) {
    throw new Error("Selected service is no longer available.");
  }

  if (customerResult.error) {
    throw toSupabaseError(customerResult.error);
  }

  const serviceData = buildAdminBookingServiceData(service, formData);
  const selectedAddonIds = formData
    .getAll("selected_addons")
    .filter((value): value is string => typeof value === "string");
  validateServiceInput(service, serviceData, selectedAddonIds);
  const selectedAddons = getSelectedAddons(service, selectedAddonIds);
  const estimatedTotal =
    getNumber(formData, "total_amount") ||
    calculateEstimatedTotal(service, selectedAddonIds, serviceData);
  const pricingBreakdown = calculateBookingPricing(
    service,
    selectedAddonIds,
    serviceData
  );
  const bookingReference = createBookingReference();
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .insert({
      booking_reference: bookingReference,
      customer_name: String(customerResult.data.full_name ?? ""),
      customer_email: String(customerResult.data.email ?? ""),
      customer_phone: String(customerResult.data.phone ?? ""),
      customer_id: customerId,
      service_id: service.id,
      address,
      suburb,
      city,
      booking_date: bookingDate,
      booking_time: bookingTime,
      scheduled_start_time: toScheduledTimestamp(bookingDate, bookingTime),
      scheduled_end_time: toScheduledTimestamp(bookingDate, bookingTime, 3),
      notes: getOptionalString(formData, "notes"),
      service_data: {
        serviceSlug: service.slug,
        serviceName: service.name,
        pricingBreakdown,
        cleanerSelectionType: "auto",
        numberOfCleaners: clampCleanerCount(getNumber(formData, "number_of_cleaners") || 1),
        questions: service.questions.map((question) => ({
          id: question.id,
          label: question.label,
          value: serviceData[question.id] ?? "",
        })),
      },
      selected_addons: selectedAddons,
      estimated_price: estimatedTotal,
      number_of_cleaners: clampCleanerCount(getNumber(formData, "number_of_cleaners") || 1),
      status,
      payment_status: status === "Confirmed" ? "Pending Payment" : "Pending Payment",
      payment_type: null,
      total_amount: estimatedTotal,
      amount_paid: 0,
      balance_due: estimatedTotal,
      admin_created: true,
      can_reschedule: false,
      can_cancel: false,
    })
    .select("id")
    .single();

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/admin/bookings");
  redirect(`/admin/bookings/${String(data.id)}`);
}

export async function createCleaner(values: CleanerFormValues) {
  await requireAdmin("/admin/cleaners");
  const parsed = cleanerFormSchema.safeParse(values);

  if (!parsed.success) {
    throw new Error("Please complete all required cleaner details.");
  }

  await assertCleanerPhoneIsUnique(parsed.data.phone);

  const payload = toCleanerPayload(parsed.data);
  const authUserId = await upsertCleanerAuthUser({
    email: String(payload.email),
    phone: String(payload.phone),
    fullName: parsed.data.fullName,
    password: parsed.data.password,
  });

  const { data, error } = await getSupabaseAdmin()
    .from("cleaners")
    .insert({
      ...payload,
      ...(authUserId ? { user_id: authUserId } : {}),
    })
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

  await assertCleanerPhoneIsUnique(parsed.data.phone, cleanerId);

  const payload = toCleanerPayload(parsed.data);
  const existing = await getCleanerById(cleanerId);
  const authUserId = await upsertCleanerAuthUser({
    email: String(payload.email),
    phone: String(payload.phone),
    fullName: parsed.data.fullName,
    password: parsed.data.password,
    userId: existing?.user_id ?? undefined,
  });

  const { error } = await getSupabaseAdmin()
    .from("cleaners")
    .update({
      ...payload,
      ...(authUserId ? { user_id: authUserId } : {}),
    })
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
    await ensureEarningsForBooking(bookingId);
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

export async function generateMonthlyInvoiceAction(formData: FormData) {
  await requireAdmin("/admin/invoices");
  const customerId = getRequiredString(formData, "customer_id");
  const month = getRequiredString(formData, "month");
  const dueDate = getRequiredString(formData, "due_date");
  const send = formData.get("send_invoice") === "on";

  const invoice = await generateMonthlyInvoiceForCustomer({
    customerId,
    month,
    dueDate,
    send,
  });

  if (!invoice) {
    throw new Error("No unpaid bookings were found for this customer and month.");
  }

  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${invoice.id}`);
}

export async function generateSelectedBookingsInvoiceAction(formData: FormData) {
  await requireAdmin("/admin/invoices");
  const dueDate = getRequiredString(formData, "due_date");
  const bookingIds = formData
    .getAll("booking_ids")
    .filter((value): value is string => typeof value === "string");
  const invoice = await generateInvoiceForBookings({
    bookingIds,
    dueDate,
    send: true,
  });

  if (!invoice) {
    throw new Error("Invoice could not be created.");
  }

  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${invoice.id}`);
}

export async function initializeInvoicePaymentAction(formData: FormData) {
  const invoiceId = getRequiredString(formData, "invoice_id");
  await initializeInvoicePayment(invoiceId);
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
  const manualOverride = formData.get("manual_override") === "on";
  const isTeamLeader = formData.get("is_team_leader") === "on";
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking could not be found.");
  }
  const alreadyAssigned = booking.assignments.some(
    (assignment) =>
      assignment.cleaner_id === cleanerId &&
      assignment.assignment_status !== "Cancelled"
  );

  if (alreadyAssigned) {
    throw new Error("This cleaner is already assigned to the booking.");
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

  if (conflicts.sameDateBookings.length) {
    throw new Error("Cleaner already has a booking on this date and cannot be double-booked.");
  }

  const { error: bookingError } = await getSupabaseAdmin()
    .from("bookings")
    .update({
      assigned_cleaner_id: booking.assigned_cleaner_id ?? cleanerId,
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
      assignment_status: booking.assignments.length ? "Reassigned" : "Assigned",
      is_team_leader: isTeamLeader,
    });

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/schedule");
  revalidatePath("/cleaner/jobs");
  await ensureEarningsForBooking(bookingId);

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
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking could not be found.");
  }

  const remainingAssignments = booking.assignments.filter(
    (assignment) =>
      assignment.cleaner_id !== currentCleanerId &&
      assignment.assignment_status !== "Cancelled"
  );

  const { error: bookingError } = await getSupabaseAdmin()
    .from("bookings")
    .update({
      assigned_cleaner_id: remainingAssignments[0]?.cleaner_id ?? null,
      job_status: remainingAssignments.length ? "Assigned" : "Not Assigned",
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
  revalidatePath("/cleaner/jobs");
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
    const remainingAssignments = booking.assignments.filter(
      (assignment) =>
        assignment.cleaner_id !== cleaner.id &&
        assignment.assignment_status !== "Cancelled"
    );
    update.assigned_cleaner_id = remainingAssignments[0]?.cleaner_id ?? null;
    update.job_status = remainingAssignments.length ? "Assigned" : "Not Assigned";
  }

  const { error } = await getSupabaseAdmin()
    .from("bookings")
    .update(update)
    .eq("id", bookingId);

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
    await ensureEarningsForBooking(bookingId);
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

export async function createPriceManagedService(formData: FormData) {
  const user = await requireAdmin("/admin/pricing");
  const payload = servicePayloadFromForm(formData);

  const { data, error } = await getSupabaseAdmin()
    .from("services")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw toSupabaseError(error);
  }

  await logPricingHistory({
    serviceId: String(data.id),
    changedBy: user.id,
    changeType: "service_created",
    snapshot: payload,
  });

  revalidatePath("/admin/pricing");
  revalidatePath("/book");
  revalidatePath("/");
}

export async function updatePriceManagedService(formData: FormData) {
  const user = await requireAdmin("/admin/pricing");
  const serviceId = getRequiredString(formData, "service_id");
  const payload = servicePayloadFromForm(formData);

  const { error } = await getSupabaseAdmin()
    .from("services")
    .update(payload)
    .eq("id", serviceId);

  if (error) {
    throw toSupabaseError(error);
  }

  await logPricingHistory({
    serviceId,
    changedBy: user.id,
    changeType: "service_updated",
    snapshot: payload,
  });

  revalidatePath("/admin/pricing");
  revalidatePath("/book");
  revalidatePath("/");
}

export async function deletePriceManagedService(formData: FormData) {
  const user = await requireAdmin("/admin/pricing");
  const serviceId = getRequiredString(formData, "service_id");

  const { error } = await getSupabaseAdmin()
    .from("services")
    .delete()
    .eq("id", serviceId);

  if (error) {
    throw toSupabaseError(error);
  }

  await logPricingHistory({
    serviceId,
    changedBy: user.id,
    changeType: "service_deleted",
    snapshot: { serviceId },
  });

  revalidatePath("/admin/pricing");
  revalidatePath("/book");
  revalidatePath("/");
}

export async function upsertServiceAddon(formData: FormData) {
  const user = await requireAdmin("/admin/pricing");
  const serviceId = getRequiredString(formData, "service_id");
  const addonKey = slugify(getRequiredString(formData, "addon_key"));
  const addonId = getOptionalString(formData, "addon_id");
  const payload = {
    service_id: serviceId,
    addon_key: addonKey,
    label: getRequiredString(formData, "label"),
    price: getNumber(formData, "price"),
    active: formData.get("active") === "on",
  };

  const { error } = addonId
    ? await getSupabaseAdmin()
        .from("service_addons")
        .update(payload)
        .eq("id", addonId)
    : await getSupabaseAdmin().from("service_addons").upsert(payload, {
        onConflict: "service_id,addon_key",
      });

  if (error) {
    throw toSupabaseError(error);
  }

  await logPricingHistory({
    serviceId,
    changedBy: user.id,
    changeType: addonId ? "addon_updated" : "addon_created",
    snapshot: payload,
  });

  revalidatePath("/admin/pricing");
  revalidatePath("/book");
}

export async function deleteServiceAddon(formData: FormData) {
  const user = await requireAdmin("/admin/pricing");
  const serviceId = getRequiredString(formData, "service_id");
  const addonId = getRequiredString(formData, "addon_id");

  const { error } = await getSupabaseAdmin()
    .from("service_addons")
    .delete()
    .eq("id", addonId);

  if (error) {
    throw toSupabaseError(error);
  }

  await logPricingHistory({
    serviceId,
    changedBy: user.id,
    changeType: "addon_deleted",
    snapshot: { addonId },
  });

  revalidatePath("/admin/pricing");
  revalidatePath("/book");
}

export async function upsertServicePricingRule(formData: FormData) {
  const user = await requireAdmin("/admin/pricing");
  const serviceId = getRequiredString(formData, "service_id");
  const ruleId = getOptionalString(formData, "rule_id");
  const adjustmentType =
    formData.get("adjustment_type") === "percentage" ? "percentage" : "flat";
  const payload = {
    service_id: serviceId,
    name: getRequiredString(formData, "name"),
    rule_type: getRequiredString(formData, "rule_type"),
    adjustment_type: adjustmentType,
    adjustment_value: getNumber(formData, "adjustment_value"),
    active: formData.get("active") === "on",
    starts_at: getOptionalString(formData, "starts_at"),
    ends_at: getOptionalString(formData, "ends_at"),
    notes: getOptionalString(formData, "notes") ?? "",
  };

  const { error } = ruleId
    ? await getSupabaseAdmin()
        .from("service_pricing_rules")
        .update(payload)
        .eq("id", ruleId)
    : await getSupabaseAdmin().from("service_pricing_rules").insert(payload);

  if (error) {
    throw toSupabaseError(error);
  }

  await logPricingHistory({
    serviceId,
    changedBy: user.id,
    changeType: ruleId ? "pricing_rule_updated" : "pricing_rule_created",
    snapshot: payload,
  });

  revalidatePath("/admin/pricing");
  revalidatePath("/book");
}

export async function deleteServicePricingRule(formData: FormData) {
  const user = await requireAdmin("/admin/pricing");
  const serviceId = getRequiredString(formData, "service_id");
  const ruleId = getRequiredString(formData, "rule_id");

  const { error } = await getSupabaseAdmin()
    .from("service_pricing_rules")
    .delete()
    .eq("id", ruleId);

  if (error) {
    throw toSupabaseError(error);
  }

  await logPricingHistory({
    serviceId,
    changedBy: user.id,
    changeType: "pricing_rule_deleted",
    snapshot: { ruleId },
  });

  revalidatePath("/admin/pricing");
  revalidatePath("/book");
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
    ? await savePayrollRecordForBooking(payload, bookingId, cleanerId)
    : await getSupabaseAdmin().from("payroll_records").insert(payload);

  if (error) {
    throw toSupabaseError(error);
  }

  revalidatePath("/admin/payroll");
  revalidatePath("/admin/earnings");
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

  const { data: payroll } = await getSupabaseAdmin()
    .from("payroll_records")
    .select("booking_id, cleaner_id")
    .eq("id", payrollId)
    .maybeSingle();

  if (payroll?.booking_id && payroll.cleaner_id) {
    await getSupabaseAdmin()
      .from("cleaner_earnings")
      .update({ status })
      .eq("booking_id", payroll.booking_id)
      .eq("cleaner_id", payroll.cleaner_id);
  }

  revalidatePath("/admin/payroll");
  revalidatePath("/admin/earnings");
  revalidatePath("/cleaner/earnings");
}

async function savePayrollRecordForBooking(
  payload: Record<string, unknown>,
  bookingId: string,
  cleanerId: string
) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("payroll_records")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("cleaner_id", cleanerId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError };
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("payroll_records")
      .update(payload)
      .eq("id", existing.id);

    return { error };
  }

  const { error } = await supabase.from("payroll_records").insert(payload);
  return { error };
}

async function saveCleanerEarningForBooking(
  payload: Record<string, unknown>,
  bookingId: string,
  cleanerId: string
) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("cleaner_earnings")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("cleaner_id", cleanerId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError };
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("cleaner_earnings")
      .update(payload)
      .eq("id", existing.id);

    return { error };
  }

  const { error } = await supabase.from("cleaner_earnings").insert(payload);
  return { error };
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

async function createPendingBookingForPayment({
  bookingReference,
  customerName,
  customerEmail,
  customerPhone,
  customerId,
  serviceId,
  address,
  suburb,
  city,
  bookingDate,
  bookingTime,
  notes,
  service,
  serviceData,
  selectedAddons,
  estimatedTotal,
  pricingBreakdown,
  paymentType,
  cleanerSelectionType = "auto",
  numberOfCleaners = 1,
  preferredCleaner = {
    preferredCleanerId: "",
    preferredCleanerName: "",
  },
  recurringSetup,
}: PendingBookingInput) {
  const { totalAmount } = calculatePaymentAmount(estimatedTotal, paymentType);
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .insert({
      booking_reference: bookingReference,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_id: customerId,
      service_id: serviceId,
      address,
      suburb,
      city,
      booking_date: bookingDate,
      booking_time: bookingTime,
      scheduled_start_time: toScheduledTimestamp(bookingDate, bookingTime),
      scheduled_end_time: toScheduledTimestamp(bookingDate, bookingTime, 3),
      notes,
      service_data: {
        serviceSlug: service.slug,
        serviceName: service.name,
        pricingBreakdown,
        cleanerSelectionType,
        numberOfCleaners,
        ...preferredCleaner,
        ...(recurringSetup ? { recurringSetup } : {}),
        questions: service.questions.map((question) => ({
          id: question.id,
          label: question.label,
          value: serviceData[question.id],
        })),
      },
      selected_addons: selectedAddons,
      estimated_price: estimatedTotal,
      number_of_cleaners: numberOfCleaners,
      status: "Pending Payment",
      payment_status: "Pending Payment",
      payment_type: paymentType,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      can_reschedule: true,
      can_cancel: true,
    })
    .select("id")
    .single();

  if (error) {
    throw toSupabaseError(error);
  }

  const booking = await getBookingById(String(data.id));

  if (!booking) {
    throw new Error("Booking was created but could not be loaded for payment.");
  }

  return booking;
}

async function saveRecurringAddressFromBooking(
  customerId: string,
  values: BookingWizardValues
) {
  if (values.selectedAddressId) {
    return values.selectedAddressId;
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

  if (values.saveAddress) {
    revalidatePath("/account/addresses");
  }

  return String(data.id);
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

function getBookingRecurringFrequency(values: BookingWizardValues) {
  return normalizeRecurringFrequency(values.serviceData.cleaning_frequency);
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

function validateServiceInput(
  service: ServiceConfig,
  serviceData: Record<string, string | number>,
  selectedAddonIds: string[]
) {
  for (const question of service.questions) {
    validateServiceQuestion(question, serviceData[question.id]);
  }

  const activeAddonIds = new Set(
    service.addons
      .filter((addon) => addon.active !== false)
      .map((addon) => addon.id)
  );

  for (const addonId of selectedAddonIds) {
    if (!activeAddonIds.has(addonId)) {
      throw new Error("One or more selected add-ons are no longer available.");
    }
  }
}

async function assertPreferredCleanerAvailable({
  serviceName,
  bookingDate,
  bookingTime,
  cleanerId,
}: {
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  cleanerId: string;
}) {
  const availability = await getCleanerDateAvailability({
    serviceName,
    bookingDate,
    bookingTime,
  });
  const selected = availability.find((item) => item.cleaner.id === cleanerId);

  if (!selected || selected.status !== "available") {
    throw new Error("The selected cleaner is not available for this date.");
  }
}

function validateServiceQuestion(
  question: ServiceQuestion,
  value: string | number | undefined
) {
  const empty =
    value === undefined ||
    value === null ||
    (typeof value === "string" && !value.trim());

  if (question.required && empty) {
    throw new Error(`${question.label} is required.`);
  }

  if (empty) {
    return;
  }

  if (question.type === "number") {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      throw new Error(`${question.label} must be a valid number.`);
    }
  }

  if (
    question.type === "select" &&
    question.options?.length &&
    !question.options.includes(String(value))
  ) {
    throw new Error(`Choose a valid option for ${question.label}.`);
  }
}

function buildAdminBookingServiceData(service: ServiceConfig, formData: FormData) {
  return service.questions.reduce<Record<string, string | number>>((data, question) => {
    const value = formData.get(`service_data_${question.id}`);

    if (typeof value !== "string" || !value.trim()) {
      data[question.id] = question.type === "number" ? 0 : "";
      return data;
    }

    data[question.id] = question.type === "number" ? Number(value) : value.trim();
    return data;
  }, {});
}

function getNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${key} must be a positive number.`);
  }

  return value;
}

function servicePayloadFromForm(formData: FormData) {
  const name = getRequiredString(formData, "name");
  const serviceFeeType =
    formData.get("service_fee_type") === "percentage" ? "percentage" : "flat";

  return {
    name,
    slug: slugify(getOptionalString(formData, "slug") ?? name),
    short_description: getOptionalString(formData, "short_description") ?? "",
    description: getOptionalString(formData, "description") ?? "",
    base_price: getNumber(formData, "base_price"),
    room_price: getNumber(formData, "room_price"),
    bathroom_price: getNumber(formData, "bathroom_price"),
    service_fee_type: serviceFeeType,
    service_fee_amount: getNumber(formData, "service_fee_amount"),
    duration_minutes: Math.max(0, Math.round(getNumber(formData, "duration_minutes"))),
    active: formData.get("active") === "on",
    question_schema: parseJsonArray(formData, "question_schema"),
    benefits: parseLineList(formData, "benefits"),
    included: parseLineList(formData, "included"),
    pricing_rule_notes: getOptionalString(formData, "pricing_rule_notes") ?? "",
  };
}

function parseLineList(formData: FormData, key: string) {
  const value = getOptionalString(formData, key) ?? "";

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonArray(formData: FormData, key: string) {
  const raw = getOptionalString(formData, key);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Value must be an array.");
    }

    return parsed;
  } catch {
    throw new Error(`${key} must be valid JSON array.`);
  }
}

async function logPricingHistory({
  serviceId,
  changedBy,
  changeType,
  snapshot,
}: {
  serviceId: string | null;
  changedBy: string;
  changeType: string;
  snapshot: Record<string, unknown>;
}) {
  const { error } = await getSupabaseAdmin().from("pricing_history").insert({
    service_id: serviceId,
    changed_by: changedBy,
    change_type: changeType,
    snapshot,
  });

  if (error) {
    throw toSupabaseError(error);
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCleanerPayload(values: CleanerFormValues) {
  const phone = normalizeSouthAfricanPhone(values.phone);
  const email = cleanerAuthEmailFromPhone(values.phone);

  if (!phone || !email) {
    throw new Error("Enter a valid South African phone number.");
  }

  return {
    full_name: values.fullName,
    email,
    phone,
    role: values.role,
    started_at: values.startedAt,
    profile_photo: values.profilePhoto || null,
    bio: values.bio || null,
    specialties: values.specialties,
    rating: values.rating,
    completed_jobs: values.completedJobs,
    active: values.active,
  };
}

async function assertCleanerPhoneIsUnique(phoneValue: string, cleanerId?: string) {
  const phone = normalizeSouthAfricanPhone(phoneValue);
  const email = cleanerAuthEmailFromPhone(phoneValue);

  if (!phone || !email) {
    throw new Error("Enter a valid South African phone number.");
  }

  let query = getSupabaseAdmin()
    .from("cleaners")
    .select("id")
    .or(`phone.eq.${phone},email.ilike.${email}`);

  if (cleanerId) {
    query = query.neq("id", cleanerId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    throw toSupabaseError(error);
  }

  if (data?.length) {
    throw new Error("A cleaner with this phone number already exists.");
  }
}

async function upsertCleanerAuthUser({
  email,
  phone,
  fullName,
  password,
  userId,
}: {
  email: string;
  phone: string;
  fullName: string;
  password?: string;
  userId?: string;
}) {
  if (!password?.trim()) {
    return userId ?? null;
  }

  if (userId) {
    const { data, error } = await getSupabaseAdmin().auth.admin.updateUserById(
      userId,
      {
        email,
        password,
        user_metadata: { full_name: fullName, phone, role: "cleaner" },
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    return data.user.id;
  }

  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone, role: "cleaner" },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.user.id;
}

function toScheduledTimestamp(date: string, time: string, addHours = 0) {
  const scheduled = new Date(`${date}T${time.slice(0, 5)}:00`);
  scheduled.setHours(scheduled.getHours() + addHours);
  return scheduled.toISOString();
}

async function ensureEarningsForBooking(bookingId: string) {
  const booking = await getBookingById(bookingId);

  if (!booking?.assignments.length) {
    return;
  }

  const activeAssignments = booking.assignments.filter(
    (assignment) => assignment.assignment_status !== "Cancelled" && assignment.cleaner
  );

  if (!activeAssignments.length) {
    return;
  }

  const sharedEarning = shouldUseSharedCleanerEarning(booking.service_name)
    ? calculateCleanerEarningForBooking(
        booking,
        activeAssignments[0].cleaner as Cleaner,
        activeAssignments[0].is_team_leader
      )
    : null;

  for (const assignment of activeAssignments) {
    const cleaner = assignment.cleaner as Cleaner;
    const earning =
      sharedEarning ??
      calculateCleanerEarningForBooking(
        booking,
        cleaner,
        assignment.is_team_leader
      );
    const earningPayload = {
      cleaner_id: cleaner.id,
      booking_id: booking.id,
      gross_amount: earning.bookingAmount,
      platform_fee: earning.serviceFee,
      booking_amount: earning.bookingAmount,
      service_fee: earning.serviceFee,
      net_booking_value: earning.netBookingValue,
      cleaner_percentage: earning.cleanerPercentage,
      cleaner_role: earning.cleanerRole,
      tenure_months: earning.tenureMonths,
      calculation_details: earning.calculationDetails,
      net_amount: earning.finalPayout,
      status: "Pending",
    };

    const { error: earningError } = await saveCleanerEarningForBooking(
      earningPayload,
      booking.id,
      cleaner.id
    );

    if (earningError) {
      throw toSupabaseError(earningError);
    }

    const { error: payrollError } = await savePayrollRecordForBooking(
      {
        cleaner_id: cleaner.id,
        booking_id: booking.id,
        amount: earning.finalPayout,
        bonus: 0,
        deduction: 0,
        status: "Pending",
      },
      booking.id,
      cleaner.id
    );

    if (payrollError) {
      throw toSupabaseError(payrollError);
    }
  }
}

function calculateCleanerEarningForBooking(
  booking: BookingWithService,
  cleaner: Cleaner,
  isTeamLeader = false
) {
  const bookingAmount = roundMoney(booking.total_amount || booking.estimated_price);
  const serviceFee = roundMoney(
    booking.service_data.pricingBreakdown?.serviceFee ?? 0
  );
  const netBookingValue = roundMoney(Math.max(bookingAmount - serviceFee, 0));
  const cleanerRole =
    isTeamLeader || cleaner?.role === "Team Leader" ? "Team Leader" : "Cleaner";
  const tenureMonths = getCleanerTenureMonths(cleaner?.started_at ?? cleaner?.created_at);

  if (usesFixedTeamRate(booking.service_name)) {
    const finalPayout = cleanerRole === "Team Leader" ? 270 : 250;

    return {
      bookingAmount,
      serviceFee,
      netBookingValue,
      cleanerPercentage: null,
      cleanerRole,
      tenureMonths,
      finalPayout,
      calculationDetails: {
        rule: "fixed_service_rate",
        serviceName: booking.service_name,
        roleRate: finalPayout,
      },
    };
  }

  const cleanerPercentage = tenureMonths >= 4 ? 70 : 60;
  const calculated = roundMoney(netBookingValue * (cleanerPercentage / 100));
  const finalPayout = Math.min(Math.max(calculated, 250), 300);

  return {
    bookingAmount,
    serviceFee,
    netBookingValue,
    cleanerPercentage,
    cleanerRole,
    tenureMonths,
    finalPayout,
    calculationDetails: {
      rule: "tenure_percentage_with_floor_and_cap",
      calculated,
      minimumPayout: 250,
      maximumPayout: 300,
    },
  };
}

function shouldUseSharedCleanerEarning(serviceName: string) {
  return serviceName === "Regular Cleaning" || serviceName === "Airbnb Cleaning";
}

function usesFixedTeamRate(serviceName: string) {
  return serviceName === "Deep Cleaning" || serviceName === "Moving Cleaning";
}

function canCustomerChooseCleaners(serviceName: string) {
  return !usesFixedTeamRate(serviceName);
}

function clampCleanerCount(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.round(value), 1), 5);
}

function getCleanerTenureMonths(startedAt: string | null | undefined) {
  if (!startedAt) {
    return 0;
  }

  const started = new Date(startedAt);

  if (Number.isNaN(started.getTime())) {
    return 0;
  }

  const now = new Date();
  let months =
    (now.getFullYear() - started.getFullYear()) * 12 +
    now.getMonth() -
    started.getMonth();

  if (now.getDate() < started.getDate()) {
    months -= 1;
  }

  return Math.max(months, 0);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
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
