import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import {
  getRequiredAnonKey,
  getRequiredSupabaseUrl,
  hasSupabaseAuthConfig,
} from "@/lib/supabase/client";

export { hasSupabaseAuthConfig };

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getRequiredSupabaseUrl(), getRequiredAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. The proxy refreshes sessions.
        }
      },
    },
  });
}
