"use client";

import { Download } from "lucide-react";

import type { MonthlyPerformance } from "@/lib/business-overview";

export function ExportReportButton({ data }: { data: MonthlyPerformance[] }) {
  function download() {
    const rows = [
      ["Month", "Revenue", "Expenses", "Net cash flow"],
      ...data.map((month) => [
        month.month,
        month.revenue.toFixed(2),
        month.expenses.toFixed(2),
        (month.revenue - month.expenses).toFixed(2),
      ]),
    ];
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
