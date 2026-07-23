"use client";

import { formatDate, formatMoney } from "@/lib/format";
import { orders } from "@/lib/sample-data";
import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { RecordToolbar } from "./record-toolbar";

function badge(status: string) {
  if (status === "Completed") return "badge-success";
  if (status === "Cancelled") return "badge-danger";
  if (status === "Pending") return "badge-warning";
  return "";
}

export function OrdersView() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const filtered = useMemo(() => orders.filter((order) => (status === "All" || order.status === status) && `${order.id} ${order.customer}`.toLowerCase().includes(query.toLowerCase())), [query, status]);
  return (
    <>
      <div className="toolbar"><RecordToolbar onChange={setQuery} placeholder="Search order or customer" value={query} /><div className="segmented">{["All", "Pending", "Confirmed", "Completed"].map((item) => <button data-active={status === item} key={item} onClick={() => setStatus(item)} type="button">{item}</button>)}</div></div>
      <section className="card"><div className="table-wrap desktop-only"><table className="data-table"><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map((order) => <tr key={order.id}><td className="table-name">{order.id}</td><td>{formatDate(order.date)}</td><td>{order.customer}</td><td>{order.items}</td><td className="table-name">{formatMoney(order.total)}</td><td><span className={`badge ${badge(order.status)}`}>{order.status}</span></td><td><button className="subtle-link" style={{ background: "none", border: 0 }}>View</button></td></tr>)}</tbody></table></div><div className="mobile-records" style={{ padding: 10 }}>{filtered.map((order) => <article className="card record-card" key={order.id}><div className="record-card-head"><div><p className="list-title">{order.customer}</p><p className="list-meta">{order.id} · {formatDate(order.date)}</p></div><strong>{formatMoney(order.total)}</strong></div><div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginTop: 15 }}><span className="list-meta">{order.items} items</span><span className={`badge ${badge(order.status)}`}>{order.status}</span></div></article>)}</div></section>
      <button className="button button-primary" onClick={() => setShowForm(true)} style={{ bottom: 84, boxShadow: "0 8px 20px rgba(15,118,110,.25)", position: "fixed", right: 18 }} type="button"><Plus size={18} /> New order</button>
      {showForm && <div className="dialog-backdrop"><form className="dialog" onSubmit={(event) => { event.preventDefault(); setShowForm(false); }}><div className="dialog-header"><div><p className="eyebrow">Digital sales</p><h2>Create order</h2><p className="page-copy">Record a customer request before it becomes a completed sale.</p></div><button aria-label="Close" className="icon-button" onClick={() => setShowForm(false)} type="button"><X size={18} /></button></div><div className="form-grid"><div className="field"><label htmlFor="order-customer">Customer</label><select className="select" id="order-customer"><option>Makanaka Store</option><option>Rudo Moyo</option><option>Tawanda Mini Mart</option></select></div><div className="field"><label htmlFor="order-status">Status</label><select className="select" id="order-status"><option>Pending</option><option>Confirmed</option></select></div><div className="field"><label htmlFor="order-note">Customer note</label><input className="input" id="order-note" placeholder="Delivery or collection details" /></div><div className="field"><label htmlFor="order-date">Expected date</label><input className="input" id="order-date" type="date" /></div></div><div className="notice" style={{ marginTop: 16 }}>Products and quantities are added after the order header is saved.</div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setShowForm(false)} type="button">Cancel</button><button className="button button-primary" type="submit"><Plus size={17} /> Create order</button></div></form></div>}
    </>
  );
}
