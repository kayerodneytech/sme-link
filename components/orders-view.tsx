"use client";

import { formatDate, formatMoney } from "@/lib/format";
import {
  customers as sampleCustomers,
  orders,
  products as sampleProducts,
} from "@/lib/sample-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const [items, setItems] = useState(orders);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    sampleCustomers,
  );
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>(
    sampleProducts,
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("orders").select("id, order_number, created_at, status, total, customers(name), order_items(count)").order("created_at", { ascending: false }),
      supabase.from("customers").select("id, name").eq("is_archived", false).order("name"),
      supabase.from("products").select("id, name, selling_price").eq("is_archived", false).order("name"),
    ]).then(([orderResult, customerResult, productResult]) => {
      if (orderResult.data) {
        setItems(orderResult.data.map((order) => {
          const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
          const lineCount = Array.isArray(order.order_items) ? order.order_items[0]?.count : 0;
          return {
            id: `OR-${String(order.order_number).padStart(4, "0")}`,
            customer: customer?.name ?? "Unknown customer",
            date: order.created_at,
            items: Number(lineCount ?? 0),
            total: Number(order.total),
            status: String(order.status).replace(/^\w/, (letter) => letter.toUpperCase()),
          };
        }));
      }
      if (customerResult.data) setCustomers(customerResult.data);
      if (productResult.data) setProducts(productResult.data.map((product) => ({ id: product.id, name: product.name, price: Number(product.selling_price) })));
    });
  }, []);

  const filtered = useMemo(() => items.filter((order) => (status === "All" || order.status === status) && `${order.id} ${order.customer}`.toLowerCase().includes(query.toLowerCase())), [items, query, status]);

  async function addOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customerId = String(form.get("customerId") ?? "");
    const productId = String(form.get("productId") ?? "");
    const quantity = Number(form.get("quantity") ?? 1);
    const selectedProduct = products.find((product) => product.id === productId);
    const total = (selectedProduct?.price ?? 0) * quantity;
    const expectedDate = String(form.get("expectedDate") ?? "");
    const notes = String(form.get("notes") ?? "");

    if (!hasSupabaseConfig()) {
      setShowForm(false);
      setMessage("Order added to this demonstration session.");
      return;
    }

    try {
      const businessId = await getCurrentBusinessId();
      const supabase = createClient();
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        business_id: businessId,
        customer_id: customerId,
        status: "pending",
        expected_date: expectedDate || null,
        notes: notes || null,
        subtotal: total,
        total,
      }).select("id").single();
      if (orderError) throw orderError;
      const { error: itemError } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: productId,
        quantity,
        unit_price: selectedProduct?.price ?? 0,
      });
      if (itemError) throw itemError;
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The order could not be saved.");
    }
  }
  return (
    <>
      <div className="toolbar"><RecordToolbar onChange={setQuery} placeholder="Search order or customer" value={query} /><div className="segmented">{["All", "Pending", "Confirmed", "Completed"].map((item) => <button data-active={status === item} key={item} onClick={() => setStatus(item)} type="button">{item}</button>)}</div></div>
      {message && <p className="form-message form-message-success" style={{ marginBottom: 14 }}>{message}</p>}
      <section className="card"><div className="table-wrap desktop-only"><table className="data-table"><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>{filtered.map((order) => <tr key={order.id}><td className="table-name">{order.id}</td><td>{formatDate(order.date)}</td><td>{order.customer}</td><td>{order.items}</td><td className="table-name">{formatMoney(order.total)}</td><td><span className={`badge ${badge(order.status)}`}>{order.status}</span></td></tr>)}</tbody></table></div><div className="mobile-records" style={{ padding: 10 }}>{filtered.map((order) => <article className="card record-card" key={order.id}><div className="record-card-head"><div><p className="list-title">{order.customer}</p><p className="list-meta">{order.id} · {formatDate(order.date)}</p></div><strong>{formatMoney(order.total)}</strong></div><div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginTop: 15 }}><span className="list-meta">{order.items} items</span><span className={`badge ${badge(order.status)}`}>{order.status}</span></div></article>)}</div></section>
      <button className="button button-primary" onClick={() => setShowForm(true)} style={{ bottom: 84, boxShadow: "0 8px 20px rgba(15,118,110,.25)", position: "fixed", right: 18 }} type="button"><Plus size={18} /> New order</button>
      {showForm && <div className="dialog-backdrop"><form className="dialog" onSubmit={addOrder}><div className="dialog-header"><div><p className="eyebrow">Digital sales</p><h2>Create order</h2><p className="page-copy">Record a customer request before it becomes a completed sale.</p></div><button aria-label="Close" className="icon-button" onClick={() => setShowForm(false)} type="button"><X size={18} /></button></div><div className="form-grid"><div className="field"><label htmlFor="order-customer">Customer</label><select className="select" id="order-customer" name="customerId" required><option value="">Choose customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div><div className="field"><label htmlFor="order-product">Product</label><select className="select" id="order-product" name="productId" required><option value="">Choose product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatMoney(product.price)}</option>)}</select></div><div className="field"><label htmlFor="order-quantity">Quantity</label><input className="input" defaultValue="1" id="order-quantity" min="0.001" name="quantity" required step="0.001" type="number" /></div><div className="field"><label htmlFor="order-date">Expected date</label><input className="input" id="order-date" name="expectedDate" type="date" /></div><div className="field"><label htmlFor="order-note">Customer note</label><input className="input" id="order-note" name="notes" placeholder="Delivery or collection details" /></div></div><div className="notice" style={{ marginTop: 16 }}>The order starts as pending. Convert it to a sale only when payment and stock are confirmed.</div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setShowForm(false)} type="button">Cancel</button><button className="button button-primary" type="submit"><Plus size={17} /> Create order</button></div></form></div>}
    </>
  );
}
