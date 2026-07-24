"use client";

import { formatDate, formatMoney } from "@/lib/format";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import {
  Check,
  Download,
  LoaderCircle,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataLoadingState } from "./data-loading-state";
import { ExcelExportButton } from "./excel-export-button";
import { RecordToolbar } from "./record-toolbar";

type InvoiceRow = {
  id: string;
  number: string;
  customer: string;
  date: string;
  dueDate: string;
  total: number;
  currency: string;
  status: "unpaid" | "paid" | "overdue" | "lost";
};

const demoInvoices: InvoiceRow[] = [
  {
    id: "demo-1",
    number: "INV-0001",
    customer: "Demo Client",
    date: "2026-07-20",
    dueDate: "2026-07-27",
    total: 400,
    currency: "USD",
    status: "unpaid",
  },
];

function statusBadge(status: InvoiceRow["status"]) {
  if (status === "paid") return "badge badge-success";
  if (status === "overdue") return "badge badge-danger";
  if (status === "lost") return "badge";
  return "badge badge-warning";
}

function statusLabel(status: InvoiceRow["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function InvoicesView() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<InvoiceRow[]>(() =>
    hasSupabaseConfig() ? [] : demoInvoices,
  );
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [message, setMessage] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadInvoices() {
    if (!hasSupabaseConfig()) return;
    const supabase = createClient();
    await supabase.rpc("refresh_overdue_invoices");
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, issue_date, due_date, total, currency, status, customers(name, company_name)",
      )
      .order("created_at", { ascending: false });
    if (error) {
      setMessage(
        /invoices|schema cache/i.test(error.message)
          ? `${error.message} Run supabase/migrations/0010_service_invoices.sql in Supabase.`
          : error.message,
      );
      setLoading(false);
      return;
    }
    setItems(
      (data ?? []).map((invoice) => {
        const customer = Array.isArray(invoice.customers)
          ? invoice.customers[0]
          : invoice.customers;
        return {
          id: invoice.id,
          number: `INV-${String(invoice.invoice_number).padStart(4, "0")}`,
          customer: customer
            ? customer.company_name
              ? `${customer.name} · ${customer.company_name}`
              : customer.name
            : "No customer",
          date: invoice.issue_date,
          dueDate: invoice.due_date,
          total: Number(invoice.total),
          currency: invoice.currency ?? "USD",
          status: invoice.status as InvoiceRow["status"],
        };
      }),
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadInvoices();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((invoice) =>
        `${invoice.number} ${invoice.customer} ${invoice.status}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const unpaidTotal = items
    .filter((invoice) => invoice.status === "unpaid" || invoice.status === "overdue")
    .reduce((sum, invoice) => sum + invoice.total, 0);
  const paidTotal = items
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  async function markPaid(invoiceId: string) {
    setBusyId(invoiceId);
    setMessage("");
    try {
      const { error } = await createClient().rpc("mark_invoice_paid", {
        target_invoice_id: invoiceId,
        selected_payment_method: paymentMethod,
      });
      if (error) throw error;
      setPayingId(null);
      setLoading(true);
      await loadInvoices();
      setMessage("Invoice marked paid. Sale recorded.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not mark invoice paid.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(invoiceId: string, status: "lost" | "unpaid" | "overdue") {
    setBusyId(invoiceId);
    setMessage("");
    try {
      const { error } = await createClient()
        .from("invoices")
        .update({ status })
        .eq("id", invoiceId)
        .in("status", ["unpaid", "overdue", "lost"]);
      if (error) throw error;
      setLoading(true);
      await loadInvoices();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update status.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <DataLoadingState />;

  return (
    <>
      <section className="stat-strip">
        <article className="card stat-tile">
          <p>Outstanding</p>
          <strong>{formatMoney(unpaidTotal)}</strong>
        </article>
        <article className="card stat-tile">
          <p>Paid (sales)</p>
          <strong>{formatMoney(paidTotal)}</strong>
        </article>
        <article className="card stat-tile">
          <p>Invoices</p>
          <strong>{items.length}</strong>
        </article>
        <article className="card stat-tile">
          <p>Overdue</p>
          <strong>
            {items.filter((invoice) => invoice.status === "overdue").length}
          </strong>
        </article>
      </section>

      <RecordToolbar
        onChange={setQuery}
        placeholder="Search invoice or customer"
        value={query}
      >
        <ExcelExportButton
          filename="smelink-invoices.xlsx"
          headers={[
            "Invoice",
            "Issued",
            "Due",
            "Customer",
            "Currency",
            "Total",
            "Status",
          ]}
          rows={filtered.map((invoice) => [
            invoice.number,
            invoice.date,
            invoice.dueDate,
            invoice.customer,
            invoice.currency,
            invoice.total,
            invoice.status,
          ])}
          sheetName="Invoices"
        />
      </RecordToolbar>
      {message && (
        <p
          className={`form-message ${
            message.includes("paid") || message.includes("Sale")
              ? "form-message-success"
              : "form-message-error"
          }`}
          style={{ marginBottom: 14 }}
        >
          {message}
        </p>
      )}

      <section className="card">
        <div className="table-wrap desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="table-name">{invoice.number}</td>
                  <td>{formatDate(invoice.date)}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td>{invoice.customer}</td>
                  <td className="table-name">
                    {formatMoney(invoice.total, invoice.currency)}
                  </td>
                  <td>
                    <span className={statusBadge(invoice.status)}>
                      {statusLabel(invoice.status)}
                    </span>
                  </td>
                  <td>
                    <InvoiceActions
                      busy={busyId === invoice.id}
                      invoice={invoice}
                      onLost={() => void setStatus(invoice.id, "lost")}
                      onMarkPaid={() => setPayingId(invoice.id)}
                      onReopen={() => void setStatus(invoice.id, "unpaid")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-records" style={{ padding: 10 }}>
          {filtered.map((invoice) => (
            <article className="card record-card" key={invoice.id}>
              <div className="record-card-head">
                <div>
                  <p className="list-title">{invoice.customer}</p>
                  <p className="list-meta">
                    {invoice.number} · due {formatDate(invoice.dueDate)}
                  </p>
                </div>
                <strong>
                  {formatMoney(invoice.total, invoice.currency)}
                </strong>
              </div>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 14,
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span className={statusBadge(invoice.status)}>
                  {statusLabel(invoice.status)}
                </span>
                <InvoiceActions
                  busy={busyId === invoice.id}
                  invoice={invoice}
                  onLost={() => void setStatus(invoice.id, "lost")}
                  onMarkPaid={() => setPayingId(invoice.id)}
                  onReopen={() => void setStatus(invoice.id, "unpaid")}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {payingId && (
        <div className="dialog-backdrop">
          <div className="dialog">
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Collect payment</p>
                <h2>Mark invoice paid</h2>
                <p className="page-copy">
                  This records the sale and adds the money to that currency’s cash.
                </p>
              </div>
            </div>
            <div className="field">
              <label htmlFor="pay-method">Payment method</label>
              <select
                className="select"
                id="pay-method"
                onChange={(event) => setPaymentMethod(event.target.value)}
                value={paymentMethod}
              >
                <option value="cash">Cash</option>
                <option value="ecocash">EcoCash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="dialog-actions">
              <button
                className="button button-secondary"
                onClick={() => setPayingId(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={busyId === payingId}
                onClick={() => void markPaid(payingId)}
                type="button"
              >
                {busyId === payingId ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Check size={17} />
                )}
                Mark paid
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InvoiceActions({
  invoice,
  busy,
  onMarkPaid,
  onLost,
  onReopen,
}: {
  invoice: InvoiceRow;
  busy: boolean;
  onMarkPaid: () => void;
  onLost: () => void;
  onReopen: () => void;
}) {
  const canPay = invoice.status === "unpaid" || invoice.status === "overdue";
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Link
        className="button button-secondary"
        href={`/invoices/${invoice.id}`}
        style={{ minHeight: 36, padding: "0 10px" }}
      >
        <Download size={15} /> Download
      </Link>
      {canPay && (
        <button
          className="button button-primary"
          disabled={busy}
          onClick={onMarkPaid}
          style={{ minHeight: 36, padding: "0 10px" }}
          type="button"
        >
          <Check size={15} /> Mark paid
        </button>
      )}
      {canPay && (
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={onLost}
          style={{ minHeight: 36, padding: "0 10px" }}
          type="button"
        >
          <MoreHorizontal size={15} /> Lost
        </button>
      )}
      {invoice.status === "lost" && (
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={onReopen}
          style={{ minHeight: 36, padding: "0 10px" }}
          type="button"
        >
          Reopen
        </button>
      )}
    </div>
  );
}
