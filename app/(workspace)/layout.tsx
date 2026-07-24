import { AppShell } from "@/components/app-shell";
import { isPosEligible } from "@/lib/pos";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getActiveMembership } from "@/lib/supabase/workspace-cache";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabaseConfig()) {
    return <AppShell demoMode>{children}</AppShell>;
  }

  const membership = await getActiveMembership();

  if (!membership?.user) {
    redirect("/login");
  }

  if (!membership.business) {
    redirect("/onboarding");
  }

  const business = membership.business;
  const tracksInventory = Boolean(business?.tracks_inventory);
  const needs = ((business?.primary_needs ?? []) as string[]).filter(
    (need) =>
      need !== "orders" &&
      (tracksInventory ? need !== "services" : need !== "inventory"),
  );

  return (
    <AppShell
      businessLocation={business?.location ?? "Zimbabwe"}
      businessName={business?.name ?? "SME workspace"}
      enabledAreas={[
        ...needs,
        ...(tracksInventory ? ["inventory"] : ["services"]),
        ...(["orders", "both"].includes(business?.sales_mode ?? "")
          ? ["customers"]
          : []),
        ...(!tracksInventory ? ["customers"] : []),
      ]}
      tracksInventory={tracksInventory}
      userRole={membership.role === "owner" ? "Owner" : "Staff"}
      posEnabled={isPosEligible(business)}
    >
      {children}
    </AppShell>
  );
}
