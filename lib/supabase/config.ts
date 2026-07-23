function getPublicSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_sme_link_SUPABASE_URL
  );
}

function getPublicSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_sme_link_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_sme_link_SUPABASE_ANON_KEY
  );
}

export function hasSupabaseConfig() {
  return Boolean(getPublicSupabaseUrl() && getPublicSupabaseKey());
}

export function getSupabaseConfig() {
  const url = getPublicSupabaseUrl();
  const publishableKey = getPublicSupabaseKey();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Add the public project URL and publishable key to .env.local.",
    );
  }

  return { url, publishableKey };
}
