"use client";

import { formatMoney } from "@/lib/format";
import { customers } from "@/lib/sample-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { Mail, Phone, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RecordToolbar } from "./record-toolbar";
import { DataLoadingState } from "./data-loading-state";

export function CustomersView() {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState(() => hasSupabaseConfig() ? [] : customers);
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    createClient()
      .from("customers")
      .select("id, name, phone, email, sales(count), orders(count)")
      .eq("is_archived", false)
      .order("name")
      .then(({ data }) => {
        if (data) setItems(
          data.map((customer) => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone ?? "—",
            email: customer.email ?? "—",
            orders:
              Number(Array.isArray(customer.sales) ? customer.sales[0]?.count ?? 0 : 0) +
              Number(Array.isArray(customer.orders) ? customer.orders[0]?.count ?? 0 : 0),
            spent: 0,
          })),
        );
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => items.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  if (loading) return <DataLoadingState />;

  async function addCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextCustomer = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    if (!hasSupabaseConfig()) {
      setItems((current) => [...current, { id: crypto.randomUUID(), ...nextCustomer, orders: 0, spent: 0 }]);
      setShowForm(false);
      setMessage("Customer added to this demonstration session.");
      return;
    }
    try {
      const businessId = await getCurrentBusinessId();
      const { error } = await createClient().from("customers").insert({
        business_id: businessId,
        name: nextCustomer.name,
        phone: nextCustomer.phone || null,
        email: nextCustomer.email || null,
        notes: nextCustomer.notes || null,
      });
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The customer could not be saved.");
    }
  }
  return (
    <>
      <RecordToolbar onChange={setQuery} placeholder="Search name, phone or email" value={query} />
      {message && <p className="form-message form-message-success" style={{ marginBottom: 14 }}>{message}</p>}
      <div className="mobile-records">{filtered.map((customer) => <article className="card record-card" key={customer.id}><div className="record-card-head"><div><p className="list-title">{customer.name}</p><p className="list-meta">{customer.id}</p></div><span className="badge">{customer.orders} orders</span></div><div className="list" style={{ marginTop: 10 }}><div className="list-row"><Phone color="#667085" size={16} /><span className="list-meta">{customer.phone}</span></div><div className="list-row"><Mail color="#667085" size={16} /><span className="list-meta">{customer.email}</span></div></div><strong style={{ display: "block", marginTop: 12 }}>{formatMoney(customer.spent)} lifetime value</strong></article>)}</div>
      <section className="card desktop-only"><div className="table-wrap"><table className="data-table"><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Orders</th><th>Total spent</th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id}><td><span className="table-name">{customer.name}</span><br /><span className="list-meta">{customer.id}</span></td><td>{customer.phone}</td><td>{customer.email}</td><td>{customer.orders}</td><td className="table-name">{formatMoney(customer.spent)}</td></tr>)}</tbody></table></div></section>
      <button className="button button-primary" onClick={() => setShowForm(true)} style={{ bottom: 84, boxShadow: "0 8px 20px rgba(15,118,110,.25)", position: "fixed", right: 18 }} type="button"><Plus size={18} /> Add customer</button>
      {showForm && <div className="dialog-backdrop"><form className="dialog" onSubmit={addCustomer}><div className="dialog-header"><div><p className="eyebrow">Customer</p><h2>Add customer</h2><p className="page-copy">Keep the details needed for future orders and sales.</p></div><button aria-label="Close" className="icon-button" onClick={() => setShowForm(false)} type="button"><X size={18} /></button></div><div className="form-grid"><div className="field"><label htmlFor="customer-name">Name</label><input className="input" id="customer-name" name="name" required /></div><div className="field"><label htmlFor="customer-phone">Phone</label><input className="input" id="customer-phone" name="phone" type="tel" /></div><div className="field"><label htmlFor="customer-email">Email</label><input className="input" id="customer-email" name="email" type="email" /></div><div className="field"><label htmlFor="customer-note">Note (optional)</label><input className="input" id="customer-note" name="notes" /></div></div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setShowForm(false)} type="button">Cancel</button><button className="button button-primary" type="submit"><Plus size={17} /> Save customer</button></div></form></div>}
    </>
  );
}
