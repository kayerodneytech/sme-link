"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";

import type { MonthlyPerformance } from "@/lib/business-overview";
import {
  buildDownloadFilename,
  getBusinessNameForDownloads,
} from "@/lib/download-filename";
import { downloadExcel } from "@/lib/excel";

export function ExportReportButton({
  data,
  businessName,
}: {
  data: MonthlyPerformance[];
  businessName?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const name = businessName ?? (await getBusinessNameForDownloads());
      downloadExcel(
        buildDownloadFilename(name, "cash-flow-report", "xlsx"),
        [
          {
            name: "Cash flow",
            rows: [
              ["Month", "Revenue", "Expenses", "Net cash flow"],
              ...data.map((month) => [
                month.month,
                month.revenue,
                month.expenses,
                month.revenue - month.expenses,
              ]),
            ],
          },
        ],
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="button button-secondary"
      disabled={busy}
      onClick={() => void download()}
      type="button"
    >
      {busy ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}
      {busy ? "Exporting…" : "Export Excel"}
    </button>
  );
}
