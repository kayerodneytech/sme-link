"use client";

import { formatDate, formatMoney } from "@/lib/format";
import { sales } from "@/lib/sample-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { ExcelExportButton } from "./excel-export-button";
import { RecordToolbar } from "./record-toolbar";
import { DataLoadingState } from "./data-loading-state";

export function SalesView() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(() => hasSupabaseConfig() ? [] : sales);
  const [loading, setLoading] = useState(hasSupabaseConfig());
  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    createClient()
      .from("sales")
      .select("id, sale_number, created_at, payment_method, total, status, customers(name), sale_items(count)")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setItems(
          data.map((sale) => {
            const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
            const count = Array.isArray(sale.sale_items) ? sale.sale_items[0]?.count : 0;
            return {
              id: `SL-${String(sale.sale_number).padStart(4, "0")}`,
              customer: customer?.name ?? "Walk-in customer",
              date: sale.created_at,
              items: Number(count ?? 0),
              method: String(sale.payment_method).replace("_", " "),
              total: Number(sale.total),
              status: "Completed",
            };
          }),
        );
        setLoading(false);
      });
  }, []);
  const filtered = useMemo(
    () => items.filter((sale) => `${sale.id} ${sale.customer} ${sale.method}`.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );
  const revenue = items.reduce((sum, sale) => sum + sale.total, 0);

  if (loading) return <DataLoadingState />;

  return (
    <>
      <section className="stat-strip">
        <article className="card stat-tile"><p>Total revenue</p><strong>{formatMoney(revenue)}</strong></article>
        <article className="card stat-tile"><p>Sales recorded</p><strong>{items.length}</strong></article>
        <article className="card stat-tile"><p>Average sale</p><strong>{formatMoney(items.length ? revenue / items.length : 0)}</strong></article>
        <article className="card stat-tile"><p>Latest sale</p><strong className="metric-positive">{formatMoney(items[0]?.total ?? 0)}</strong></article>
      </section>
      <RecordToolbar onChange={setQuery} placeholder="Search sale or customer" value={query}>
        <ExcelExportButton
          documentLabel="sales"
          headers={["Sale", "Date", "Customer", "Items", "Payment", "Total", "Status"]}
          rows={filtered.map((sale) => [
            sale.id,
            sale.date,
            sale.customer,
            sale.items,
            sale.method,
            sale.total,
            sale.status,
          ])}
          sheetName="Sales"
        />
      </RecordToolbar>
      <section className="card">
        <div className="table-wrap desktop-only">
          <table className="data-table">
            <thead><tr><th>Sale</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>{filtered.map((sale) => <tr key={sale.id}><td className="table-name">{sale.id}</td><td>{formatDate(sale.date)}</td><td>{sale.customer}</td><td>{sale.items}</td><td>{sale.method}</td><td className="table-name">{formatMoney(sale.total)}</td><td><span className="badge badge-success">{sale.status}</span></td></tr>)}</tbody>
          </table>
        </div>
        <div className="mobile-records" style={{ padding: 10 }}>
          {filtered.map((sale) => <article className="card record-card" key={sale.id}><div className="record-card-head"><div><p className="list-title">{sale.customer}</p><p className="list-meta">{sale.id} · {formatDate(sale.date)}</p></div><strong>{formatMoney(sale.total)}</strong></div><div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginTop: 15 }}><span className="list-meta">{sale.items} items · {sale.method}</span><span className="badge badge-success">Completed</span></div></article>)}
        </div>
      </section>
    </>
  );
}
