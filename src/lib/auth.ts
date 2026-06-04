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

export type AuthRole = "customer" | "cleaner" | "admin";

export class RoleConflictError extends Error {
  constructor(message = "This account is linked to more than one role. Contact Shalean support to fix the account before continuing.") {
    super(message);
    this.name = "RoleConflictError";
  }
}

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
    redirect(`${getLoginPathForRoute(redirectTo)}?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return user;
}

export async function requireCustomer(redirectTo = "/account") {
  const user = await requireUser(redirectTo);
  const role = await getCurrentUserRole(user.id);

  if (role === "admin") {
    redirect("/admin");
  }

  if (role === "cleaner") {
    redirect("/cleaner");
  }

  if (role !== "customer") {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const customer = await getCustomerForAccountUser(user);

  return { user, customer };
}

export async function getOptionalCustomer() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if ((await getCurrentUserRole(user.id)) !== "customer") {
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
  const role = await getCurrentUserRole(user.id);

  if (role !== "admin") {
    redirect(`/admin-login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return user;
}

export async function requireCleaner(redirectTo = "/cleaner") {
  const user = await requireUser(redirectTo);
  const role = await getCurrentUserRole(user.id);

  if (role !== "cleaner") {
    redirect(`/cleaner-login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const cleaner = await getCleanerByUser(user);

  if (!cleaner || !cleaner.active) {
    redirect(`/cleaner-login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return { user, cleaner };
}

export async function getOptionalCleaner() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if ((await getCurrentUserRole(user.id)) !== "cleaner") {
    return null;
  }

  const cleaner = await getCleanerByUser(user);

  if (!cleaner) {
    return null;
  }

  return { user, cleaner };
}

export async function getCurrentUserRole(userId: string): Promise<AuthRole | null> {
  const [customerCount, cleanerCount, adminCount] = await Promise.all([
    countCustomerRoles(userId),
    countCleanerRoles(userId),
    countAdminRoles(userId),
  ]);
  const roleCounts: Array<[AuthRole, number]> = [
    ["customer", customerCount],
    ["cleaner", cleanerCount],
    ["admin", adminCount],
  ];
  const matchedRoles = roleCounts.filter(([, count]) => count > 0);
  const totalMatches = roleCounts.reduce((total, [, count]) => total + count, 0);

  if (matchedRoles.length > 1 || totalMatches > 1) {
    throw new RoleConflictError();
  }

  return matchedRoles[0]?.[0] ?? null;
}

async function getCleanerByUser(
  user: User
): Promise<CleanerWithAvailability | null> {
  return getCleanerByUserIdOrEmail(user.id, undefined);
}

async function getCustomerForAccountUser(user: User): Promise<Customer> {
  const customer = await findCustomerForUser(user);

  if (!customer) {
    redirect(`/signup?redirect=${encodeURIComponent("/account")}`);
  }

  return customer;
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
  const role = await getCurrentUserRole(user.id);

  if (role === "admin") {
    redirect("/admin");
  }

  if (role === "cleaner") {
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

async function countCustomerRoles(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("customers")
    .select("id")
    .eq("user_id", userId)
    .eq("account_role", "customer")
    .limit(2);

  if (error) {
    const normalizedError = toSupabaseError(error);

    if (isSupabaseSchemaMissingError(normalizedError)) {
      const legacy = await getSupabaseAdmin()
        .from("customers")
        .select("id")
        .eq("user_id", userId)
        .limit(2);

      if (legacy.error) {
        throw toSupabaseError(legacy.error);
      }

      return legacy.data?.length ?? 0;
    }

    throw normalizedError;
  }

  return data?.length ?? 0;
}

async function countCleanerRoles(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("cleaners")
    .select("id")
    .eq("user_id", userId)
    .eq("account_role", "cleaner")
    .limit(2);

  if (error) {
    const normalizedError = toSupabaseError(error);

    if (isSupabaseSchemaMissingError(normalizedError)) {
      const legacy = await getSupabaseAdmin()
        .from("cleaners")
        .select("id")
        .eq("user_id", userId)
        .limit(2);

      if (legacy.error) {
        throw toSupabaseError(legacy.error);
      }

      return legacy.data?.length ?? 0;
    }

    throw normalizedError;
  }

  return data?.length ?? 0;
}

async function countAdminRoles(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("admins")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "Active")
    .limit(2);

  if (error) {
    const normalizedError = toSupabaseError(error);

    if (isSupabaseSchemaMissingError(normalizedError)) {
      return 0;
    }

    throw normalizedError;
  }

  return data?.length ?? 0;
}

function getLoginPathForRoute(redirectTo: string) {
  if (redirectTo.startsWith("/admin")) {
    return "/admin-login";
  }

  if (redirectTo.startsWith("/cleaner")) {
    return "/cleaner-login";
  }

  return "/login";
}
