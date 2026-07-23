"use client";

import { formatMoney } from "@/lib/format";
import { customers } from "@/lib/sample-data";
import { Mail, Phone, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { RecordToolbar } from "./record-toolbar";

export function CustomersView() {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const filtered = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <>
      <RecordToolbar onChange={setQuery} placeholder="Search name, phone or email" value={query} />
      <div className="mobile-records">{filtered.map((customer) => <article className="card record-card" key={customer.id}><div className="record-card-head"><div><p className="list-title">{customer.name}</p><p className="list-meta">{customer.id}</p></div><span className="badge">{customer.orders} orders</span></div><div className="list" style={{ marginTop: 10 }}><div className="list-row"><Phone color="#667085" size={16} /><span className="list-meta">{customer.phone}</span></div><div className="list-row"><Mail color="#667085" size={16} /><span className="list-meta">{customer.email}</span></div></div><strong style={{ display: "block", marginTop: 12 }}>{formatMoney(customer.spent)} lifetime value</strong></article>)}</div>
      <section className="card desktop-only"><div className="table-wrap"><table className="data-table"><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Orders</th><th>Total spent</th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id}><td><span className="table-name">{customer.name}</span><br /><span className="list-meta">{customer.id}</span></td><td>{customer.phone}</td><td>{customer.email}</td><td>{customer.orders}</td><td className="table-name">{formatMoney(customer.spent)}</td></tr>)}</tbody></table></div></section>
      <button className="button button-primary" onClick={() => setShowForm(true)} style={{ bottom: 84, boxShadow: "0 8px 20px rgba(15,118,110,.25)", position: "fixed", right: 18 }} type="button"><Plus size={18} /> Add customer</button>
      {showForm && <div className="dialog-backdrop"><form className="dialog" onSubmit={(event) => { event.preventDefault(); setShowForm(false); }}><div className="dialog-header"><div><p className="eyebrow">Customer</p><h2>Add customer</h2><p className="page-copy">Keep the details needed for future orders and sales.</p></div><button aria-label="Close" className="icon-button" onClick={() => setShowForm(false)} type="button"><X size={18} /></button></div><div className="form-grid"><div className="field"><label htmlFor="customer-name">Name</label><input className="input" id="customer-name" required /></div><div className="field"><label htmlFor="customer-phone">Phone</label><input className="input" id="customer-phone" type="tel" /></div><div className="field"><label htmlFor="customer-email">Email</label><input className="input" id="customer-email" type="email" /></div><div className="field"><label htmlFor="customer-note">Note (optional)</label><input className="input" id="customer-note" /></div></div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setShowForm(false)} type="button">Cancel</button><button className="button button-primary" type="submit"><Plus size={17} /> Save customer</button></div></form></div>}
    </>
  );
}
