import { PageHeading } from "@/components/page-heading";
import { SaleForm } from "@/components/sale-form";
import { ServiceInvoiceForm } from "@/components/service-invoice-form";
import { isPosEligible } from "@/lib/pos";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewSalePage() {
  let serviceMode = false;

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

        if (isPosEligible(business)) {
          redirect("/pos");
        }
        serviceMode = !Boolean(business?.tracks_inventory);
      }
    }
  }

  return (
    <div className="content">
      <PageHeading
        description={
          serviceMode
            ? "Create an unpaid invoice. Mark it paid later to record the sale."
            : "Add the items sold and confirm how the customer paid."
        }
        eyebrow={serviceMode ? "New invoice" : "New transaction"}
        title={serviceMode ? "Create invoice" : "Record a sale"}
      />
      {serviceMode ? <ServiceInvoiceForm /> : <SaleForm />}
    </div>
  );
}
