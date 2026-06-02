export class SupabaseSchemaMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseSchemaMissingError";
  }
}

export class SupabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConnectionError";
  }
}

export function toSupabaseError(error: unknown) {
  if (isSchemaMissingError(error)) {
    return new SupabaseSchemaMissingError(
      "The Supabase V1.3 payments migration has not been applied yet. Run supabase/migrations/20260601234500_payments_confirmations_v13.sql in the Supabase SQL Editor, then refresh the schema cache."
    );
  }

  if (isConnectionError(error)) {
    return new SupabaseConnectionError(
      "Supabase is configured, but the app could not connect to it. Check SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, network access, and whether the Supabase project is running."
    );
  }

  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return new Error(String((error as { message?: unknown }).message));
  }

  return new Error("Unexpected Supabase error.");
}

export function isSupabaseSchemaMissingError(error: unknown) {
  return error instanceof SupabaseSchemaMissingError;
}

export function isSupabaseConnectionError(error: unknown) {
  return error instanceof SupabaseConnectionError;
}

function isSchemaMissingError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const supabaseError = error as { code?: string; message?: string };

  const message = supabaseError.message?.toLowerCase() ?? "";

  return (
    supabaseError.code === "PGRST204" ||
    supabaseError.code === "PGRST205" ||
    message.includes("schema cache") ||
    (message.includes("could not find") && message.includes("column")) ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

function isConnectionError(error: unknown) {
  if (!error) {
    return false;
  }

  if (error instanceof Error) {
    return isConnectionMessage(error.message);
  }

  if (typeof error === "object" && "message" in error) {
    return isConnectionMessage(String((error as { message?: unknown }).message));
  }

  return false;
}

function isConnectionMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound") ||
    normalized.includes("etimedout")
  );
}
