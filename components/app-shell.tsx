"use client";

import {
  BarChart3,
  Bell,
  Boxes,
  Briefcase,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Menu,
  PackageCheck,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileAccountMenu, SidebarLogout } from "./account-menu";
import { BusinessMenu } from "./business-menu";

const mainItems = [
  { href: "/dashboard", label: "Dashboard", area: "dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", area: "sales", icon: CircleDollarSign },
  { href: "/inventory", label: "Inventory", area: "inventory", icon: Boxes },
  { href: "/services", label: "Services", area: "services", icon: Briefcase },
  { href: "/orders", label: "Orders", area: "orders", icon: ClipboardList },
  { href: "/expenses", label: "Expenses", area: "expenses", icon: ReceiptText },
  { href: "/customers", label: "Customers", area: "customers", icon: Users },
  { href: "/reports", label: "Reports", area: "reports", icon: BarChart3 },
];

const mobileIcons = {
  sales: ShoppingCart,
  inventory: Boxes,
  services: Briefcase,
  orders: ClipboardList,
  expenses: ReceiptText,
  customers: Users,
  reports: BarChart3,
};

function isActive(pathname: string, href: string) {
  if (href === "/pos") {
    return pathname === "/pos" || pathname.startsWith("/pos/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  businessName = "Thabiso Foods",
  businessLocation = "Harare, Zimbabwe",
  userRole = "Owner",
  demoMode = false,
  enabledAreas,
  posEnabled = false,
  tracksInventory = true,
}: {
  children: React.ReactNode;
  businessName?: string;
  businessLocation?: string;
  userRole?: string;
  demoMode?: boolean;
  enabledAreas?: string[];
  posEnabled?: boolean;
  tracksInventory?: boolean;
}) {
  const pathname = usePathname();
  const visibleItems = (
    enabledAreas && enabledAreas.length > 0
      ? mainItems.filter(
          (item) =>
            item.area === "dashboard" || enabledAreas.includes(item.area),
        )
      : mainItems.filter((item) =>
          tracksInventory ? item.area !== "services" : item.area !== "inventory",
        )
  ).map((item) =>
    item.area === "sales" && posEnabled
      ? { ...item, href: "/pos", label: "POS" }
      : item,
  );
  const mobileItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    ...visibleItems
      .filter((item) => item.area !== "dashboard")
      .slice(0, 3)
      .map((item) => ({
        href: item.href,
        label:
          item.area === "inventory"
            ? "Stock"
            : item.area === "services"
              ? "Services"
              : item.area === "sales" && posEnabled
                ? "POS"
                : item.label,
        icon: mobileIcons[item.area as keyof typeof mobileIcons],
      })),
    { href: "/more", label: "More", icon: Menu },
  ];

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">
            <PackageCheck size={21} />
          </span>
          <span>
            <span className="brand-name">SMElink</span>
            <span className="brand-subtitle">Operations workspace</span>
          </span>
        </Link>

        <p className="side-label">Workspace</p>
        <nav className="side-nav" aria-label="Main navigation">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                data-active={isActive(pathname, item.href)}
                href={item.href}
                key={item.href}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <p className="side-label">Manage</p>
        <nav className="side-nav" aria-label="Settings navigation">
          <Link
            data-active={isActive(pathname, "/settings")}
            href="/settings"
          >
            <Settings size={18} />
            Business settings
          </Link>
        </nav>

        <SidebarLogout businessName={businessName} userRole={userRole} />
      </aside>

      <main className="app-main">
        <header className="topbar">
          <MobileAccountMenu
            businessLocation={businessLocation}
            businessName={businessName}
            demoMode={demoMode}
          />
          <div className="topbar-desktop-title">
            <p className="list-title" style={{ marginBottom: 1 }}>
              {businessName}
            </p>
            <p className="list-meta">
              {demoMode ? "Demo workspace" : businessLocation}
            </p>
          </div>
          <div style={{ alignItems: "center", display: "flex", gap: 9 }}>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <BusinessMenu mode="business" posEnabled={posEnabled} />
          </div>
        </header>
        {children}
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              data-active={isActive(pathname, item.href)}
              href={item.href}
              key={item.href}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
