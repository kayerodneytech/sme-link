import { PageHeading } from "@/components/page-heading";
import { SalesView } from "@/components/sales-view";
import { isPosEligible } from "@/lib/pos";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { Monitor, Plus } from "lucide-react";
import Link from "next/link";

export default async function SalesPage() {
  let usePos = false;

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: membership } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membership) {
        const { data: business } = await supabase
          .from("businesses")
          .select("sector, tracks_inventory")
          .eq("id", membership.business_id)
          .maybeSingle();
        usePos = isPosEligible(business);
      }
    }
  }

  return (
    <div className="content">
      <PageHeading
        action={
          usePos ? (
            <Link className="button button-primary" href="/pos">
              <Monitor size={18} />
              Open POS
            </Link>
          ) : (
            <Link className="button button-primary" href="/sales/new">
              <Plus size={18} />
              Record sale
            </Link>
          )
        }
        description={
          usePos
            ? "Review completed sales. Open POS for walk-in checkout."
            : "Record completed transactions and review business income."
        }
        eyebrow="Money in"
        title="Sales"
      />
      <SalesView />
    </div>
  );
}
