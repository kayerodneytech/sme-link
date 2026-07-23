"use client";

import { products as initialProducts } from "@/lib/sample-data";
import { formatMoney } from "@/lib/format";
import { Box, PackagePlus, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { RecordToolbar } from "./record-toolbar";

export function InventoryView() {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const products = useMemo(
    () =>
      initialProducts.filter((product) =>
        `${product.name} ${product.sku} ${product.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <>
      <section className="stat-strip">
        <article className="card stat-tile"><p>Products</p><strong>6</strong></article>
        <article className="card stat-tile"><p>Units in stock</p><strong>67</strong></article>
        <article className="card stat-tile"><p>Stock value</p><strong>$298.50</strong></article>
        <article className="card stat-tile"><p>Low-stock items</p><strong style={{ color: "#D97706" }}>3</strong></article>
      </section>

      <RecordToolbar onChange={setQuery} placeholder="Search products or SKU" value={query}>
        <button className="button button-secondary" onClick={() => setShowForm(true)} type="button">
          <PackagePlus size={16} /> Stock movement
        </button>
      </RecordToolbar>

      <section className="card">
        <div className="table-wrap desktop-only">
          <table className="data-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="table-name">{product.name}</td>
                  <td>{product.sku}</td>
                  <td>{product.category}</td>
                  <td>{formatMoney(product.price)}</td>
                  <td>{product.stock} units</td>
                  <td><span className={`badge ${product.status === "Low stock" ? "badge-warning" : "badge-success"}`}>{product.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-records" style={{ padding: 10 }}>
          {products.map((product) => (
            <article className="card record-card" key={product.id}>
              <div className="record-card-head">
                <div>
                  <p className="list-title">{product.name}</p>
                  <p className="list-meta">{product.sku} · {product.category}</p>
                </div>
                <span className={`badge ${product.status === "Low stock" ? "badge-warning" : "badge-success"}`}>{product.status}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 15 }}>
                <span className="list-meta">{product.stock} units available</span>
                <strong>{formatMoney(product.price)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      {showForm && (
        <div className="dialog-backdrop" role="presentation">
          <form className="dialog" onSubmit={(event) => { event.preventDefault(); setShowForm(false); }}>
            <div className="dialog-header">
              <div><p className="eyebrow">Inventory</p><h2>Record stock movement</h2><p className="page-copy">Keep a clear record of why stock changed.</p></div>
              <button className="icon-button" aria-label="Close" onClick={() => setShowForm(false)} type="button"><X size={18} /></button>
            </div>
            <div className="form-grid">
              <div className="field"><label htmlFor="movement-product">Product</label><select className="select" id="movement-product" required><option value="">Choose a product</option>{initialProducts.map((p) => <option key={p.id}>{p.name}</option>)}</select></div>
              <div className="field"><label htmlFor="movement-type">Movement type</label><select className="select" id="movement-type" required><option>Stock received</option><option>Adjustment</option><option>Damaged stock</option><option>Customer return</option></select></div>
              <div className="field"><label htmlFor="movement-quantity">Quantity</label><input className="input" id="movement-quantity" min="1" required type="number" /></div>
              <div className="field"><label htmlFor="movement-reference">Reference or note</label><input className="input" id="movement-reference" placeholder="e.g. Supplier delivery 184" /></div>
            </div>
            <div className="dialog-actions"><button className="button button-secondary" onClick={() => setShowForm(false)} type="button">Cancel</button><button className="button button-primary" type="submit"><Plus size={17} /> Save movement</button></div>
          </form>
        </div>
      )}
    </>
  );
}
