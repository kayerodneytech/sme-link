import { SIZE_UNITS } from "@/lib/product-label";
import { normalizeHeader } from "@/lib/excel";

const SIZE_UNIT_SET = new Set<string>(SIZE_UNITS.map((unit) => unit.value));

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  product_name: "name",
  product: "name",
  group: "group",
  category: "group",
  product_group: "group",
  sku: "sku",
  code: "sku",
  barcode: "barcode",
  size_value: "size_value",
  size: "size_value",
  size_unit: "size_unit",
  unit_size: "size_unit",
  cost_each: "cost_each",
  cost: "cost_each",
  cost_price: "cost_each",
  sell_each: "sell_each",
  sell_price: "sell_each",
  price: "sell_each",
  selling_price: "sell_each",
  stock_now: "stock_now",
  stock: "stock_now",
  opening_stock: "stock_now",
  quantity: "stock_now",
  low_stock_at: "low_stock_at",
  reorder_level: "low_stock_at",
  threshold: "low_stock_at",
};

export type ProductImportRow = {
  rowNumber: number;
  name: string;
  group: string;
  sku: string | null;
  barcode: string | null;
  sizeValue: number;
  sizeUnit: string;
  costEach: number;
  sellEach: number;
  stockNow: number;
  lowStockAt: number;
};

export type ProductImportResult = {
  rows: ProductImportRow[];
  errors: string[];
};

function pick(row: Record<string, string>, key: string) {
  for (const [raw, canonical] of Object.entries(HEADER_ALIASES)) {
    if (canonical !== key) continue;
    if (row[raw] != null && row[raw] !== "") return row[raw];
  }
  return row[key] ?? "";
}

function parseNumber(value: string, field: string, rowNumber: number) {
  if (value.trim() === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new Error(`Row ${rowNumber}: ${field} must be a number.`);
  }
  return amount;
}

export function parseProductImportRows(
  rawRows: Record<string, string>[],
): ProductImportResult {
  const errors: string[] = [];
  const rows: ProductImportRow[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2; // header is row 1
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      const canonical = HEADER_ALIASES[normalizeHeader(key)] ?? normalizeHeader(key);
      mapped[canonical] = value;
    }

    const name = pick(mapped, "name");
    const group = pick(mapped, "group");
    const sku = pick(mapped, "sku") || null;
    const barcode = pick(mapped, "barcode") || null;

    if (!name && !group && !pick(mapped, "sell_each")) {
      return; // skip blank lines
    }

    try {
      if (name.length < 2) {
        throw new Error(`Row ${rowNumber}: name is required.`);
      }
      if (!group) {
        throw new Error(`Row ${rowNumber}: group is required.`);
      }

      const sizeValue = parseNumber(pick(mapped, "size_value"), "size_value", rowNumber);
      if (sizeValue == null || sizeValue <= 0) {
        throw new Error(`Row ${rowNumber}: size_value must be greater than 0.`);
      }

      const sizeUnit = pick(mapped, "size_unit");
      if (!SIZE_UNIT_SET.has(sizeUnit)) {
        throw new Error(
          `Row ${rowNumber}: size_unit must be one of ml, L, g, kg.`,
        );
      }

      const sellEach = parseNumber(pick(mapped, "sell_each"), "sell_each", rowNumber);
      if (sellEach == null || sellEach < 0) {
        throw new Error(`Row ${rowNumber}: sell_each is required and must be 0 or more.`);
      }

      const costEach =
        parseNumber(pick(mapped, "cost_each"), "cost_each", rowNumber) ?? 0;
      if (costEach < 0) {
        throw new Error(`Row ${rowNumber}: cost_each cannot be negative.`);
      }

      const stockNow =
        parseNumber(pick(mapped, "stock_now"), "stock_now", rowNumber) ?? 0;
      if (!Number.isInteger(stockNow) || stockNow < 0) {
        throw new Error(`Row ${rowNumber}: stock_now must be a whole number 0 or more.`);
      }

      const lowStockAt =
        parseNumber(pick(mapped, "low_stock_at"), "low_stock_at", rowNumber) ?? 5;
      if (!Number.isInteger(lowStockAt) || lowStockAt < 0) {
        throw new Error(
          `Row ${rowNumber}: low_stock_at must be a whole number 0 or more.`,
        );
      }

      rows.push({
        rowNumber,
        name,
        group,
        sku,
        barcode,
        sizeValue,
        sizeUnit,
        costEach,
        sellEach,
        stockNow,
        lowStockAt,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Row ${rowNumber}: invalid data.`);
    }
  });

  return { rows, errors };
}
