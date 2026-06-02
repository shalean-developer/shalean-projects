import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { toSupabaseError } from "@/lib/supabase/errors";
import type {
  BookingAddonData,
  BookingRequest,
  BookingServiceData,
  BookingStatus,
  BookingWithService,
  Cleaner,
  CleanerEarning,
  CleanerAvailability,
  CleanerSpecialty,
  CleanerWithAvailability,
  CleaningService,
  Customer,
  CustomerAddress,
  AutomationChannel,
  AutomationLog,
  AutomationType,
  Invoice,
  InvoiceStatus,
  JobStatus,
  Notification,
  Payment,
  PaymentStatus,
  PayrollRecord,
  PayrollStatus,
  PlatformSetting,
  RecurringBooking,
  RecurringBookingStatus,
  RecurringFrequency,
  RecurringPlanChangeRequest,
  ReportingSummary,
  Review,
  RequestStatus,
  RequestType,
  ScheduleConflict,
  SupportMessage,
  SupportPriority,
  SupportTicket,
  SupportTicketStatus,
  UserRole,
} from "@/lib/types";

const bookingSelect =
  "id, booking_reference, recurring_booking_id, customer_id, customer_name, customer_email, customer_phone, service_id, address, suburb, city, booking_date, booking_time, scheduled_start_time, scheduled_end_time, completed_at, cancelled_at, cancellation_reason, notes, service_data, selected_addons, estimated_price, status, payment_status, payment_type, total_amount, amount_paid, balance_due, confirmed_at, assigned_cleaner_id, job_status, can_reschedule, can_cancel, created_at, services(name), assigned_cleaner:cleaners(id, user_id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at), payments(id, booking_id, payment_reference, paystack_reference, payment_type, amount_due, amount_paid, currency, payment_status, payment_method, paid_at, created_at)";

const recurringBookingSelect =
  "id, customer_id, service_id, address_id, frequency, preferred_day, preferred_time, service_data, selected_addons, estimated_price, status, next_booking_date, created_at, services(name), customer_addresses(id, customer_id, label, address, suburb, city, access_instructions, gate_code, parking_instructions, is_default, created_at), customers(id, user_id, full_name, email, phone, created_at)";

const invoiceSelect =
  `id, booking_id, customer_id, invoice_number, invoice_status, subtotal, total, amount_paid, balance_due, issued_at, paid_at, created_at, bookings(${bookingSelect}), customers(id, user_id, full_name, email, phone, created_at)`;

const reviewSelect =
  `id, booking_id, customer_id, rating, review_text, public, created_at, bookings(${bookingSelect}), customers(id, user_id, full_name, email, phone, created_at)`;

const supportTicketSelect =
  `id, customer_id, booking_id, subject, message, status, priority, assigned_admin_id, created_at, updated_at, customers(id, user_id, full_name, email, phone, created_at), bookings(${bookingSelect}), support_messages(id, ticket_id, sender_id, sender_role, message, created_at)`;

const payrollRecordSelect =
  `id, cleaner_id, booking_id, amount, bonus, deduction, status, paid_at, created_at, cleaners(id, user_id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at), bookings(${bookingSelect})`;

const cleanerEarningSelect =
  `id, cleaner_id, booking_id, gross_amount, platform_fee, net_amount, status, created_at, cleaners(id, user_id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at), bookings(${bookingSelect})`;

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

export async function getBookingsByCleanerId(
  cleanerId: string
): Promise<BookingWithService[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select(bookingSelect)
    .eq("assigned_cleaner_id", cleanerId)
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapBookingWithService);
}

export async function getCleanerBookingById(
  cleanerId: string,
  bookingId: string
): Promise<BookingWithService | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select(bookingSelect)
    .eq("id", bookingId)
    .eq("assigned_cleaner_id", cleanerId)
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  return data ? mapBookingWithService(data) : null;
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

export async function getCustomerRecurringBookings(
  customerId: string
): Promise<RecurringBooking[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("recurring_bookings")
    .select(recurringBookingSelect)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapRecurringBooking);
}

export async function getCustomerRecurringBookingById(
  customerId: string,
  recurringBookingId: string
): Promise<RecurringBooking | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("recurring_bookings")
    .select(recurringBookingSelect)
    .eq("id", recurringBookingId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  return data ? mapRecurringBooking(data) : null;
}

export async function getRecurringBookings(): Promise<RecurringBooking[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("recurring_bookings")
    .select(recurringBookingSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapRecurringBooking);
}

export async function getAutomationLogs(): Promise<AutomationLog[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("automation_logs")
    .select(
      `id, booking_id, customer_id, automation_type, channel, status, sent_at, created_at, bookings(${bookingSelect}), customers(id, user_id, full_name, email, phone, created_at)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapAutomationLog);
}

export async function getCustomerInvoices(customerId: string): Promise<Invoice[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("invoices")
    .select(invoiceSelect)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapInvoice);
}

export async function getCustomerInvoiceById(
  customerId: string,
  invoiceId: string
): Promise<Invoice | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("invoices")
    .select(invoiceSelect)
    .eq("id", invoiceId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  return data ? mapInvoice(data) : null;
}

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("invoices")
    .select(invoiceSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapInvoice);
}

export async function getInvoiceById(invoiceId: string): Promise<Invoice | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("invoices")
    .select(invoiceSelect)
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  return data ? mapInvoice(data) : null;
}

export async function getCustomerReviews(customerId: string): Promise<Review[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .select(reviewSelect)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapReview);
}

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("customers")
    .select("id, user_id, full_name, email, phone, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapCustomer);
}

export async function getReviews(): Promise<Review[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .select(reviewSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapReview);
}

export async function getRecurringPlanChangeRequests(
  recurringBookingId: string
): Promise<RecurringPlanChangeRequest[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("recurring_plan_change_requests")
    .select(
      "id, recurring_booking_id, customer_id, requested_changes, request_status, admin_notes, created_at"
    )
    .eq("recurring_booking_id", recurringBookingId)
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapRecurringPlanChangeRequest);
}

export async function getCleaners(): Promise<Cleaner[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("cleaners")
    .select(
      "id, user_id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at"
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
      "id, user_id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at"
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

export async function getCleanerByUserIdOrEmail(
  userId: string,
  email: string | null | undefined
): Promise<CleanerWithAvailability | null> {
  let query = getSupabaseAdmin()
    .from("cleaners")
    .select(
      "id, user_id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at"
    );

  if (email) {
    query = query.or(`user_id.eq.${userId},email.ilike.${email}`);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  if (!data) {
    return null;
  }

  return {
    ...mapCleaner(data),
    availability: await getCleanerAvailability(String(data.id)),
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
      "id, user_id, full_name, email, phone, profile_photo, bio, specialties, rating, completed_jobs, active, created_at"
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

export async function getScheduleConflicts(
  booking: BookingWithService,
  cleanerId: string
): Promise<ScheduleConflict | null> {
  const cleaner = await getCleanerById(cleanerId);

  if (!cleaner) {
    return null;
  }

  const start = getBookingStart(booking);
  const end = getBookingEnd(booking);
  const bookingStartTime = start.toISOString();
  const bookingEndTime = end.toISOString();
  const bookingEndLocalTime = `${String(end.getHours()).padStart(2, "0")}:${String(
    end.getMinutes()
  ).padStart(2, "0")}`;

  const [availabilityResult, overlapResult] = await Promise.all([
    getSupabaseAdmin()
      .from("cleaner_availability")
      .select(
        "id, cleaner_id, available_date, start_time, end_time, is_available, created_at"
      )
      .eq("cleaner_id", cleanerId)
      .eq("available_date", booking.booking_date)
      .eq("is_available", true),
    getSupabaseAdmin()
      .from("bookings")
      .select(bookingSelect)
      .eq("assigned_cleaner_id", cleanerId)
      .neq("id", booking.id)
      .not("scheduled_start_time", "is", null)
      .not("scheduled_end_time", "is", null)
      .lt("scheduled_start_time", bookingEndTime)
      .gt("scheduled_end_time", bookingStartTime),
  ]);

  if (availabilityResult.error) {
    throw toSupabaseError(availabilityResult.error);
  }

  if (overlapResult.error) {
    throw toSupabaseError(overlapResult.error);
  }

  const bookingStartLocalTime = booking.booking_time.slice(0, 5);
  const hasAvailability = (availabilityResult.data ?? [])
    .map(mapCleanerAvailability)
    .some(
      (slot) =>
        slot.start_time.slice(0, 5) <= bookingStartLocalTime &&
        slot.end_time.slice(0, 5) >= bookingEndLocalTime
    );
  const overlappingBookings = (overlapResult.data ?? []).map(mapBookingWithService);

  return {
    cleaner,
    overlappingBookings,
    outsideAvailability: !hasAvailability,
    inactive: !cleaner.active,
    canAssign: cleaner.active && hasAvailability && overlappingBookings.length === 0,
  };
}

export async function getSupportTickets(): Promise<SupportTicket[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("support_tickets")
    .select(supportTicketSelect)
    .order("updated_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapSupportTicket);
}

export async function getCustomerSupportTickets(
  customerId: string
): Promise<SupportTicket[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("support_tickets")
    .select(supportTicketSelect)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapSupportTicket);
}

export async function getPayrollRecords(): Promise<PayrollRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("payroll_records")
    .select(payrollRecordSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapPayrollRecord);
}

export async function getCleanerEarnings(
  cleanerId?: string
): Promise<CleanerEarning[]> {
  let query = getSupabaseAdmin()
    .from("cleaner_earnings")
    .select(cleanerEarningSelect)
    .order("created_at", { ascending: false });

  if (cleanerId) {
    query = query.eq("cleaner_id", cleanerId);
  }

  const { data, error } = await query;

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapCleanerEarning);
}

export async function getNotificationsForUser(
  userId: string,
  role?: UserRole
): Promise<Notification[]> {
  let query = getSupabaseAdmin()
    .from("notifications")
    .select("id, user_id, user_role, title, message, notification_type, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (role) {
    query = query.eq("user_role", role);
  }

  const { data, error } = await query;

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapNotification);
}

export async function getPlatformSettings(): Promise<PlatformSetting[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("platform_settings")
    .select("id, setting_key, setting_value, updated_at")
    .order("setting_key", { ascending: true });

  if (error) {
    throw toSupabaseError(error);
  }

  return (data ?? []).map(mapPlatformSetting);
}

export async function getReportingSummary(): Promise<ReportingSummary> {
  const [bookings, cleaners, reviews] = await Promise.all([
    getBookings(),
    getCleaners(),
    getReviews(),
  ]);
  const completed = bookings.filter((booking) => booking.status === "Completed");
  const customerBookingCounts = new Map<string, number>();
  const serviceStats = new Map<string, { count: number; revenue: number }>();
  const monthlyStats = new Map<string, { revenue: number; bookings: number }>();
  const statusStats = new Map<BookingStatus, number>();

  for (const booking of bookings) {
    if (booking.customer_id) {
      customerBookingCounts.set(
        booking.customer_id,
        (customerBookingCounts.get(booking.customer_id) ?? 0) + 1
      );
    }

    const service = serviceStats.get(booking.service_name) ?? {
      count: 0,
      revenue: 0,
    };
    service.count += 1;
    service.revenue += booking.amount_paid;
    serviceStats.set(booking.service_name, service);

    const month = booking.booking_date.slice(0, 7);
    const monthly = monthlyStats.get(month) ?? { revenue: 0, bookings: 0 };
    monthly.revenue += booking.amount_paid;
    monthly.bookings += 1;
    monthlyStats.set(month, monthly);

    statusStats.set(booking.status, (statusStats.get(booking.status) ?? 0) + 1);
  }

  const cleanerStats = cleaners.map((cleaner) => {
    const cleanerReviews = reviews.filter(
      (review) => review.booking?.assigned_cleaner_id === cleaner.id
    );
    const averageRating = cleanerReviews.length
      ? cleanerReviews.reduce((sum, review) => sum + review.rating, 0) /
        cleanerReviews.length
      : cleaner.rating;

    return {
      cleaner,
      completedJobs: completed.filter(
        (booking) => booking.assigned_cleaner_id === cleaner.id
      ).length,
      averageRating,
    };
  });

  return {
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((booking) => booking.status === "Confirmed")
      .length,
    completedBookings: completed.length,
    cancelledBookings: bookings.filter((booking) => booking.status === "Cancelled")
      .length,
    revenue: bookings.reduce((total, booking) => total + booking.amount_paid, 0),
    outstandingBalances: bookings.reduce(
      (total, booking) => total + booking.balance_due,
      0
    ),
    averageRating: reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0,
    repeatCustomers: [...customerBookingCounts.values()].filter((count) => count > 1)
      .length,
    topServices: [...serviceStats.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topCleaners: cleanerStats
      .sort((a, b) => b.completedJobs - a.completedJobs)
      .slice(0, 5),
    monthlyRevenue: [...monthlyStats.entries()]
      .map(([month, value]) => ({ month, ...value }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12),
    bookingConversionTrends: [...statusStats.entries()].map(([status, count]) => ({
      status,
      count,
    })),
  };
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
      recurring_booking_id:
        typeof booking.recurring_booking_id === "string"
          ? booking.recurring_booking_id
          : null,
      customer_id:
        typeof booking.customer_id === "string" ? booking.customer_id : null,
      scheduled_start_time:
        typeof booking.scheduled_start_time === "string"
          ? booking.scheduled_start_time
          : null,
      scheduled_end_time:
        typeof booking.scheduled_end_time === "string"
          ? booking.scheduled_end_time
          : null,
      completed_at:
        typeof booking.completed_at === "string" ? booking.completed_at : null,
      cancelled_at:
        typeof booking.cancelled_at === "string" ? booking.cancelled_at : null,
      cancellation_reason:
        typeof booking.cancellation_reason === "string"
          ? booking.cancellation_reason
          : null,
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

function mapRecurringBooking(
  recurringBooking: Record<string, unknown> & {
    services?: { name?: string } | { name?: string }[] | null;
    customer_addresses?: Record<string, unknown> | Record<string, unknown>[] | null;
    customers?: Record<string, unknown> | Record<string, unknown>[] | null;
  }
): RecurringBooking {
  const relatedService = Array.isArray(recurringBooking.services)
    ? recurringBooking.services[0]
    : recurringBooking.services;
  const address = Array.isArray(recurringBooking.customer_addresses)
    ? recurringBooking.customer_addresses[0]
    : recurringBooking.customer_addresses;
  const customer = Array.isArray(recurringBooking.customers)
    ? recurringBooking.customers[0]
    : recurringBooking.customers;

  return {
    id: String(recurringBooking.id ?? ""),
    customer_id: String(recurringBooking.customer_id ?? ""),
    service_id: String(recurringBooking.service_id ?? ""),
    service_name:
      (recurringBooking.service_data as BookingServiceData | null)?.serviceName ??
      relatedService?.name ??
      "Unknown service",
    address_id:
      typeof recurringBooking.address_id === "string"
        ? recurringBooking.address_id
        : null,
    address: address ? mapCustomerAddress(address) : null,
    frequency: normaliseRecurringFrequency(recurringBooking.frequency),
    preferred_day: String(recurringBooking.preferred_day ?? ""),
    preferred_time: String(recurringBooking.preferred_time ?? ""),
    service_data: normaliseServiceData(recurringBooking.service_data),
    selected_addons: normaliseAddonData(recurringBooking.selected_addons),
    estimated_price: Number(recurringBooking.estimated_price ?? 0),
    status: normaliseRecurringStatus(recurringBooking.status),
    next_booking_date: String(recurringBooking.next_booking_date ?? ""),
    created_at: String(recurringBooking.created_at ?? ""),
    customer: customer ? mapCustomer(customer) : null,
  };
}

function mapAutomationLog(
  log: Record<string, unknown> & {
    bookings?: Record<string, unknown> | Record<string, unknown>[] | null;
    customers?: Record<string, unknown> | Record<string, unknown>[] | null;
  }
): AutomationLog {
  const booking = Array.isArray(log.bookings) ? log.bookings[0] : log.bookings;
  const customer = Array.isArray(log.customers) ? log.customers[0] : log.customers;

  return {
    id: String(log.id ?? ""),
    booking_id: typeof log.booking_id === "string" ? log.booking_id : null,
    customer_id: typeof log.customer_id === "string" ? log.customer_id : null,
    automation_type: normaliseAutomationType(log.automation_type),
    channel: normaliseAutomationChannel(log.channel),
    status: String(log.status ?? ""),
    sent_at: typeof log.sent_at === "string" ? log.sent_at : null,
    created_at: String(log.created_at ?? ""),
    booking: booking ? mapBookingWithService(booking) : null,
    customer: customer ? mapCustomer(customer) : null,
  };
}

function mapInvoice(
  invoice: Record<string, unknown> & {
    bookings?: Record<string, unknown> | Record<string, unknown>[] | null;
    customers?: Record<string, unknown> | Record<string, unknown>[] | null;
  }
): Invoice {
  const booking = Array.isArray(invoice.bookings)
    ? invoice.bookings[0]
    : invoice.bookings;
  const customer = Array.isArray(invoice.customers)
    ? invoice.customers[0]
    : invoice.customers;

  return {
    id: String(invoice.id ?? ""),
    booking_id: String(invoice.booking_id ?? ""),
    customer_id: typeof invoice.customer_id === "string" ? invoice.customer_id : null,
    invoice_number: String(invoice.invoice_number ?? ""),
    invoice_status: normaliseInvoiceStatus(invoice.invoice_status),
    subtotal: Number(invoice.subtotal ?? 0),
    total: Number(invoice.total ?? 0),
    amount_paid: Number(invoice.amount_paid ?? 0),
    balance_due: Number(invoice.balance_due ?? 0),
    issued_at: typeof invoice.issued_at === "string" ? invoice.issued_at : null,
    paid_at: typeof invoice.paid_at === "string" ? invoice.paid_at : null,
    created_at: String(invoice.created_at ?? ""),
    booking: booking ? mapBookingWithService(booking) : null,
    customer: customer ? mapCustomer(customer) : null,
  };
}

function mapReview(
  review: Record<string, unknown> & {
    bookings?: Record<string, unknown> | Record<string, unknown>[] | null;
    customers?: Record<string, unknown> | Record<string, unknown>[] | null;
  }
): Review {
  const booking = Array.isArray(review.bookings) ? review.bookings[0] : review.bookings;
  const customer = Array.isArray(review.customers)
    ? review.customers[0]
    : review.customers;

  return {
    id: String(review.id ?? ""),
    booking_id: String(review.booking_id ?? ""),
    customer_id: String(review.customer_id ?? ""),
    rating: Number(review.rating ?? 0),
    review_text: String(review.review_text ?? ""),
    public: Boolean(review.public),
    created_at: String(review.created_at ?? ""),
    booking: booking ? mapBookingWithService(booking) : null,
    customer: customer ? mapCustomer(customer) : null,
  };
}

function mapRecurringPlanChangeRequest(
  request: Record<string, unknown>
): RecurringPlanChangeRequest {
  return {
    id: String(request.id ?? ""),
    recurring_booking_id: String(request.recurring_booking_id ?? ""),
    customer_id: String(request.customer_id ?? ""),
    requested_changes: String(request.requested_changes ?? ""),
    request_status: normaliseRequestStatus(request.request_status),
    admin_notes:
      typeof request.admin_notes === "string" ? request.admin_notes : null,
    created_at: String(request.created_at ?? ""),
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
    user_id: typeof cleaner.user_id === "string" ? cleaner.user_id : null,
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
    jobStatus === "Accepted" ||
    jobStatus === "Declined" ||
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
    status === "Pending Confirmation" ||
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

function normaliseRecurringFrequency(value: unknown): RecurringFrequency {
  const frequency = String(value ?? "Weekly");

  if (frequency === "Bi-weekly" || frequency === "Monthly") {
    return frequency;
  }

  return "Weekly";
}

function normaliseRecurringStatus(value: unknown): RecurringBookingStatus {
  const status = String(value ?? "Active");

  if (status === "Paused" || status === "Cancelled") {
    return status;
  }

  return "Active";
}

function normaliseAutomationType(value: unknown): AutomationType {
  const type = String(value ?? "Booking Reminder");

  if (
    type === "Cleaner Reminder" ||
    type === "Payment Reminder" ||
    type === "Post-Cleaning Follow-Up" ||
    type === "Review Request" ||
    type === "Invoice Sent"
  ) {
    return type;
  }

  return "Booking Reminder";
}

function normaliseAutomationChannel(value: unknown): AutomationChannel {
  return value === "WhatsApp" ? "WhatsApp" : "Email";
}

function normaliseInvoiceStatus(value: unknown): InvoiceStatus {
  const status = String(value ?? "Draft");

  if (
    status === "Sent" ||
    status === "Paid" ||
    status === "Partially Paid" ||
    status === "Cancelled"
  ) {
    return status;
  }

  return "Draft";
}

function mapSupportTicket(
  ticket: Record<string, unknown> & {
    customers?: Record<string, unknown> | Record<string, unknown>[] | null;
    bookings?: Record<string, unknown> | Record<string, unknown>[] | null;
    support_messages?: Record<string, unknown>[] | Record<string, unknown> | null;
  }
): SupportTicket {
  const customer = Array.isArray(ticket.customers)
    ? ticket.customers[0]
    : ticket.customers;
  const booking = Array.isArray(ticket.bookings) ? ticket.bookings[0] : ticket.bookings;
  const messages = Array.isArray(ticket.support_messages)
    ? ticket.support_messages
    : ticket.support_messages && typeof ticket.support_messages === "object"
      ? [ticket.support_messages]
      : [];

  return {
    id: String(ticket.id ?? ""),
    customer_id:
      typeof ticket.customer_id === "string" ? ticket.customer_id : null,
    booking_id: typeof ticket.booking_id === "string" ? ticket.booking_id : null,
    subject: String(ticket.subject ?? ""),
    message: String(ticket.message ?? ""),
    status: normaliseSupportTicketStatus(ticket.status),
    priority: normaliseSupportPriority(ticket.priority),
    assigned_admin_id:
      typeof ticket.assigned_admin_id === "string"
        ? ticket.assigned_admin_id
        : null,
    created_at: String(ticket.created_at ?? ""),
    updated_at: String(ticket.updated_at ?? ticket.created_at ?? ""),
    customer: customer ? mapCustomer(customer) : null,
    booking: booking ? mapBookingWithService(booking) : null,
    messages: messages.map(mapSupportMessage).sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }),
  };
}

function mapSupportMessage(message: Record<string, unknown>): SupportMessage {
  return {
    id: String(message.id ?? ""),
    ticket_id: String(message.ticket_id ?? ""),
    sender_id: typeof message.sender_id === "string" ? message.sender_id : null,
    sender_role: normaliseUserRole(message.sender_role),
    message: String(message.message ?? ""),
    created_at: String(message.created_at ?? ""),
  };
}

function mapPayrollRecord(
  record: Record<string, unknown> & {
    cleaners?: Record<string, unknown> | Record<string, unknown>[] | null;
    bookings?: Record<string, unknown> | Record<string, unknown>[] | null;
  }
): PayrollRecord {
  const cleaner = Array.isArray(record.cleaners)
    ? record.cleaners[0]
    : record.cleaners;
  const booking = Array.isArray(record.bookings) ? record.bookings[0] : record.bookings;

  return {
    id: String(record.id ?? ""),
    cleaner_id: String(record.cleaner_id ?? ""),
    booking_id: typeof record.booking_id === "string" ? record.booking_id : null,
    amount: Number(record.amount ?? 0),
    bonus: Number(record.bonus ?? 0),
    deduction: Number(record.deduction ?? 0),
    status: normalisePayrollStatus(record.status),
    paid_at: typeof record.paid_at === "string" ? record.paid_at : null,
    created_at: String(record.created_at ?? ""),
    cleaner: cleaner ? mapCleaner(cleaner) : null,
    booking: booking ? mapBookingWithService(booking) : null,
  };
}

function mapCleanerEarning(
  earning: Record<string, unknown> & {
    cleaners?: Record<string, unknown> | Record<string, unknown>[] | null;
    bookings?: Record<string, unknown> | Record<string, unknown>[] | null;
  }
): CleanerEarning {
  const cleaner = Array.isArray(earning.cleaners)
    ? earning.cleaners[0]
    : earning.cleaners;
  const booking = Array.isArray(earning.bookings)
    ? earning.bookings[0]
    : earning.bookings;

  return {
    id: String(earning.id ?? ""),
    cleaner_id: String(earning.cleaner_id ?? ""),
    booking_id: typeof earning.booking_id === "string" ? earning.booking_id : null,
    gross_amount: Number(earning.gross_amount ?? 0),
    platform_fee: Number(earning.platform_fee ?? 0),
    net_amount: Number(earning.net_amount ?? 0),
    status: normalisePayrollStatus(earning.status),
    created_at: String(earning.created_at ?? ""),
    cleaner: cleaner ? mapCleaner(cleaner) : null,
    booking: booking ? mapBookingWithService(booking) : null,
  };
}

function mapNotification(notification: Record<string, unknown>): Notification {
  return {
    id: String(notification.id ?? ""),
    user_id: String(notification.user_id ?? ""),
    user_role: normaliseUserRole(notification.user_role),
    title: String(notification.title ?? ""),
    message: String(notification.message ?? ""),
    notification_type: String(notification.notification_type ?? ""),
    read: Boolean(notification.read),
    created_at: String(notification.created_at ?? ""),
  };
}

function mapPlatformSetting(setting: Record<string, unknown>): PlatformSetting {
  const value = setting.setting_value;

  return {
    id: String(setting.id ?? ""),
    setting_key: String(setting.setting_key ?? ""),
    setting_value:
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {},
    updated_at: String(setting.updated_at ?? ""),
  };
}

function normaliseSupportTicketStatus(value: unknown): SupportTicketStatus {
  const status = String(value ?? "Open");

  if (
    status === "In Progress" ||
    status === "Waiting For Customer" ||
    status === "Resolved" ||
    status === "Closed"
  ) {
    return status;
  }

  return "Open";
}

function normaliseSupportPriority(value: unknown): SupportPriority {
  const priority = String(value ?? "Medium");

  if (priority === "Low" || priority === "High" || priority === "Urgent") {
    return priority;
  }

  return "Medium";
}

function normalisePayrollStatus(value: unknown): PayrollStatus {
  const status = String(value ?? "Pending");

  if (status === "Approved" || status === "Paid" || status === "Disputed") {
    return status;
  }

  return "Pending";
}

function normaliseUserRole(value: unknown): UserRole {
  const role = String(value ?? "customer");

  if (role === "cleaner" || role === "admin") {
    return role;
  }

  return "customer";
}

function getBookingStart(booking: BookingWithService) {
  return new Date(
    booking.scheduled_start_time ??
      `${booking.booking_date}T${booking.booking_time.slice(0, 5)}:00`
  );
}

function getBookingEnd(booking: BookingWithService) {
  if (booking.scheduled_end_time) {
    return new Date(booking.scheduled_end_time);
  }

  const start = getBookingStart(booking);
  start.setHours(start.getHours() + 3);
  return start;
}

function normaliseServiceData(value: unknown): BookingServiceData {
  if (value && typeof value === "object") {
    const data = value as Partial<BookingServiceData>;

    return {
      serviceSlug: String(data.serviceSlug ?? ""),
      serviceName: String(data.serviceName ?? "Unknown service"),
      cleanerSelectionType:
        data.cleanerSelectionType === "preferred" ? "preferred" : "auto",
      preferredCleanerId:
        typeof data.preferredCleanerId === "string"
          ? data.preferredCleanerId
          : "",
      preferredCleanerName:
        typeof data.preferredCleanerName === "string"
          ? data.preferredCleanerName
          : "",
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
    cleanerSelectionType: "auto",
    preferredCleanerId: "",
    preferredCleanerName: "",
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
