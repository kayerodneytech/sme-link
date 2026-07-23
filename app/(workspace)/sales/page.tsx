import { PageHeading } from "@/components/page-heading";
import { SalesView } from "@/components/sales-view";
import { Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default async function SalesPage() {
  const membership = hasSupabaseConfig()
    ? (await (await createClient()).from("business_members").select("businesses(sector, tracks_inventory)").eq("status", "active").limit(1).maybeSingle()).data
    : null;
  const business = Array.isArray(membership?.businesses) ? membership.businesses[0] : membership?.businesses;
  const usePos = Boolean(business?.tracks_inventory && ["retail", "wholesale", "hospitality"].includes(business?.sector ?? ""));

  return (
    <div className="content">
      <PageHeading
        action={<Link className="button button-primary" href={usePos ? "/pos" : "/sales/new"}><Plus size={18} /> {usePos ? "POS View" : "Record sale"}</Link>}
        description="Record completed transactions and review business income."
        eyebrow="Money in"
        title="Sales"
      />
      <SalesView />
    </div>
  );
}
