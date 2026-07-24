import { jsPDF } from "jspdf";
import { buildDownloadFilename } from "@/lib/download-filename";
import { formatMoney } from "@/lib/format";

export type ReceiptPdfLine = {
  label: string;
  quantity: number;
  lineTotal: number;
};

export type ReceiptPdfData = {
  businessName: string;
  receiptNumber: string;
  date: string;
  paymentMethod: string;
  currency: string;
  rateLabel?: string | null;
  lines: ReceiptPdfLine[];
  net: number;
  vat: number;
  vatRate: number;
  total: number;
  cashReceived?: number | null;
  change?: number | null;
};

export function downloadReceiptPdf(receipt: ReceiptPdfData) {
  const doc = new jsPDF({ unit: "pt", format: [226, 600] });
  const width = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 43, 58);
  doc.text(receipt.businessName || "Business", width / 2, y, { align: "center" });
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 110, 122);
  doc.text(receipt.receiptNumber, width / 2, y, { align: "center" });
  y += 12;
  doc.text(new Date(receipt.date).toLocaleString(), width / 2, y, {
    align: "center",
  });
  y += 12;
  doc.text(
    `Paid by ${receipt.paymentMethod.replace(/_/g, " ")} · ${receipt.currency}`,
    width / 2,
    y,
    { align: "center" },
  );
  y += 10;
  if (receipt.rateLabel) {
    doc.text(receipt.rateLabel, width / 2, y, { align: "center" });
    y += 10;
  }

  y += 8;
  doc.setDrawColor(200, 210, 216);
  doc.line(margin, y, width - margin, y);
  y += 14;

  doc.setTextColor(17, 43, 58);
  for (const line of receipt.lines) {
    const left = `${line.quantity} × ${line.label}`;
    const right = formatMoney(line.lineTotal, receipt.currency);
    const leftLines = doc.splitTextToSize(left, width - margin * 2 - 70);
    doc.text(leftLines, margin, y);
    doc.text(right, width - margin, y, { align: "right" });
    y += Math.max(leftLines.length * 11, 12) + 4;
  }

  y += 6;
  doc.line(margin, y, width - margin, y);
  y += 14;

  const rows: [string, string][] = [
    ["Subtotal", formatMoney(receipt.net, receipt.currency)],
    [
      `VAT (${receipt.vatRate.toFixed(receipt.vatRate % 1 ? 2 : 0)}%)`,
      formatMoney(receipt.vat, receipt.currency),
    ],
    ["Total", formatMoney(receipt.total, receipt.currency)],
  ];
  if (receipt.cashReceived != null) {
    rows.push([
      "Cash received",
      formatMoney(receipt.cashReceived, receipt.currency),
    ]);
    rows.push(["Change", formatMoney(receipt.change ?? 0, receipt.currency)]);
  }

  for (const [label, value] of rows) {
    const bold = label === "Total";
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9);
    doc.text(label, margin, y);
    doc.text(value, width - margin, y, { align: "right" });
    y += bold ? 16 : 13;
  }

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 110, 122);
  doc.text("Thank you for your business.", width / 2, y, { align: "center" });

  doc.save(
    buildDownloadFilename(receipt.businessName, receipt.receiptNumber, "pdf"),
  );
}
