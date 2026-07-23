"use client";

import { ChevronDown, Monitor, Settings, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function BusinessMenu({ posEnabled }: { posEnabled: boolean }) {
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
        className="button button-secondary desktop-only"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Store size={17} /> Business <ChevronDown size={15} />
      </button>
      {open && (
        <div className="business-menu-popover">
          {posEnabled && (
            <Link href="/pos"><Monitor size={17} /><span><strong>Open POS</strong><small>Fast walk-in checkout</small></span></Link>
          )}
          <Link href="/settings"><Settings size={17} /><span><strong>Business settings</strong><small>Details and preferences</small></span></Link>
        </div>
      )}
    </div>
  );
}
