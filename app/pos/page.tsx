import { PosTerminal } from "@/components/pos-terminal";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, businesses(name, sector, currency, currencies, tracks_inventory)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();
  const business = Array.isArray(membership?.businesses) ? membership.businesses[0] : membership?.businesses;
  if (!membership || !business?.tracks_inventory || !["retail", "wholesale", "hospitality"].includes(business.sector)) redirect("/sales");

  return <PosTerminal businessId={membership.business_id} businessName={business.name} primaryCurrency={business.currency} />;
}
