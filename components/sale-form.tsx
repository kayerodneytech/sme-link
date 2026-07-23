"use client";

import { formatMoney } from "@/lib/format";
import { customers as sampleCustomers, products as sampleProducts } from "@/lib/sample-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Line = { productId: string; quantity: number };
type ProductOption = { id: string; name: string; price: number; stock: number };
type CustomerOption = { id: string; name: string };

export function SaleForm() {
  const [lines, setLines] = useState<Line[]>([{ productId: "p4", quantity: 1 }]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>(sampleProducts);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>(sampleCustomers);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = productOptions.find((item) => item.id === line.productId);
        return sum + (product?.price ?? 0) * line.quantity;
      }, 0),
    [lines, productOptions],
  );

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("product_stock")
        .select("id, name, selling_price, quantity_on_hand")
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("customers")
        .select("id, name")
        .eq("is_archived", false)
        .order("name"),
    ]).then(([productResult, customerResult]) => {
      if (productResult.data) {
        setProductOptions(
          productResult.data.map((product) => ({
            id: product.id,
            name: product.name,
            price: Number(product.selling_price),
            stock: Number(product.quantity_on_hand),
          })),
        );
        setLines([{ productId: "", quantity: 1 }]);
      }
      if (customerResult.data) {
        setCustomerOptions(customerResult.data);
      }
    });
  }, []);

  function updateLine(index: number, next: Partial<Line>) {
    setLines((current) => current.map((line, i) => i === index ? { ...line, ...next } : line));
  }

  async function completeSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (lines.length === 0 || lines.some((line) => !line.productId)) {
      setMessage("Choose at least one product before completing the sale.");
      return;
    }

    if (!hasSupabaseConfig()) {
      setMessage("Sale completed in the demonstration session.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const businessId = await getCurrentBusinessId();
      const supabase = createClient();
      const customerId = String(form.get("customerId") ?? "");
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          business_id: businessId,
          customer_id: customerId || null,
          payment_method: String(form.get("paymentMethod") ?? "cash"),
        })
        .select("id")
        .single();
      if (saleError) throw saleError;

      const saleItems = lines.map((line) => {
        const product = productOptions.find((item) => item.id === line.productId);
        return {
          sale_id: sale.id,
          product_id: line.productId,
          quantity: line.quantity,
          unit_price: product?.price ?? 0,
        };
      });
      const { error: itemError } = await supabase.from("sale_items").insert(saleItems);
      if (itemError) throw itemError;

      const { error: completionError } = await supabase.rpc("complete_sale", {
        target_sale_id: sale.id,
      });
      if (completionError) throw completionError;
      window.location.assign("/sales");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The sale could not be completed.");
      setSaving(false);
    }
  }

  return (
    <form className="grid-main" onSubmit={completeSale}>
      <div style={{ display: "grid", gap: 16 }}>
        <section className="card card-pad">
          <div className="section-heading"><div><h2>Customer and payment</h2><p>Choose a saved customer or record a walk-in sale</p></div></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="customer">Customer</label><select className="select" id="customer" name="customerId"><option value="">Walk-in customer</option>{customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
            <div className="field"><label htmlFor="payment-method">Payment method</label><select className="select" id="payment-method" name="paymentMethod"><option value="cash">Cash</option><option value="ecocash">EcoCash</option><option value="bank_transfer">Bank transfer</option><option value="card">Card</option></select></div>
          </div>
        </section>

        <section className="card card-pad">
          <div className="section-heading"><div><h2>Sale items</h2><p>Add the products included in this transaction</p></div><button className="button button-secondary" onClick={() => setLines((current) => [...current, { productId: "", quantity: 1 }])} type="button"><Plus size={16} /> Add item</button></div>
          <div style={{ display: "grid", gap: 12 }}>
            {lines.map((line, index) => {
              const product = productOptions.find((item) => item.id === line.productId);
              return (
                <div className="card record-card" key={`${index}-${line.productId}`}>
                  <div className="form-grid" style={{ alignItems: "end" }}>
                    <div className="field"><label htmlFor={`product-${index}`}>Product</label><select className="select" id={`product-${index}`} onChange={(event) => updateLine(index, { productId: event.target.value })} value={line.productId}><option value="">Choose product</option>{productOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stock} available</option>)}</select></div>
                    <div style={{ alignItems: "end", display: "flex", gap: 10 }}>
                      <div className="field" style={{ flex: 1 }}><label htmlFor={`quantity-${index}`}>Quantity</label><div style={{ alignItems: "center", display: "flex", gap: 6 }}><button className="icon-button" onClick={() => updateLine(index, { quantity: Math.max(1, line.quantity - 1) })} type="button"><Minus size={16} /></button><input className="input" id={`quantity-${index}`} min="1" onChange={(event) => updateLine(index, { quantity: Math.max(1, Number(event.target.value)) })} style={{ textAlign: "center" }} type="number" value={line.quantity} /><button className="icon-button" onClick={() => updateLine(index, { quantity: line.quantity + 1 })} type="button"><Plus size={16} /></button></div></div>
                      <button aria-label="Remove item" className="icon-button" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} style={{ color: "#B42318" }} type="button"><Trash2 size={17} /></button>
                    </div>
                  </div>
                  {product && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}><span className="list-meta">{formatMoney(product.price)} each</span><strong>{formatMoney(product.price * line.quantity)}</strong></div>}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <aside>
        <section className="card card-pad" style={{ position: "sticky", top: 96 }}>
          <div className="section-heading"><div><h2>Sale summary</h2><p>Check the transaction before saving</p></div></div>
          <div className="list">
            <div className="list-row"><span className="list-title">Items</span><span className="list-value">{lines.reduce((sum, line) => sum + line.quantity, 0)}</span></div>
            <div className="list-row"><span className="list-title">Subtotal</span><span className="list-value">{formatMoney(total)}</span></div>
            <div className="list-row"><span className="list-title">Total</span><span className="summary-value" style={{ fontSize: "1.65rem", margin: "0 0 0 auto" }}>{formatMoney(total)}</span></div>
          </div>
          <div className="notice" style={{ margin: "16px 0" }}><Check size={18} /> Stock will be deducted only after the sale is completed.</div>
          {message && <p className={`form-message ${message.includes("completed") ? "form-message-success" : "form-message-error"}`}>{message}</p>}
          <button className="button button-primary" disabled={saving} style={{ width: "100%" }} type="submit"><Check size={18} /> {saving ? "Completing…" : "Complete sale"}</button>
          <Link className="button button-secondary" href="/sales" style={{ marginTop: 9, width: "100%" }}>Cancel</Link>
        </section>
      </aside>
    </form>
  );
}
