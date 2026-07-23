"use client";

import { formatDate, formatMoney } from "@/lib/format";
import { sales } from "@/lib/sample-data";
import { useMemo, useState } from "react";
import { RecordToolbar } from "./record-toolbar";

export function SalesView() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => sales.filter((sale) => `${sale.id} ${sale.customer} ${sale.method}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <>
      <section className="stat-strip">
        <article className="card stat-tile"><p>June revenue</p><strong>$8,450.00</strong></article>
        <article className="card stat-tile"><p>Sales recorded</p><strong>82</strong></article>
        <article className="card stat-tile"><p>Average sale</p><strong>$103.05</strong></article>
        <article className="card stat-tile"><p>Today</p><strong className="metric-positive">$186.00</strong></article>
      </section>
      <RecordToolbar onChange={setQuery} placeholder="Search sale or customer" value={query} />
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
