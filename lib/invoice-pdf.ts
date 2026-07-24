import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildDownloadFilename } from "@/lib/download-filename";
import { formatDate, formatMoney } from "@/lib/format";

export type InvoicePdfItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoicePdfData = {
  businessName: string;
  businessPhone?: string | null;
  businessLocation?: string | null;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  currency: string;
  notes?: string | null;
  customerName: string;
  customerCompany?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  items: InvoicePdfItem[];
  total: number;
};

export function downloadInvoicePdf(invoice: InvoicePdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(17, 43, 58);
  doc.text(invoice.businessName || "Business", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 110, 122);
  if (invoice.businessLocation) {
    doc.text(invoice.businessLocation, margin, y);
    y += 14;
  }
  if (invoice.businessPhone) {
    doc.text(invoice.businessPhone, margin, y);
    y += 14;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 118, 110);
  doc.text(invoice.invoiceNumber, pageWidth - margin, margin, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 110, 122);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - margin, margin + 16, {
    align: "right",
  });

  y = Math.max(y, margin + 40) + 12;
  doc.setDrawColor(220, 228, 232);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  const leftX = margin;
  const rightX = pageWidth / 2 + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(90, 110, 122);
  doc.text("BILL TO", leftX, y);
  doc.text("DATES", rightX, y);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(17, 43, 58);
  doc.text(invoice.customerName || "Customer", leftX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Issued: ${formatDate(invoice.issueDate)}`, rightX, y);
  y += 14;

  let leftY = y;
  let rightY = y;
  doc.setTextColor(90, 110, 122);
  if (invoice.customerCompany) {
    doc.text(invoice.customerCompany, leftX, leftY);
    leftY += 13;
  }
  if (invoice.customerPhone) {
    doc.text(invoice.customerPhone, leftX, leftY);
    leftY += 13;
  }
  if (invoice.customerEmail) {
    doc.text(invoice.customerEmail, leftX, leftY);
    leftY += 13;
  }
  if (invoice.customerAddress) {
    const lines = doc.splitTextToSize(invoice.customerAddress, pageWidth / 2 - margin - 8);
    doc.text(lines, leftX, leftY);
    leftY += lines.length * 13;
  }

  doc.setTextColor(17, 43, 58);
  doc.text(`Due: ${formatDate(invoice.dueDate)}`, rightX, rightY);
  rightY += 13;
  if (invoice.paidAt) {
    const paidLabel = `Paid: ${formatDate(String(invoice.paidAt).slice(0, 10))}${
      invoice.paymentMethod
        ? ` · ${String(invoice.paymentMethod).replace(/_/g, " ")}`
        : ""
    }`;
    doc.text(paidLabel, rightX, rightY);
    rightY += 13;
  }

  y = Math.max(leftY, rightY) + 20;

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Price", "Amount"]],
    body: invoice.items.map((item) => [
      item.description,
      String(item.quantity),
      formatMoney(item.unitPrice, invoice.currency),
      formatMoney(item.lineTotal, invoice.currency),
    ]),
    styles: {
      font: "helvetica",
      fontSize: 10,
      textColor: [17, 43, 58],
      cellPadding: 8,
      lineColor: [220, 228, 232],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      1: { halign: "right", cellWidth: 50 },
      2: { halign: "right", cellWidth: 90 },
      3: { halign: "right", cellWidth: 90 },
    },
    margin: { left: margin, right: margin },
  });

  const tableEnd =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 40;

  y = tableEnd + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 43, 58);
  doc.text("Total", pageWidth - margin - 140, y);
  doc.text(formatMoney(invoice.total, invoice.currency), pageWidth - margin, y, {
    align: "right",
  });

  if (invoice.notes) {
    y += 28;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 110, 122);
    const noteLines = doc.splitTextToSize(`Note: ${invoice.notes}`, pageWidth - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 13;
  }

  y += 28;
  doc.setFontSize(10);
  doc.setTextColor(90, 110, 122);
  doc.text("Thank you for your business.", margin, y);

  const filename = buildDownloadFilename(
    invoice.businessName,
    invoice.invoiceNumber,
    "pdf",
  );
  doc.save(filename);
}
