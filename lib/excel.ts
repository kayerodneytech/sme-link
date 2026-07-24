import * as XLSX from "xlsx";

export function downloadExcel(
  filename: string,
  sheets: { name: string; rows: (string | number | null | undefined)[][] }[],
) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export async function readExcelFile(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(String(key))] = String(value ?? "").trim();
    }
    return normalized;
  });
}

export function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^\w]/g, "");
}

export const PRODUCT_IMPORT_HEADERS = [
  "name",
  "group",
  "sku",
  "barcode",
  "size_value",
  "size_unit",
  "cost_each",
  "sell_each",
  "stock_now",
  "low_stock_at",
] as const;

export const PRODUCT_IMPORT_HEADER_LABELS: Record<
  (typeof PRODUCT_IMPORT_HEADERS)[number],
  string
> = {
  name: "name",
  group: "group",
  sku: "sku",
  barcode: "barcode",
  size_value: "size_value",
  size_unit: "size_unit",
  cost_each: "cost_each",
  sell_each: "sell_each",
  stock_now: "stock_now",
  low_stock_at: "low_stock_at",
};

/** Human-readable column guide shown in the import dialog. */
export const PRODUCT_IMPORT_FORMAT = [
  { column: "name", required: true, meaning: "Product name (e.g. Cooking oil)" },
  { column: "group", required: true, meaning: "Product group (e.g. Groceries). Created if missing." },
  { column: "sku", required: false, meaning: "Your stock code. Leave blank if none." },
  { column: "barcode", required: false, meaning: "Barcode if you scan products." },
  { column: "size_value", required: true, meaning: "Numeric size of each piece (e.g. 500 or 2)" },
  { column: "size_unit", required: true, meaning: "One of: ml, L, g, kg" },
  { column: "cost_each", required: false, meaning: "What one piece costs you" },
  { column: "sell_each", required: true, meaning: "What you sell one piece for" },
  { column: "stock_now", required: false, meaning: "Pieces you already have (default 0). Not deducted from cash." },
  { column: "low_stock_at", required: false, meaning: "Warn when stock falls to this (default 5)" },
] as const;
