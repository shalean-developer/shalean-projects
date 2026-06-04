import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient, hasSupabaseAuthConfig } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  isSupabaseSchemaMissingError,
  toSupabaseError,
} from "@/lib/supabase/errors";
import { getCleanerByUserIdOrEmail } from "@/lib/supabase/queries";
import type { CleanerWithAvailability, Customer } from "@/lib/types";

export async function getCurrentUser() {
  if (!hasSupabaseAuthConfig()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function requireUser(redirectTo = "/account") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return user;
}

export async function requireCustomer(redirectTo = "/account") {
  const user = await requireUser(redirectTo);
  const customer = await ensureCustomerForUser(user);

  return { user, customer };
}

export async function getOptionalCustomer() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return {
    user,
    customer: await ensureCustomerForUser(user),
  };
}

export async function requireAdmin(redirectTo = "/admin") {
  const user = await requireUser(redirectTo);

  if (!isAdminUser(user)) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  await ensureAdminForUser(user);

  return user;
}

export async function requireCleaner(redirectTo = "/cleaner") {
  const user = await requireUser(redirectTo);
  const cleaner = await getCleanerByUser(user);

  if (!cleaner || !cleaner.active) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return { user, cleaner };
}

export async function getOptionalCleaner() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const cleaner = await getCleanerByUser(user);

  if (!cleaner) {
    return null;
  }

  return { user, cleaner };
}

export function isAdminUser(user: User) {
  const role = getUserDeclaredRole(user);
  const configuredAdminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return (
    role === "admin" ||
    Boolean(user.email && configuredAdminEmails.includes(user.email.toLowerCase()))
  );
}

async function getCleanerByUser(
  user: User
): Promise<CleanerWithAvailability | null> {
  return getCleanerByUserIdOrEmail(user.id, user.email);
}

export async function ensureCustomerForUser(user: User): Promise<Customer> {
  if (getUserDeclaredRole(user) === "cleaner" || isAdminUser(user)) {
    throw new Error("This authenticated user is not a customer.");
  }

  const cleaner = await getCleanerByUser(user);

  if (cleaner) {
    throw new Error("Cleaner accounts cannot be used as customer profiles.");
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("customers")
    .select("id, user_id, full_name, email, phone, created_at")
    .eq("user_id", user.id)
    .eq("account_role", "customer")
    .maybeSingle();

  if (existingError) {
    throw toSupabaseError(existingError);
  }

  if (existing) {
    return mapCustomer(existing);
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      user_id: user.id,
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : user.email?.split("@")[0] ?? "Shalean customer",
      email: user.email ?? "",
      phone:
        typeof user.user_metadata?.phone === "string"
          ? user.user_metadata.phone
          : null,
      account_role: "customer",
    })
    .select("id, user_id, full_name, email, phone, created_at")
    .single();

  if (error) {
    throw toSupabaseError(error);
  }

  return mapCustomer(data);
}

async function ensureAdminForUser(user: User) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("admins").upsert(
    {
      user_id: user.id,
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : user.email?.split("@")[0] ?? "Admin",
      email: user.email ?? "",
      phone:
        typeof user.user_metadata?.phone === "string"
          ? user.user_metadata.phone
          : null,
      permission_level:
        typeof user.app_metadata?.permission_level === "string"
          ? user.app_metadata.permission_level
          : "Admin",
      status: "Active",
    },
    { onConflict: "user_id" }
  );

  if (error) {
    const normalizedError = toSupabaseError(error);

    if (isSupabaseSchemaMissingError(normalizedError)) {
      return;
    }

    throw normalizedError;
  }
}

function getUserDeclaredRole(user: User) {
  return String(user.app_metadata?.role ?? user.user_metadata?.role ?? "");
}

function mapCustomer(customer: Record<string, unknown>): Customer {
  return {
    id: String(customer.id ?? ""),
    user_id: typeof customer.user_id === "string" ? customer.user_id : null,
    full_name: String(customer.full_name ?? ""),
    email: String(customer.email ?? ""),
    phone: typeof customer.phone === "string" ? customer.phone : null,
    created_at: String(customer.created_at ?? ""),
  };
}
