import { hasSupabaseConfig, getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  isSupabaseConnectionError,
  isSupabaseSchemaMissingError,
  toSupabaseError,
} from "@/lib/supabase/errors";

export type PaymentSchemaStatus = {
  ready: boolean;
  message?: string;
};

const missingPaymentSchemaMessage =
  "The Supabase V1.3 payments migration has not been applied yet. Run supabase/migrations/20260601234500_payments_confirmations_v13.sql in the Supabase SQL Editor, then refresh the schema cache.";

const missingV15SchemaMessage =
  "The Supabase V1.5 automation and recurring bookings migration has not been applied yet. Run supabase/migrations/20260602100000_automation_recurring_v15.sql in the Supabase SQL Editor, then refresh the schema cache.";

const supabaseConnectionMessage =
  "Supabase is configured, but the app could not connect to it. Check SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, network access, and whether the Supabase project is running.";

export async function getPaymentSchemaStatus(): Promise<PaymentSchemaStatus> {
  if (!hasSupabaseConfig()) {
    return {
      ready: false,
      message:
        "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your local environment.",
    };
  }

  try {
    const supabase = getSupabaseAdmin();
    const [bookingColumns, paymentsTable] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, payment_status, payment_type, total_amount, amount_paid, balance_due, confirmed_at"
        )
        .limit(1),
      supabase.from("payments").select("id").limit(1),
    ]);

    const schemaError = bookingColumns.error ?? paymentsTable.error;

    if (!schemaError) {
      return { ready: true };
    }

    return schemaStatusFromError(schemaError, missingPaymentSchemaMessage);
  } catch (error) {
    return schemaStatusFromError(error, missingPaymentSchemaMessage);
  }
}

export async function getV15SchemaStatus(): Promise<PaymentSchemaStatus> {
  if (!hasSupabaseConfig()) {
    return {
      ready: false,
      message:
        "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your local environment.",
    };
  }

  try {
    const supabase = getSupabaseAdmin();
    const checks = await Promise.all([
      supabase
        .from("recurring_bookings")
        .select(
          "id, customer_id, service_id, address_id, frequency, preferred_day, preferred_time, service_data, selected_addons, estimated_price, status, next_booking_date, created_at"
        )
        .limit(1),
      supabase
        .from("automation_logs")
        .select("id, booking_id, customer_id, automation_type, channel, status, sent_at, created_at")
        .limit(1),
      supabase
        .from("reviews")
        .select("id, booking_id, customer_id, rating, review_text, public, created_at")
        .limit(1),
      supabase
        .from("invoices")
        .select(
          "id, booking_id, customer_id, invoice_number, invoice_status, subtotal, total, amount_paid, balance_due, due_date, payment_link, issued_at, paid_at, created_at"
        )
        .limit(1),
      supabase
        .from("invoice_line_items")
        .select("id, invoice_id, booking_id, description, service_type, booking_date, amount, created_at")
        .limit(1),
    ]);

    const schemaError = checks.find((check) => check.error)?.error;

    if (!schemaError) {
      return { ready: true };
    }

    return schemaStatusFromError(schemaError, missingV15SchemaMessage);
  } catch (error) {
    return schemaStatusFromError(error, missingV15SchemaMessage);
  }
}

function schemaStatusFromError(
  error: unknown,
  schemaMissingMessage: string
): PaymentSchemaStatus {
  const normalizedError = toSupabaseError(error);

  if (isSupabaseSchemaMissingError(normalizedError)) {
    return {
      ready: false,
      message: schemaMissingMessage,
    };
  }

  if (isSupabaseConnectionError(normalizedError)) {
    return {
      ready: false,
      message: supabaseConnectionMessage,
    };
  }

  throw normalizedError;
}
