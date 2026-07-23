import { AppShell } from "@/components/app-shell";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabaseConfig()) {
    return <AppShell demoMode>{children}</AppShell>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("role, businesses(name, location, sector, primary_needs, tracks_inventory, sales_mode)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const business = Array.isArray(membership.businesses)
    ? membership.businesses[0]
    : membership.businesses;

  return (
    <AppShell
      businessLocation={business?.location ?? "Zimbabwe"}
      businessName={business?.name ?? "SME workspace"}
      enabledAreas={[
        ...(business?.primary_needs ?? []),
        ...(business?.tracks_inventory ? ["inventory"] : []),
        ...(["orders", "both"].includes(business?.sales_mode ?? "")
          ? ["orders", "customers"]
          : []),
      ]}
      userRole={membership.role === "owner" ? "Owner" : "Staff"}
      posEnabled={["retail", "wholesale", "hospitality"].includes(business?.sector ?? "") && business?.tracks_inventory}
    >
      {children}
    </AppShell>
  );
}
