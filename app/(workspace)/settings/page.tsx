import { PageHeading } from "@/components/page-heading";
import { BusinessSettingsForm } from "@/components/business-settings-form";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  let business = null;
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from("business_members")
      .select(
        "businesses(name, sector, phone, location, currency, currencies, team_size, sales_mode, primary_needs, tracks_inventory, vat_registered, vat_rate, opening_cash)",
      )
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    const related = membership?.businesses;
    business = Array.isArray(related) ? related[0] ?? null : related ?? null;
  }

  return (
    <div className="content">
      <PageHeading description="Keep the workspace matched to how the business operates." eyebrow="Manage" title="Business settings" />
      <BusinessSettingsForm business={business} />
    </div>
  );
}
