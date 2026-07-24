"use client";

import {
  buildDownloadFilename,
  getBusinessNameForDownloads,
} from "@/lib/download-filename";
import { downloadExcel } from "@/lib/excel";
import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function ExcelExportButton({
  documentLabel,
  sheetName,
  headers,
  rows,
  label = "Export Excel",
  businessName,
}: {
  /** Used in the filename after the business name, e.g. "sales", "INV-0004". */
  documentLabel: string;
  sheetName: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  label?: string;
  /** Optional; fetched automatically when omitted. */
  businessName?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function exportFile() {
    setBusy(true);
    try {
      const name = businessName ?? (await getBusinessNameForDownloads());
      const filename = buildDownloadFilename(name, documentLabel, "xlsx");
      downloadExcel(filename, [
        {
          name: sheetName,
          rows: [headers, ...rows],
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="button button-secondary"
      disabled={busy}
      onClick={() => void exportFile()}
      type="button"
    >
      {busy ? (
        <LoaderCircle className="spin" size={16} />
      ) : (
        <FileSpreadsheet size={16} />
      )}
      {busy ? "Exporting…" : label}
    </button>
  );
}
