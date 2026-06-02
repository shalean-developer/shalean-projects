export type CleaningService = {
  id: string;
  name: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  active: boolean;
  created_at: string;
};

export type BookingStatus =
  | "Pending Payment"
  | "Confirmed"
  | "Completed"
  | "Cancelled";

export const bookingStatuses: BookingStatus[] = [
  "Pending Payment",
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
  | "On The Way"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export const jobStatuses: JobStatus[] = [
  "Not Assigned",
  "Assigned",
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
  full_name: string;
  email: string;
  phone: string;
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
  notes: string | null;
  service_data: BookingServiceData;
  selected_addons: BookingAddonData[];
  estimated_price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_type: PaymentType | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  confirmed_at: string | null;
  latest_payment: Payment | null;
  payments: Payment[];
  assigned_cleaner_id: string | null;
  job_status: JobStatus;
  assigned_cleaner: Cleaner | null;
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
