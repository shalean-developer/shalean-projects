import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function hasSupabaseAuthConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(getRequiredSupabaseUrl(), getRequiredAnonKey());

  return browserClient;
}

export function getRequiredSupabaseUrl() {
  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.");
  }

  return supabaseUrl;
}

export function getRequiredAnonKey() {
  const anonKey = getSupabaseAnonKey();

  if (!anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return anonKey;
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
