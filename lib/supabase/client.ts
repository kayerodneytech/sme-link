"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  cookieMaxAgeForSession,
  getRememberMePreference,
} from "@/lib/auth/remember-me";
import { getSupabaseConfig } from "./config";

function readBrowserCookies() {
  if (typeof document === "undefined") return [];
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf("=");
      if (index === -1) return { name: part, value: "" };
      return {
        name: part.slice(0, index),
        value: decodeURIComponent(part.slice(index + 1)),
      };
    });
}

function writeBrowserCookie(
  name: string,
  value: string,
  options: {
    path?: string;
    maxAge?: number;
    domain?: string;
    sameSite?: string | boolean;
    secure?: boolean;
  },
) {
  const remember = getRememberMePreference();
  const maxAge = cookieMaxAgeForSession(remember);
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? "/"}`,
  ];

  if (options.domain) parts.push(`Domain=${options.domain}`);

  if (maxAge === undefined) {
    // Session cookie: omit Max-Age / Expires so it clears when the browser closes.
  } else {
    parts.push(`Max-Age=${maxAge}`);
  }

  const sameSite =
    typeof options.sameSite === "string"
      ? options.sameSite
      : options.sameSite === true
        ? "strict"
        : "lax";
  parts.push(`SameSite=${sameSite}`);

  if (options.secure || window.location.protocol === "https:") {
    parts.push("Secure");
  }

  document.cookie = parts.join("; ");
}

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createBrowserClient(url, publishableKey, {
    cookies: {
      getAll() {
        return readBrowserCookies();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          writeBrowserCookie(name, value, options ?? {});
        }
      },
    },
    isSingleton: true,
  });
}
