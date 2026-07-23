import { PageHeading } from "@/components/page-heading";
import { ServicesView } from "@/components/services-view";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ServicesPage() {
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
        if (business?.tracks_inventory) {
          redirect("/inventory");
        }
      }
    }
  }

  return (
    <div className="content">
      <PageHeading
        description="What customers hire or book from you — with optional price tiers."
        eyebrow="Offerings"
        title="Services"
      />
      <ServicesView />
    </div>
  );
}
