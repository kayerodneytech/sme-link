"use client";

import { BarChart3, ChevronDown, Monitor, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function BusinessMenu({ mode = "business", posEnabled }: { mode?: "business" | "pos"; posEnabled: boolean }) {
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
    <div className="business-menu" ref={wrapper}>
      <button
        aria-expanded={open}
        className="button button-secondary mode-switcher-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {mode === "business" ? <Store size={17} /> : <Monitor size={17} />}
        {mode === "business" ? "Business Mode" : "POS View"}
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="business-menu-popover">
          <Link aria-current={mode === "business" ? "page" : undefined} data-active={mode === "business"} href="/dashboard"><BarChart3 size={17} /><span><strong>Business Mode</strong><small>Reporting and operations</small></span></Link>
          {posEnabled && (
            <Link aria-current={mode === "pos" ? "page" : undefined} data-active={mode === "pos"} href="/pos"><Monitor size={17} /><span><strong>POS View</strong><small>Fast walk-in checkout</small></span></Link>
          )}
        </div>
      )}
    </div>
  );
}
