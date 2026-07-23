"use client";

import { Download, Printer } from "lucide-react";
import Link from "next/link";

export function InvoiceToolbar({ backHref = "/sales" }: { backHref?: string }) {
  return (
    <div className="invoice-toolbar no-print">
      <Link className="button button-secondary" href={backHref}>
        Back to invoices
      </Link>
      <button
        className="button button-primary"
        onClick={() => window.print()}
        type="button"
      >
        <Printer size={17} /> Print / download PDF
      </button>
      <p className="list-meta" style={{ margin: 0 }}>
        <Download size={14} style={{ verticalAlign: "middle" }} /> Use your
        browser’s print dialog → Save as PDF
      </p>
    </div>
  );
}
