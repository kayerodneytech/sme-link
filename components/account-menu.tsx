"use client";

import { LogOut, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Mobile: tap company name for account menu (settings + log out). */
export function MobileAccountMenu({
  businessName,
  businessLocation,
  demoMode = false,
}: {
  businessName: string;
  businessLocation: string;
  demoMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="account-menu mobile-account-menu" ref={wrapper}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="account-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="account-menu-icon" aria-hidden="true">
          <Menu size={20} />
        </span>
        <span className="account-menu-copy">
          <p className="list-title" style={{ marginBottom: 1 }}>
            {businessName}
          </p>
          <p className="list-meta">
            {demoMode ? "Demo workspace" : businessLocation}
          </p>
        </span>
      </button>
      {open && (
        <div className="business-menu-popover account-menu-popover" role="menu">
          <Link href="/settings" onClick={() => setOpen(false)}>
            <Settings size={17} />
            <span>
              <strong>Business settings</strong>
              <small>Details and preferences</small>
            </span>
          </Link>
          <LogoutButton />
        </div>
      )}
    </div>
  );
}

export function SidebarLogout({
  businessName,
  userRole,
}: {
  businessName: string;
  userRole: string;
}) {
  return (
    <div className="sidebar-user">
      <p className="list-title" style={{ color: "white" }}>
        {businessName}
      </p>
      <p className="list-meta" style={{ color: "#9eb0bf", marginBottom: 12 }}>
        {userRole} workspace
      </p>
      <LogoutButton variant="sidebar" />
    </div>
  );
}

function LogoutButton({ variant = "menu" }: { variant?: "menu" | "sidebar" }) {
  if (variant === "sidebar") {
    return (
      <form action="/api/auth/sign-out" method="post">
        <button className="sidebar-logout" type="submit">
          <LogOut size={16} />
          Log out
        </button>
      </form>
    );
  }

  return (
    <form action="/api/auth/sign-out" method="post">
      <button className="account-menu-logout" type="submit">
        <LogOut size={17} />
        <span>
          <strong>Log out</strong>
          <small>Sign out of this device</small>
        </span>
      </button>
    </form>
  );
}
