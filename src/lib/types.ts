export type CleaningService = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  base_price: number;
  room_price: number;
  bathroom_price: number;
  service_fee_type: "flat" | "percentage";
  service_fee_amount: number;
  duration_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type BookingStatus =
  | "Draft"
  | "Pending Invoice"
  | "Invoiced"
  | "Paid"
  | "Pending Payment"
  | "Pending Confirmation"
  | "Confirmed"
  | "Completed"
  | "Cancelled";

export const bookingStatuses: BookingStatus[] = [
  "Draft",
  "Pending Invoice",
  "Invoiced",
  "Paid",
  "Pending Payment",
  "Pending Confirmation",
  "Confirmed",
  "Completed",
  "Cancelled",
];

export type PaymentStatus =
  | "Pending Payment"
  | "Deposit Paid"
  | "Paid"
  | "Failed"
  | "Refunded";

export const paymentStatuses: PaymentStatus[] = [
  "Pending Payment",
  "Deposit Paid",
  "Paid",
  "Failed",
  "Refunded",
];

export const paymentTypes = ["Deposit", "Full Payment"] as const;

export type PaymentType = (typeof paymentTypes)[number];

export type JobStatus =
  | "Not Assigned"
  | "Assigned"
  | "Accepted"
  | "Declined"
  | "On The Way"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export const jobStatuses: JobStatus[] = [
  "Not Assigned",
  "Assigned",
  "Accepted",
  "Declined",
  "On The Way",
  "In Progress",
  "Completed",
  "Cancelled",
];

export type AssignmentStatus = "Assigned" | "Reassigned" | "Cancelled";

export const assignmentStatuses: AssignmentStatus[] = [
  "Assigned",
  "Reassigned",
  "Cancelled",
];

export type RequestType = "Reschedule" | "Cancel";

export const requestTypes: RequestType[] = ["Reschedule", "Cancel"];

export type RequestStatus = "Pending" | "Approved" | "Declined";

export const requestStatuses: RequestStatus[] = [
  "Pending",
  "Approved",
  "Declined",
];

export type Customer = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

export type CustomerAddress = {
  id: string;
  customer_id: string;
  label: string;
  address: string;
  suburb: string;
  city: string;
  access_instructions: string | null;
  gate_code: string | null;
  parking_instructions: string | null;
  is_default: boolean;
  created_at: string;
};

export type CleanerSpecialty =
  | "Regular Cleaning"
  | "Airbnb Cleaning"
  | "Office Cleaning"
  | "Carpet Cleaning"
  | "Moving Cleaning"
  | "Deep Cleaning";

export const cleanerSpecialties: CleanerSpecialty[] = [
  "Regular Cleaning",
  "Airbnb Cleaning",
  "Office Cleaning",
  "Carpet Cleaning",
  "Moving Cleaning",
  "Deep Cleaning",
];

export type Cleaner = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  role: "Cleaner" | "Team Leader";
  started_at: string | null;
  profile_photo: string | null;
  bio: string | null;
  specialties: CleanerSpecialty[];
  rating: number;
  completed_jobs: number;
  active: boolean;
  created_at: string;
};

export type CleanerAvailability = {
  id: string;
  cleaner_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
};

export type CleanerWithAvailability = Cleaner & {
  availability: CleanerAvailability[];
};

export type BookingAssignment = {
  id: string;
  booking_id: string;
  cleaner_id: string;
  assignment_status: AssignmentStatus;
  is_team_leader: boolean;
  assigned_at: string;
  created_at: string;
  cleaner?: Cleaner | null;
};

export type Payment = {
  id: string;
  booking_id: string;
  payment_reference: string;
  paystack_reference: string | null;
  payment_type: PaymentType;
  amount_due: number;
  amount_paid: number;
  currency: string;
  payment_status: PaymentStatus;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
};

export type BookingServiceData = {
  serviceSlug: string;
  serviceName: string;
  pricingBreakdown?: {
    basePrice: number;
    roomCount: number;
    roomTotal: number;
    bathroomCount: number;
    bathroomTotal: number;
    addonTotal: number;
    specialPricingTotal: number;
    subtotal: number;
    serviceFee: number;
    total: number;
  };
  cleanerSelectionType?: "auto" | "preferred";
  preferredCleanerId?: string;
  preferredCleanerName?: string;
  numberOfCleaners?: number;
  recurringSetup?: {
    frequency: "Weekly" | "Bi-weekly" | "Monthly";
    preferredDay: string;
    preferredTime: string;
    firstBookingDate: string;
    addressId: string | null;
  } | null;
  questions: {
    id: string;
    label: string;
    value: string | number;
  }[];
};

export type BookingAddonData = {
  id: string;
  label: string;
  price: number;
};

export type BookingWithService = {
  id: string;
  booking_reference: string;
  recurring_booking_id: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_id: string;
  service_name: string;
  address: string;
  suburb: string;
  city: string;
  booking_date: string;
  booking_time: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  notes: string | null;
  service_data: BookingServiceData;
  selected_addons: BookingAddonData[];
  estimated_price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_type: PaymentType | null;
  total_amount: number;
  number_of_cleaners: number;
  amount_paid: number;
  balance_due: number;
  confirmed_at: string | null;
  latest_payment: Payment | null;
  payments: Payment[];
  assigned_cleaner_id: string | null;
  job_status: JobStatus;
  assigned_cleaner: Cleaner | null;
  assignments: BookingAssignment[];
  assigned_cleaners: Cleaner[];
  can_reschedule: boolean;
  can_cancel: boolean;
  created_at: string;
};

export type BookingRequest = {
  id: string;
  booking_id: string;
  customer_id: string;
  request_type: RequestType;
  requested_date: string | null;
  requested_time: string | null;
  reason: string;
  request_status: RequestStatus;
  admin_notes: string | null;
  created_at: string;
  booking?: BookingWithService | null;
  customer?: Customer | null;
};

export type RecurringFrequency = "Weekly" | "Bi-weekly" | "Monthly";

export const recurringFrequencies: RecurringFrequency[] = [
  "Weekly",
  "Bi-weekly",
  "Monthly",
];

export type RecurringBookingStatus = "Active" | "Paused" | "Cancelled";

export const recurringBookingStatuses: RecurringBookingStatus[] = [
  "Active",
  "Paused",
  "Cancelled",
];

export type AutomationType =
  | "Booking Reminder"
  | "Cleaner Reminder"
  | "Payment Reminder"
  | "Post-Cleaning Follow-Up"
  | "Review Request"
  | "Invoice Sent";

export const automationTypes: AutomationType[] = [
  "Booking Reminder",
  "Cleaner Reminder",
  "Payment Reminder",
  "Post-Cleaning Follow-Up",
  "Review Request",
  "Invoice Sent",
];

export type AutomationChannel = "Email" | "WhatsApp";

export const automationChannels: AutomationChannel[] = ["Email", "WhatsApp"];

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Paid"
  | "Partially Paid"
  | "Cancelled";

export const invoiceStatuses: InvoiceStatus[] = [
  "Draft",
  "Sent",
  "Paid",
  "Partially Paid",
  "Cancelled",
];

export type RecurringBooking = {
  id: string;
  customer_id: string;
  service_id: string;
  service_name: string;
  address_id: string | null;
  address: CustomerAddress | null;
  frequency: RecurringFrequency;
  preferred_day: string;
  preferred_time: string;
  service_data: BookingServiceData;
  selected_addons: BookingAddonData[];
  estimated_price: number;
  status: RecurringBookingStatus;
  next_booking_date: string;
  created_at: string;
  customer?: Customer | null;
};

export type AutomationLog = {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  automation_type: AutomationType;
  channel: AutomationChannel;
  status: string;
  sent_at: string | null;
  created_at: string;
  booking?: BookingWithService | null;
  customer?: Customer | null;
};

export type Review = {
  id: string;
  booking_id: string;
  customer_id: string;
  rating: number;
  review_text: string;
  public: boolean;
  created_at: string;
  booking?: BookingWithService | null;
  customer?: Customer | null;
};

export type Invoice = {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  invoice_number: string;
  invoice_status: InvoiceStatus;
  subtotal: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  due_date: string | null;
  payment_link: string | null;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
  line_items: InvoiceLineItem[];
  booking?: BookingWithService | null;
  customer?: Customer | null;
};

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  booking_id: string;
  description: string;
  service_type: string;
  booking_date: string;
  amount: number;
  created_at: string;
  booking?: BookingWithService | null;
};

export type RecurringPlanChangeRequest = {
  id: string;
  recurring_booking_id: string;
  customer_id: string;
  requested_changes: string;
  request_status: RequestStatus;
  admin_notes: string | null;
  created_at: string;
};

export type SupportTicketStatus =
  | "Open"
  | "In Progress"
  | "Waiting For Customer"
  | "Resolved"
  | "Closed";

export const supportTicketStatuses: SupportTicketStatus[] = [
  "Open",
  "In Progress",
  "Waiting For Customer",
  "Resolved",
  "Closed",
];

export type SupportPriority = "Low" | "Medium" | "High" | "Urgent";

export const supportPriorities: SupportPriority[] = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

export type UserRole = "customer" | "cleaner" | "admin";

export type SupportTicket = {
  id: string;
  customer_id: string | null;
  booking_id: string | null;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority: SupportPriority;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
  booking?: BookingWithService | null;
  messages?: SupportMessage[];
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_role: UserRole;
  message: string;
  created_at: string;
};

export type PayrollStatus = "Pending" | "Approved" | "Paid" | "Disputed";

export const payrollStatuses: PayrollStatus[] = [
  "Pending",
  "Approved",
  "Paid",
  "Disputed",
];

export type PayrollRecord = {
  id: string;
  cleaner_id: string;
  booking_id: string | null;
  amount: number;
  bonus: number;
  deduction: number;
  status: PayrollStatus;
  paid_at: string | null;
  created_at: string;
  cleaner?: Cleaner | null;
  booking?: BookingWithService | null;
};

export type CleanerEarning = {
  id: string;
  cleaner_id: string;
  booking_id: string | null;
  gross_amount: number;
  platform_fee: number;
  booking_amount: number;
  service_fee: number;
  net_booking_value: number;
  cleaner_percentage: number | null;
  cleaner_role: "Cleaner" | "Team Leader";
  tenure_months: number;
  calculation_details: Record<string, unknown>;
  net_amount: number;
  status: PayrollStatus;
  created_at: string;
  cleaner?: Cleaner | null;
  booking?: BookingWithService | null;
};

export type Notification = {
  id: string;
  user_id: string;
  user_role: UserRole;
  title: string;
  message: string;
  notification_type: string;
  read: boolean;
  created_at: string;
};

export type PlatformSetting = {
  id: string;
  setting_key: string;
  setting_value: Record<string, unknown>;
  updated_at: string;
};

export type PricingHistory = {
  id: string;
  service_id: string | null;
  changed_by: string | null;
  change_type: string;
  snapshot: Record<string, unknown>;
  created_at: string;
};

export type ScheduleConflict = {
  cleaner: Cleaner;
  overlappingBookings: BookingWithService[];
  outsideAvailability: boolean;
  inactive: boolean;
  canAssign: boolean;
};

export type ReportingSummary = {
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  revenue: number;
  outstandingBalances: number;
  averageRating: number;
  repeatCustomers: number;
  topServices: { name: string; count: number; revenue: number }[];
  topCleaners: { cleaner: Cleaner; completedJobs: number; averageRating: number }[];
  monthlyRevenue: { month: string; revenue: number; bookings: number }[];
  bookingConversionTrends: { status: BookingStatus; count: number }[];
};
