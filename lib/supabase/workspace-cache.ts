import "server-only";

import { cache } from "react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Request-scoped auth user. Dedupes getUser() across layout + pages.
 */
export const getAuthUser = cache(async () => {
  if (!hasSupabaseConfig()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Request-scoped active membership + business for the signed-in user.
 */
export const getActiveMembership = cache(async () => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("business_members")
    .select(
      "role, business_id, businesses(name, location, sector, primary_needs, tracks_inventory, sales_mode, currency, currencies)",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const business = Array.isArray(membership.businesses)
    ? membership.businesses[0]
    : membership.businesses;

  return {
    user,
    role: membership.role as string,
    businessId: membership.business_id as string,
    business,
  };
});
