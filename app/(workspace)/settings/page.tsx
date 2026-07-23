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
      .select("businesses(*)")
      .eq("status", "active")
      .limit(1)
      .single();
    business = Array.isArray(membership?.businesses)
      ? membership.businesses[0]
      : membership?.businesses;
  }

  return (
    <div className="content">
      <PageHeading description="Keep the workspace matched to how the business operates." eyebrow="Manage" title="Business settings" />
      <BusinessSettingsForm business={business} />
    </div>
  );
}
