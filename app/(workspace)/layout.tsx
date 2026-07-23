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
    .select("role, businesses(name, location)")
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
      userRole={membership.role === "owner" ? "Owner" : "Staff"}
    >
      {children}
    </AppShell>
  );
}
