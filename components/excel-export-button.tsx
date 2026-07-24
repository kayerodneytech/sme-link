"use client";

import { downloadExcel } from "@/lib/excel";
import { FileSpreadsheet } from "lucide-react";

export function ExcelExportButton({
  filename,
  sheetName,
  headers,
  rows,
  label = "Export Excel",
}: {
  filename: string;
  sheetName: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  label?: string;
}) {
  return (
    <button
      className="button button-secondary"
      onClick={() =>
        downloadExcel(filename, [
          {
            name: sheetName,
            rows: [headers, ...rows],
          },
        ])
      }
      type="button"
    >
      <FileSpreadsheet size={16} />
      {label}
    </button>
  );
}
