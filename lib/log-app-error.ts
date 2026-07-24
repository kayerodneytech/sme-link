import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export type AppErrorLogInput = {
  source: string;
  message: string;
  details?: Record<string, unknown>;
  email?: string | null;
  path?: string | null;
};

/**
 * Persist a client-side error for later debugging in Supabase.
 * Never throws — logging must not break the user flow.
 */
export async function logAppError(input: AppErrorLogInput) {
  if (!hasSupabaseConfig()) return;
  if (typeof window === "undefined") return;

  try {
    const supabase = createClient();
    const details = { ...(input.details ?? {}) };
    delete details.password;
    delete details.access_token;
    delete details.refresh_token;

    await supabase.rpc("log_app_error", {
      error_source: input.source.slice(0, 120),
      error_message: String(input.message).slice(0, 2000),
      error_details: details,
      error_email: input.email?.trim().toLowerCase() || null,
      error_path:
        input.path ??
        (typeof window !== "undefined" ? window.location.pathname : null),
      error_user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // Ignore logging failures.
  }
}

export function errorMessageFromUnknown(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}
