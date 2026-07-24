"use client";

import { downloadInvoicePdf, type InvoicePdfData } from "@/lib/invoice-pdf";
import { Download, LoaderCircle, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function InvoiceToolbar({
  backHref = "/sales",
  invoice,
}: {
  backHref?: string;
  invoice: InvoicePdfData;
}) {
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");

  function downloadPdf() {
    setMessage("");
    setDownloading(true);
    try {
      downloadInvoicePdf(invoice);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The invoice PDF could not be created.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="invoice-toolbar no-print">
      <Link className="button button-secondary" href={backHref}>
        Back to invoices
      </Link>
      <button
        className="button button-primary"
        disabled={downloading}
        onClick={downloadPdf}
        type="button"
      >
        {downloading ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Download size={17} />
        )}
        {downloading ? "Preparing PDF…" : "Download PDF"}
      </button>
      <button
        className="button button-secondary"
        onClick={() => window.print()}
        type="button"
      >
        <Printer size={17} /> Print
      </button>
      {message && (
        <p className="form-message form-message-error" style={{ margin: 0 }}>
          {message}
        </p>
      )}
    </div>
  );
}
