import { PosTerminal } from "@/components/pos-terminal";
import { isPosEligible } from "@/lib/pos";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch membership and business in two steps. A nested select with .single()
  // was failing for some sessions and silently sending people back to /sales.
  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select(
      "name, sector, currency, currencies, tracks_inventory, vat_registered, vat_rate",
    )
    .eq("id", membership.business_id)
    .maybeSingle();

  if (!business || !isPosEligible(business)) {
    redirect("/sales");
  }

  const currencies =
    business.currencies?.length > 0
      ? business.currencies
      : [business.currency];

  return (
    <PosTerminal
      businessId={membership.business_id}
      businessName={business.name}
      currencies={currencies}
      primaryCurrency={business.currency}
      vatRate={Number(business.vat_rate ?? 15)}
      vatRegistered={Boolean(business.vat_registered)}
    />
  );
}
