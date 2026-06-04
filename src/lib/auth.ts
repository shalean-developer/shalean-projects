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
  const customer = await getCustomerForAccountUser(user);

  return { user, customer };
}

export async function getOptionalCustomer() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (await shouldUseAdminDashboard(user)) {
    return null;
  }

  if (await shouldUseCleanerDashboard(user)) {
    return null;
  }

  const customer = await findCustomerForUser(user);

  if (!customer) {
    return null;
  }

  return {
    user,
    customer,
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

async function getCustomerForAccountUser(user: User): Promise<Customer> {
  if (await shouldUseAdminDashboard(user)) {
    redirect("/admin");
  }

  if (await shouldUseCleanerDashboard(user)) {
    redirect("/cleaner");
  }

  const customer = await findCustomerForUser(user);

  if (!customer) {
    redirect(`/signup?redirect=${encodeURIComponent("/account")}`);
  }

  return customer;
}

async function shouldUseAdminDashboard(user: User) {
  if (isAdminUser(user)) {
    return true;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("admins")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    const normalizedError = toSupabaseError(error);

    if (isSupabaseSchemaMissingError(normalizedError)) {
      return false;
    }

    throw normalizedError;
  }

  return Boolean(data && data.status !== "Inactive");
}

async function shouldUseCleanerDashboard(user: User) {
  return Boolean(await getCleanerByUser(user));
}

async function findCustomerForUser(user: User): Promise<Customer | null> {
  const supabase = getSupabaseAdmin();
  let { data, error } = await supabase
    .from("customers")
    .select("id, user_id, full_name, email, phone, created_at")
    .eq("user_id", user.id)
    .eq("account_role", "customer")
    .maybeSingle();

  if (error) {
    const normalizedError = toSupabaseError(error);

    if (!isSupabaseSchemaMissingError(normalizedError)) {
      throw normalizedError;
    }

    const legacyResult = await supabase
      .from("customers")
      .select("id, user_id, full_name, email, phone, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    throw toSupabaseError(error);
  }

  return data ? mapCustomer(data) : null;
}

export async function ensureCustomerForUser(user: User): Promise<Customer> {
  if (await shouldUseAdminDashboard(user)) {
    redirect("/admin");
  }

  if (await shouldUseCleanerDashboard(user)) {
    redirect("/cleaner");
  }

  const supabase = getSupabaseAdmin();
  let { data: existing, error: existingError } = await supabase
    .from("customers")
    .select("id, user_id, full_name, email, phone, created_at")
    .eq("user_id", user.id)
    .eq("account_role", "customer")
    .maybeSingle();

  if (existingError) {
    const normalizedError = toSupabaseError(existingError);

    if (!isSupabaseSchemaMissingError(normalizedError)) {
      throw normalizedError;
    }

    const legacyResult = await supabase
      .from("customers")
      .select("id, user_id, full_name, email, phone, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    existing = legacyResult.data;
    existingError = legacyResult.error;
  }

  if (existingError) {
    throw toSupabaseError(existingError);
  }

  if (existing) {
    return mapCustomer(existing);
  }

  const customerPayload = {
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
  };
  let { data, error } = await supabase
    .from("customers")
    .insert(customerPayload)
    .select("id, user_id, full_name, email, phone, created_at")
    .single();

  if (error) {
    const normalizedError = toSupabaseError(error);

    if (!isSupabaseSchemaMissingError(normalizedError)) {
      throw normalizedError;
    }

    const legacyPayload = { ...customerPayload };
    delete (legacyPayload as Partial<typeof customerPayload>).account_role;
    const legacyResult = await supabase
      .from("customers")
      .insert(legacyPayload)
      .select("id, user_id, full_name, email, phone, created_at")
      .single();

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    throw toSupabaseError(error);
  }

  if (!data) {
    throw new Error("Customer profile was created but no id was returned.");
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
    user_id: String(customer.user_id ?? ""),
    full_name: String(customer.full_name ?? ""),
    email: String(customer.email ?? ""),
    phone: typeof customer.phone === "string" ? customer.phone : null,
    created_at: String(customer.created_at ?? ""),
  };
}
