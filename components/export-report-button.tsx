"use client";

import { Download } from "lucide-react";

import type { MonthlyPerformance } from "@/lib/business-overview";
import { downloadExcel } from "@/lib/excel";

export function ExportReportButton({ data }: { data: MonthlyPerformance[] }) {
  function download() {
    downloadExcel("smelink-cash-flow-report.xlsx", [
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
    ]);
  }

  return (
    <button className="button button-secondary" onClick={download} type="button">
      <Download size={17} />
      Export Excel
    </button>
  );
}
