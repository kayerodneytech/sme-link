import { PageHeading } from "@/components/page-heading";
import { SaleForm } from "@/components/sale-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default async function NewSalePage() {
  const membership = hasSupabaseConfig()
    ? (await (await createClient()).from("business_members").select("businesses(sector, tracks_inventory)").eq("status", "active").limit(1).maybeSingle()).data
    : null;
  const business = Array.isArray(membership?.businesses) ? membership.businesses[0] : membership?.businesses;
  if (business?.tracks_inventory && ["retail", "wholesale", "hospitality"].includes(business?.sector ?? "")) redirect("/pos");

  return (
    <div className="content">
      <PageHeading
        description="Add the items sold and confirm how the customer paid."
        eyebrow="New transaction"
        title="Record a sale"
      />
      <SaleForm />
    </div>
  );
}
