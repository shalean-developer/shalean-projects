import { hasSupabaseConfig, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseSchemaMissingError, toSupabaseError } from "@/lib/supabase/errors";

export type PaymentSchemaStatus = {
  ready: boolean;
  message?: string;
};

const missingPaymentSchemaMessage =
  "The Supabase V1.3 payments migration has not been applied yet. Run supabase/migrations/20260601234500_payments_confirmations_v13.sql in the Supabase SQL Editor, then refresh the schema cache.";

export async function getPaymentSchemaStatus(): Promise<PaymentSchemaStatus> {
  if (!hasSupabaseConfig()) {
    return {
      ready: false,
      message:
        "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your local environment.",
    };
  }

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

  const normalizedError = toSupabaseError(schemaError);

  if (isSupabaseSchemaMissingError(normalizedError)) {
    return {
      ready: false,
      message: missingPaymentSchemaMessage,
    };
  }

  throw normalizedError;
}
