import { PageHeading } from "@/components/page-heading";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  BarChart3,
  Boxes,
  Briefcase,
  ChevronRight,
  LogOut,
  ReceiptText,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";

export default async function MorePage() {
  let tracksInventory = true;
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: membership } = await supabase
        .from("business_members")
        .select("businesses(tracks_inventory)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      const business = Array.isArray(membership?.businesses)
        ? membership?.businesses[0]
        : membership?.businesses;
      tracksInventory = Boolean(business?.tracks_inventory ?? true);
    }
  }

  const items = [
    tracksInventory
      ? {
          href: "/inventory",
          label: "Inventory",
          copy: "Products, stock levels and groups",
          icon: Boxes,
        }
      : {
          href: "/services",
          label: "Services",
          copy: "What you offer and optional price tiers",
          icon: Briefcase,
        },
    {
      href: "/expenses",
      label: "Expenses",
      copy: "Record and review business costs",
      icon: ReceiptText,
    },
    {
      href: "/customers",
      label: "Customers",
      copy: "Manage customer and company details",
      icon: Users,
    },
    {
      href: "/reports",
      label: "Reports",
      copy: tracksInventory
        ? "Review money in, money out and stock profit"
        : "Review money in, money out and profit",
      icon: BarChart3,
    },
    {
      href: "/settings",
      label: "Settings",
      copy: "Update business and account details",
      icon: Settings,
    },
  ];

  return (
    <div className="content">
      <PageHeading
        description="Additional areas of your SMElink workspace."
        eyebrow="Workspace"
        title="More"
      />
      <section className="card card-pad">
        <div className="list">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="list-row"
                href={item.href}
                key={item.href}
                style={{ textDecoration: "none" }}
              >
                <span className="list-icon">
                  <Icon size={19} />
                </span>
                <span className="list-body">
                  <span className="list-title" style={{ display: "block" }}>
                    {item.label}
                  </span>
                  <span className="list-meta">{item.copy}</span>
                </span>
                <ChevronRight
                  color="#98A2B3"
                  size={18}
                  style={{ marginLeft: "auto" }}
                />
              </Link>
            );
          })}
          <form action="/api/auth/sign-out" method="post">
            <button
              className="list-row"
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                font: "inherit",
                padding: "12px 0",
                textAlign: "left",
                width: "100%",
              }}
              type="submit"
            >
              <span className="list-icon">
                <LogOut size={19} />
              </span>
              <span className="list-body">
                <span className="list-title" style={{ display: "block" }}>
                  Log out
                </span>
                <span className="list-meta">Sign out of this device</span>
              </span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
