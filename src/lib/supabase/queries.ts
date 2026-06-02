import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { toSupabaseError } from "@/lib/supabase/errors";
import type {
  BookingAddonData,
  BookingRequest,
  BookingServiceData,
  BookingStatus,
  BookingWithService,
  Cleaner,
  CleanerAvailability,
  CleanerSpecialty,
  CleanerWithAvailability,
  CleaningService,
  Customer,
  CustomerAddress,
  JobStatus,
  Payment,
  PaymentStatus,
  RequestStatus,
  RequestType,
} from "@/lib/types";

const bookingSelect =
  "id, booking_reference, customer_id, customer_name, customer_email, customer_phone, service_id, address, suburb, city, booking_date, booking_time, notes, service_data, selected_addons, estimated_price, status, payment_status, payment_type, total_amount, amount_paid, balance_due, confirmed_at, assigned_cleaner_id, job_status, can_reschedule, can_cancel, created_at, services(name), assigned_cleaner:cleaners(id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at), payments(id, booking_id, payment_reference, paystack_reference, payment_type, amount_due, amount_paid, currency, payment_status, payment_method, paid_at, created_at)";

export async function getActiveServices(): Promise<CleaningService[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("services")
    .select(
      "id, name, description, base_price, duration_minutes, active, created_at"
    )
    .eq("active", true)
    .order("base_price", { ascending: true });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map((service) => ({
    ...service,
    base_price: Number(service.base_price),
  })) as CleaningService[];
}

export async function getDatabaseServiceByName(serviceName: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("services")
    .select("id, name, base_price, active")
    .eq("name", serviceName)
    .eq("active", true)
    .single();

  if (error) {
    throw toSupabaseError(error);
  }

  return {
    ...data,
    base_price: Number(data.base_price),
  };
}

export async function getBookings(): Promise<BookingWithService[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select(bookingSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapBookingWithService);
}

export async function getBookingById(
  bookingId: string
): Promise<BookingWithService | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select(bookingSelect)
    .eq("id", bookingId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw toSupabaseError(error);
  }

  return mapBookingWithService(data);
}

export async function getBookingByReference(
  bookingReference: string
): Promise<BookingWithService | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select(bookingSelect)
    .eq("booking_reference", bookingReference)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw toSupabaseError(error);
  }

  return mapBookingWithService(data);
}

export async function getCustomerBookings(
  customerId: string
): Promise<BookingWithService[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select(bookingSelect)
    .eq("customer_id", customerId)
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapBookingWithService);
}

export async function getCustomerBookingById(
  customerId: string,
  bookingId: string
): Promise<BookingWithService | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select(bookingSelect)
    .eq("id", bookingId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  return data ? mapBookingWithService(data) : null;
}

export async function getCustomerAddresses(
  customerId: string
): Promise<CustomerAddress[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("customer_addresses")
    .select(
      "id, customer_id, label, address, suburb, city, access_instructions, gate_code, parking_instructions, is_default, created_at"
    )
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapCustomerAddress);
}

export async function getCustomerBookingRequests(
  customerId: string,
  bookingId?: string
): Promise<BookingRequest[]> {
  let query = getSupabaseAdmin()
    .from("booking_requests")
    .select(
      `id, booking_id, customer_id, request_type, requested_date, requested_time, reason, request_status, admin_notes, created_at, bookings!inner(${bookingSelect})`
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (bookingId) {
    query = query.eq("booking_id", bookingId);
  }

  const { data, error } = await query;

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapBookingRequest);
}

export async function getBookingRequests(): Promise<BookingRequest[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("booking_requests")
    .select(
      `id, booking_id, customer_id, request_type, requested_date, requested_time, reason, request_status, admin_notes, created_at, bookings(${bookingSelect}), customers(id, user_id, full_name, email, phone, created_at)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapBookingRequest);
}

export async function getBookingRequestsByBookingId(
  bookingId: string
): Promise<BookingRequest[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("booking_requests")
    .select(
      "id, booking_id, customer_id, request_type, requested_date, requested_time, reason, request_status, admin_notes, created_at, customers(id, user_id, full_name, email, phone, created_at)"
    )
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapBookingRequest);
}

export async function getCleaners(): Promise<Cleaner[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("cleaners")
    .select(
      "id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at"
    )
    .order("full_name", { ascending: true });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapCleaner);
}

export async function getCleanerById(
  cleanerId: string
): Promise<CleanerWithAvailability | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("cleaners")
    .select(
      "id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at"
    )
    .eq("id", cleanerId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw toSupabaseError(error);
  }

  return {
    ...mapCleaner(data),
    availability: await getCleanerAvailability(cleanerId),
  };
}

export async function getCleanerAvailability(
  cleanerId: string
): Promise<CleanerAvailability[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("cleaner_availability")
    .select(
      "id, cleaner_id, available_date, start_time, end_time, is_available, created_at"
    )
    .eq("cleaner_id", cleanerId)
    .order("available_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapCleanerAvailability);
}

export async function getMatchingAvailableCleaners(
  booking: BookingWithService
): Promise<Cleaner[]> {
  const serviceName = booking.service_name as CleanerSpecialty;
  const bookingTime = booking.booking_time.slice(0, 5);

  const { data: cleaners, error: cleanersError } = await getSupabaseAdmin()
    .from("cleaners")
    .select(
      "id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at"
    )
    .eq("active", true)
    .order("full_name", { ascending: true });

  if (cleanersError) {
    throw toSupabaseError(cleanersError);
  }

  const mappedCleaners = (cleaners ?? [])
    .map(mapCleaner)
    .filter((cleaner) => cleaner.specialties.includes(serviceName));

  if (!mappedCleaners.length) {
    return [];
  }

  const cleanerIds = mappedCleaners.map((cleaner) => cleaner.id);
  const { data: availability, error: availabilityError } = await getSupabaseAdmin()
    .from("cleaner_availability")
    .select(
      "id, cleaner_id, available_date, start_time, end_time, is_available, created_at"
    )
    .in("cleaner_id", cleanerIds)
    .eq("available_date", booking.booking_date)
    .eq("is_available", true);

  if (availabilityError) {
    throw toSupabaseError(availabilityError);
  }

  const availableCleanerIds = new Set(
    (availability ?? [])
      .map(mapCleanerAvailability)
      .filter(
        (slot) =>
          slot.start_time.slice(0, 5) <= bookingTime &&
          slot.end_time.slice(0, 5) >= bookingTime
      )
      .map((slot) => slot.cleaner_id)
  );

  return mappedCleaners.filter((cleaner) => availableCleanerIds.has(cleaner.id));
}

function mapBookingWithService(
  booking: Record<string, unknown> & {
    services?: { name?: string } | { name?: string }[] | null;
    assigned_cleaner?: Record<string, unknown> | Record<string, unknown>[] | null;
    payments?: Record<string, unknown>[] | Record<string, unknown> | null;
  }
): BookingWithService {
    const relatedService = Array.isArray(booking.services)
      ? booking.services[0]
      : booking.services;
    const assignedCleaner = Array.isArray(booking.assigned_cleaner)
      ? booking.assigned_cleaner[0]
      : booking.assigned_cleaner;
    const payments = normalisePayments(booking.payments);
    const latestPayment = payments[0] ?? null;
    const estimatedPrice = Number(booking.estimated_price ?? 0);

    return {
      ...booking,
      booking_reference: String(booking.booking_reference ?? ""),
      customer_id:
        typeof booking.customer_id === "string" ? booking.customer_id : null,
      estimated_price: estimatedPrice,
      service_name:
        (booking.service_data as BookingServiceData | null)?.serviceName ??
        relatedService?.name ??
        "Unknown service",
      service_data: normaliseServiceData(booking.service_data),
      selected_addons: normaliseAddonData(booking.selected_addons),
      status: normaliseBookingStatus(booking.status),
      payment_status: normalisePaymentStatus(booking.payment_status),
      payment_type:
        booking.payment_type === "Deposit" ||
        booking.payment_type === "Full Payment"
          ? booking.payment_type
          : latestPayment?.payment_type ?? null,
      total_amount: Number(booking.total_amount ?? estimatedPrice),
      amount_paid: Number(booking.amount_paid ?? 0),
      balance_due: Number(booking.balance_due ?? booking.total_amount ?? estimatedPrice),
      confirmed_at:
        typeof booking.confirmed_at === "string" ? booking.confirmed_at : null,
      latest_payment: latestPayment,
      payments,
      assigned_cleaner_id:
        typeof booking.assigned_cleaner_id === "string"
          ? booking.assigned_cleaner_id
          : null,
      job_status: normaliseJobStatus(booking.job_status),
      assigned_cleaner: assignedCleaner ? mapCleaner(assignedCleaner) : null,
      can_reschedule:
        typeof booking.can_reschedule === "boolean"
          ? booking.can_reschedule
          : true,
      can_cancel:
        typeof booking.can_cancel === "boolean" ? booking.can_cancel : true,
    } as BookingWithService;
}

function mapBookingRequest(
  request: Record<string, unknown> & {
    bookings?: Record<string, unknown> | Record<string, unknown>[] | null;
    customers?: Record<string, unknown> | Record<string, unknown>[] | null;
  }
): BookingRequest {
  const booking = Array.isArray(request.bookings)
    ? request.bookings[0]
    : request.bookings;
  const customer = Array.isArray(request.customers)
    ? request.customers[0]
    : request.customers;

  return {
    id: String(request.id ?? ""),
    booking_id: String(request.booking_id ?? ""),
    customer_id: String(request.customer_id ?? ""),
    request_type: normaliseRequestType(request.request_type),
    requested_date:
      typeof request.requested_date === "string" ? request.requested_date : null,
    requested_time:
      typeof request.requested_time === "string" ? request.requested_time : null,
    reason: String(request.reason ?? ""),
    request_status: normaliseRequestStatus(request.request_status),
    admin_notes:
      typeof request.admin_notes === "string" ? request.admin_notes : null,
    created_at: String(request.created_at ?? ""),
    booking: booking ? mapBookingWithService(booking) : null,
    customer: customer ? mapCustomer(customer) : null,
  };
}

function mapCustomer(customer: Record<string, unknown>): Customer {
  return {
    id: String(customer.id ?? ""),
    user_id: String(customer.user_id ?? ""),
    full_name: String(customer.full_name ?? ""),
    email: String(customer.email ?? ""),
    phone: typeof customer.phone === "string" ? customer.phone : null,
    created_at: String(customer.created_at ?? ""),
  };
}

function mapCustomerAddress(address: Record<string, unknown>): CustomerAddress {
  return {
    id: String(address.id ?? ""),
    customer_id: String(address.customer_id ?? ""),
    label: String(address.label ?? ""),
    address: String(address.address ?? ""),
    suburb: String(address.suburb ?? ""),
    city: String(address.city ?? ""),
    access_instructions:
      typeof address.access_instructions === "string"
        ? address.access_instructions
        : null,
    gate_code: typeof address.gate_code === "string" ? address.gate_code : null,
    parking_instructions:
      typeof address.parking_instructions === "string"
        ? address.parking_instructions
        : null,
    is_default: Boolean(address.is_default),
    created_at: String(address.created_at ?? ""),
  };
}

function normalisePayments(value: unknown): Payment[] {
  const payments = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : [];

  return payments.map(mapPayment).sort((a, b) => {
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}

function mapPayment(payment: Record<string, unknown>): Payment {
  return {
    id: String(payment.id ?? ""),
    booking_id: String(payment.booking_id ?? ""),
    payment_reference: String(payment.payment_reference ?? ""),
    paystack_reference:
      typeof payment.paystack_reference === "string"
        ? payment.paystack_reference
        : null,
    payment_type:
      payment.payment_type === "Full Payment" ? "Full Payment" : "Deposit",
    amount_due: Number(payment.amount_due ?? 0),
    amount_paid: Number(payment.amount_paid ?? 0),
    currency: String(payment.currency ?? "ZAR"),
    payment_status: normalisePaymentStatus(payment.payment_status),
    payment_method:
      typeof payment.payment_method === "string" ? payment.payment_method : null,
    paid_at: typeof payment.paid_at === "string" ? payment.paid_at : null,
    created_at: String(payment.created_at ?? ""),
  };
}

function mapCleaner(cleaner: Record<string, unknown>): Cleaner {
  return {
    id: String(cleaner.id ?? ""),
    full_name: String(cleaner.full_name ?? ""),
    email: String(cleaner.email ?? ""),
    phone: String(cleaner.phone ?? ""),
    profile_photo:
      typeof cleaner.profile_photo === "string" && cleaner.profile_photo
        ? cleaner.profile_photo
        : null,
    bio: typeof cleaner.bio === "string" && cleaner.bio ? cleaner.bio : null,
    specialties: normaliseSpecialties(cleaner.specialties),
    rating: Number(cleaner.rating ?? 0),
    completed_jobs: Number(cleaner.completed_jobs ?? 0),
    active: Boolean(cleaner.active),
    created_at: String(cleaner.created_at ?? ""),
  };
}

function mapCleanerAvailability(
  availability: Record<string, unknown>
): CleanerAvailability {
  return {
    id: String(availability.id ?? ""),
    cleaner_id: String(availability.cleaner_id ?? ""),
    available_date: String(availability.available_date ?? ""),
    start_time: String(availability.start_time ?? ""),
    end_time: String(availability.end_time ?? ""),
    is_available: Boolean(availability.is_available),
    created_at: String(availability.created_at ?? ""),
  };
}

function normaliseSpecialties(value: unknown): CleanerSpecialty[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(String) as CleanerSpecialty[];
}

function normaliseJobStatus(value: unknown): JobStatus {
  const jobStatus = String(value ?? "Not Assigned");

  if (
    jobStatus === "Assigned" ||
    jobStatus === "On The Way" ||
    jobStatus === "In Progress" ||
    jobStatus === "Completed" ||
    jobStatus === "Cancelled"
  ) {
    return jobStatus;
  }

  return "Not Assigned";
}

function normaliseBookingStatus(value: unknown): BookingStatus {
  const status = String(value ?? "Pending Payment");

  if (
    status === "Confirmed" ||
    status === "Completed" ||
    status === "Cancelled"
  ) {
    return status;
  }

  return "Pending Payment";
}

function normalisePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value ?? "Pending Payment");

  if (
    status === "Deposit Paid" ||
    status === "Paid" ||
    status === "Failed" ||
    status === "Refunded"
  ) {
    return status;
  }

  return "Pending Payment";
}

function normaliseRequestType(value: unknown): RequestType {
  return value === "Cancel" ? "Cancel" : "Reschedule";
}

function normaliseRequestStatus(value: unknown): RequestStatus {
  const status = String(value ?? "Pending");

  if (status === "Approved" || status === "Declined") {
    return status;
  }

  return "Pending";
}

function normaliseServiceData(value: unknown): BookingServiceData {
  if (value && typeof value === "object") {
    const data = value as Partial<BookingServiceData>;

    return {
      serviceSlug: String(data.serviceSlug ?? ""),
      serviceName: String(data.serviceName ?? "Unknown service"),
      questions: Array.isArray(data.questions)
        ? data.questions.map((question) => ({
            id: String(question.id),
            label: String(question.label),
            value:
              typeof question.value === "number"
                ? question.value
                : String(question.value ?? ""),
          }))
        : [],
    };
  }

  return {
    serviceSlug: "",
    serviceName: "Unknown service",
    questions: [],
  };
}

function normaliseAddonData(value: unknown): BookingAddonData[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((addon) => ({
    id: String(addon.id),
    label: String(addon.label),
    price: Number(addon.price ?? 0),
  }));
}
