import { PageHeading } from "@/components/page-heading";
import { InventoryView } from "@/components/inventory-view";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function InventoryPage() {
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
          .select("tracks_inventory")
          .eq("id", membership.business_id)
          .maybeSingle();
        if (business && !business.tracks_inventory) {
          redirect("/services");
        }
      }
    }
  }

  return (
    <div className="content">
      <PageHeading
        description="Add what you sell, import from Excel, and keep track of how many you have."
        eyebrow="Stock"
        title="Products and stock"
      />
      <InventoryView />
    </div>
  );
}
