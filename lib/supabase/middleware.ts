import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  cookieMaxAgeForSession,
  isRememberMeEnabled,
} from "@/lib/auth/remember-me";
import { getSupabaseConfig, hasSupabaseConfig } from "@/lib/supabase/config";

/**
 * Refresh the auth session on each matched request and keep cookies aligned
 * with the Remember me preference (30 days vs browser-session).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  if (!hasSupabaseConfig()) return response;

  const remember = isRememberMeEnabled(request.headers.get("cookie"));
  const maxAge = cookieMaxAgeForSession(remember);
  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          const { maxAge: _ignoredMaxAge, expires: _ignoredExpires, ...rest } =
            options ?? {};
          response.cookies.set(
            name,
            value,
            remember
              ? { ...rest, maxAge }
              : rest,
          );
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  // Touches/refreshes the session; do not remove.
  await supabase.auth.getUser();

  return response;
}
