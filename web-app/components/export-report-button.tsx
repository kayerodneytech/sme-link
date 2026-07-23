"use client";

import { Download } from "lucide-react";

const rows = [
  ["Month", "Revenue", "Expenses", "Net cash flow"],
  ["January", "4100.00", "2700.00", "1400.00"],
  ["February", "5200.00", "3100.00", "2100.00"],
  ["March", "4700.00", "2950.00", "1750.00"],
  ["April", "6900.00", "3600.00", "3300.00"],
  ["May", "7200.00", "3900.00", "3300.00"],
  ["June", "8450.00", "4120.00", "4330.00"],
];

export function ExportReportButton() {
  function download() {
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smelink-cash-flow-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="button button-secondary" onClick={download} type="button">
      <Download size={17} />
      Export CSV
    </button>
  );
}
