"use client";

import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Menu,
  PackageCheck,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", icon: CircleDollarSign },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/expenses", label: "Expenses", icon: ReceiptText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const mobileItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/inventory", label: "Stock", icon: Boxes },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/more", label: "More", icon: Menu },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  businessName = "Thabiso Foods",
  businessLocation = "Harare, Zimbabwe",
  userRole = "Owner",
  demoMode = false,
}: {
  children: React.ReactNode;
  businessName?: string;
  businessLocation?: string;
  userRole?: string;
  demoMode?: boolean;
}) {
  const pathname = usePathname();

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
          {mainItems.map((item) => {
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

        <div className="sidebar-user">
          <p className="list-title" style={{ color: "white" }}>
            {businessName}
          </p>
          <p className="list-meta" style={{ color: "#9eb0bf" }}>
            {userRole} workspace
          </p>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div>
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
            <button className="button button-secondary desktop-only">
              <Store size={17} />
              Business
              <ChevronDown size={15} />
            </button>
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
