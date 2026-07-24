"use client";

import {
  PRODUCT_IMPORT_FORMAT,
  PRODUCT_IMPORT_HEADERS,
  downloadExcel,
  readExcelFile,
} from "@/lib/excel";
import { parseProductImportRows } from "@/lib/product-import";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { Download, FileSpreadsheet, LoaderCircle, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

export function ProductImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (summary: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!open) return null;

  function downloadTemplate() {
    downloadExcel("smelink-product-import-template.xlsx", [
      {
        name: "Products",
        rows: [
          [...PRODUCT_IMPORT_HEADERS],
          [
            "Cooking oil",
            "Groceries",
            "OIL-2L",
            "",
            2,
            "L",
            5.1,
            6.5,
            12,
            5,
          ],
          [
            "Maize meal",
            "Groceries",
            "MEAL-10",
            "",
            10,
            "kg",
            8.2,
            9.8,
            8,
            5,
          ],
          ["Laundry soap", "Household", "", "", 250, "g", 1.55, 2.1, 20, 8],
        ],
      },
      {
        name: "Instructions",
        rows: [
          ["Column", "Required", "Meaning"],
          ...PRODUCT_IMPORT_FORMAT.map((item) => [
            item.column,
            item.required ? "Yes" : "No",
            item.meaning,
          ]),
          [],
          ["Notes"],
          ["1. Keep the header row exactly as shown (or use the aliases in the app)."],
          ["2. size_unit must be ml, L, g or kg."],
          ["3. stock_now is added as opening stock and is NOT deducted from cash."],
          ["4. Groups are created automatically if they do not exist yet."],
          ["5. Save as .xlsx (Excel workbook)."],
        ],
      },
    ]);
  }

  async function handleFile(file: File) {
    setMessage("");
    setBusy(true);
    try {
      if (!/\.xlsx?$/i.test(file.name)) {
        throw new Error("Upload an Excel file (.xlsx).");
      }

      const rawRows = await readExcelFile(file);
      const parsed = parseProductImportRows(rawRows);
      if (!parsed.rows.length) {
        throw new Error(
          parsed.errors[0] ??
            "No valid product rows found. Download the template and check the format.",
        );
      }

      if (!hasSupabaseConfig()) {
        onImported(
          `Preview only: ${parsed.rows.length} products ready (${parsed.errors.length} row warnings). Connect Supabase to import.`,
        );
        onClose();
        return;
      }

      const businessId = await getCurrentBusinessId();
      const supabase = createClient();

      const { data: existingGroups, error: groupError } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("business_id", businessId);
      if (groupError) throw groupError;

      const groupMap = new Map(
        (existingGroups ?? []).map((group) => [group.name.toLowerCase(), group]),
      );

      for (const row of parsed.rows) {
        const key = row.group.toLowerCase();
        if (groupMap.has(key)) continue;
        const { data: created, error } = await supabase
          .from("product_categories")
          .insert({ business_id: businessId, name: row.group })
          .select("id, name")
          .single();
        if (error) throw error;
        groupMap.set(key, created);
      }

      let imported = 0;
      const importErrors = [...parsed.errors];

      for (const row of parsed.rows) {
        const { data: product, error } = await supabase
          .from("products")
          .insert({
            business_id: businessId,
            name: row.name,
            sku: row.sku,
            barcode: row.barcode,
            category: row.group,
            product_type: "stocked",
            unit: "piece",
            pack_size: 1,
            size_value: row.sizeValue,
            size_unit: row.sizeUnit,
            cost_price: row.costEach,
            selling_price: row.sellEach,
            reorder_level: row.lowStockAt,
          })
          .select("id")
          .single();

        if (error) {
          importErrors.push(`Row ${row.rowNumber} (${row.name}): ${error.message}`);
          continue;
        }

        if (row.stockNow > 0) {
          const { error: stockError } = await supabase
            .from("inventory_movements")
            .insert({
              business_id: businessId,
              product_id: product.id,
              movement_type: "opening_stock",
              quantity_change: row.stockNow,
              note: "Imported opening stock",
            });
          if (stockError) {
            importErrors.push(
              `Row ${row.rowNumber} (${row.name}): product saved but stock failed — ${stockError.message}`,
            );
            continue;
          }
        }
        imported += 1;
      }

      const warning =
        importErrors.length > 0
          ? ` ${importErrors.length} issue(s): ${importErrors.slice(0, 3).join(" · ")}`
          : "";
      onImported(`Imported ${imported} of ${parsed.rows.length} products.${warning}`);
      onClose();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The Excel file could not be imported.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog dialog-wide">
        <div className="dialog-header">
          <div>
            <p className="eyebrow">Excel import</p>
            <h2>Import products</h2>
            <p className="page-copy">
              Upload an .xlsx sheet. Use the template so columns match.
            </p>
          </div>
          <button
            aria-label="Close"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <strong>Needed columns</strong>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Required</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCT_IMPORT_FORMAT.map((item) => (
                  <tr key={item.column}>
                    <td className="table-name">{item.column}</td>
                    <td>{item.required ? "Yes" : "No"}</td>
                    <td>{item.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
          <button
            className="button button-secondary"
            onClick={downloadTemplate}
            type="button"
          >
            <Download size={17} /> Download template
          </button>
          <a
            className="button button-secondary"
            download
            href="/samples/smelink-100-products-sample.xlsx"
          >
            <FileSpreadsheet size={17} /> 100-product sample
          </a>
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Upload size={17} />
            )}
            {busy ? "Importing…" : "Choose Excel file"}
          </button>
          <input
            accept=".xlsx,.xls"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
            ref={inputRef}
            type="file"
          />
        </div>

        {message && (
          <p className="form-message form-message-error" style={{ marginTop: 14 }}>
            {message}
          </p>
        )}

        <p className="field-hint" style={{ marginTop: 14 }}>
          <FileSpreadsheet size={14} style={{ verticalAlign: "middle" }} />{" "}
          Tip: opening stock from import is not deducted from cash.
        </p>
      </div>
    </div>
  );
}
