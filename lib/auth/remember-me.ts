/** Preference key for extending the signed-in session to 30 days. */
export const REMEMBER_ME_STORAGE_KEY = "smelink-remember-me";
export const REMEMBER_ME_COOKIE = "smelink-remember-me";

/** 30 days in seconds — used for auth cookie Max-Age when Remember me is on. */
export const REMEMBER_ME_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function isRememberMeEnabled(
  cookieHeader?: string | null,
  storageValue?: string | null,
) {
  if (storageValue === "1" || storageValue === "0") {
    return storageValue === "1";
  }
  if (!cookieHeader) return false;
  return /(?:^|;\s*)smelink-remember-me=1(?:;|$)/.test(cookieHeader);
}

export function setRememberMePreference(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, remember ? "1" : "0");
  } catch {
    // Private mode / blocked storage — cookie still carries the preference.
  }
  const maxAge = remember ? REMEMBER_ME_MAX_AGE_SECONDS : 0;
  document.cookie = [
    `${REMEMBER_ME_COOKIE}=${remember ? "1" : "0"}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    ...(window.location.protocol === "https:" ? ["Secure"] : []),
  ].join("; ");
}

export function getRememberMePreference() {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY);
    if (stored === "1" || stored === "0") return stored === "1";
  } catch {
    // fall through to cookie
  }
  return isRememberMeEnabled(document.cookie);
}

export function cookieMaxAgeForSession(remember: boolean) {
  // Session cookie (browser close) when Remember me is off.
  return remember ? REMEMBER_ME_MAX_AGE_SECONDS : undefined;
}
