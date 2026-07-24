import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  cookieMaxAgeForSession,
  isRememberMeEnabled,
} from "@/lib/auth/remember-me";
import { getSupabaseConfig } from "./config";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();
  const remember = isRememberMeEnabled(
    cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; "),
  );
  const maxAge = cookieMaxAgeForSession(remember);

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const {
              maxAge: _ignoredMaxAge,
              expires: _ignoredExpires,
              ...rest
            } = options ?? {};
            cookieStore.set(
              name,
              value,
              remember ? { ...rest, maxAge } : rest,
            );
          });
        } catch {
          // Server Components cannot always write cookies. Middleware refreshes
          // the session when this happens.
        }
      },
    },
  });
}
