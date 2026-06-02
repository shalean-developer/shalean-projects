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
import { ensureCustomerForUser, getOptionalCustomer, requireAdmin, requireCustomer } from "@/lib/auth";
import { getServiceBySlug } from "@/config/services";
import { bookingWizardSchema, type BookingWizardValues } from "@/lib/booking-schema";
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
import { getBookingById, getDatabaseServiceByName } from "@/lib/supabase/queries";
import {
  bookingStatuses,
  jobStatuses,
  type BookingStatus,
  type JobStatus,
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

  return {
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
  const bookingId = getRequiredString(formData, "booking_id");
  const status = getRequiredString(formData, "status") as BookingStatus;

  if (!bookingStatuses.includes(status)) {
    throw new Error("Invalid booking status.");
  }

  const { error } = await getSupabaseAdmin()
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function createCleaner(values: CleanerFormValues) {
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
}

export async function deleteCleanerAvailability(formData: FormData) {
  const cleanerId = getRequiredString(formData, "cleaner_id");
  const availabilityId = getRequiredString(formData, "availability_id");

  const { error } = await getSupabaseAdmin()
    .from("cleaner_availability")
    .delete()
    .eq("id", availabilityId)
    .eq("cleaner_id", cleanerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/cleaners/${cleanerId}`);
}

export async function updateBookingJobStatus(formData: FormData) {
  const bookingId = getRequiredString(formData, "booking_id");
  const jobStatus = getRequiredString(formData, "job_status") as JobStatus;

  if (!jobStatuses.includes(jobStatus)) {
    throw new Error("Invalid job status.");
  }

  const { error } = await getSupabaseAdmin()
    .from("bookings")
    .update({ job_status: jobStatus })
    .eq("id", bookingId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function assignCleanerToBooking(formData: FormData) {
  const bookingId = getRequiredString(formData, "booking_id");
  const cleanerId = getRequiredString(formData, "cleaner_id");
  const currentCleanerId = getOptionalString(formData, "current_cleaner_id");
  const assignmentStatus = currentCleanerId ? "Reassigned" : "Assigned";

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
}

export async function removeCleanerAssignment(formData: FormData) {
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

function createBookingReference() {
  const randomSegment = Math.random().toString(36).slice(2, 7).toUpperCase();
  const timeSegment = Date.now().toString(36).toUpperCase();

  return `SHL-${timeSegment}-${randomSegment}`;
}
