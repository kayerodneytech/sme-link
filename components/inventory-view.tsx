"use client";

import { products as initialProducts } from "@/lib/sample-data";
import { formatMoney } from "@/lib/format";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { PackagePlus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RecordToolbar } from "./record-toolbar";

export function InventoryView() {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [items, setItems] = useState(initialProducts);
  const [message, setMessage] = useState("");
  const products = useMemo(
    () =>
      items.filter((product) =>
        `${product.name} ${product.sku} ${product.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("product_stock")
      .select("id, name, sku, barcode, category, product_type, unit, pack_size, cost_price, selling_price, reorder_level, quantity_on_hand")
      .eq("is_archived", false)
      .order("name")
      .then(({ data }) => {
        if (!active || !data) return;
        setItems(
          data.map((product) => {
            const stock = Number(product.quantity_on_hand);
            const threshold = Number(product.reorder_level);
            return {
              id: product.id,
              name: product.name,
              sku: product.sku ?? "—",
              barcode: product.barcode ?? "",
              category: product.category ?? "Uncategorised",
              productType: product.product_type,
              unit: product.unit,
              packSize: Number(product.pack_size),
              cost: Number(product.cost_price),
              price: Number(product.selling_price),
              stock,
              threshold,
              status: stock <= threshold ? "Low stock" : "In stock",
            };
          }),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const sku = String(form.get("sku") ?? "");
    const barcode = String(form.get("barcode") ?? "");
    const category = String(form.get("category") ?? "");
    const productType = String(form.get("productType") ?? "stocked");
    const unit = String(form.get("unit") ?? "item");
    const packSize = Number(form.get("packSize") ?? 1);
    const cost = Number(form.get("cost") ?? 0);
    const price = Number(form.get("price") ?? 0);
    const threshold = Number(form.get("threshold") ?? 0);
    const openingStock = Number(form.get("openingStock") ?? 0);

    if (!hasSupabaseConfig()) {
      setItems((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name,
          sku: sku || "—",
          barcode,
          category: category || "Uncategorised",
          productType,
          unit,
          packSize,
          cost,
          price,
          threshold,
          stock: openingStock,
          status: openingStock <= threshold ? "Low stock" : "In stock",
        },
      ]);
      setShowProductForm(false);
      setMessage("Product added to this demonstration session.");
      return;
    }

    try {
      const businessId = await getCurrentBusinessId();
      const supabase = createClient();
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          business_id: businessId,
          name,
          sku: sku || null,
          barcode: barcode || null,
          category: category || null,
          product_type: productType,
          unit,
          pack_size: packSize,
          cost_price: cost,
          selling_price: price,
          reorder_level: threshold,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (productType === "stocked" && openingStock > 0) {
        const { error: stockError } = await supabase
          .from("inventory_movements")
          .insert({
            business_id: businessId,
            product_id: product.id,
            movement_type: "opening_stock",
            quantity_change: openingStock,
            note: "Opening stock",
          });
        if (stockError) throw stockError;
      }
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The product could not be saved.");
    }
  }

  async function addMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const productId = String(form.get("productId") ?? "");
    const movementType = String(form.get("movementType") ?? "");
    const enteredQuantity = Number(form.get("quantity") ?? 0);
    const quantity =
      movementType === "damaged" ? -Math.abs(enteredQuantity) : Math.abs(enteredQuantity);
    const note = String(form.get("note") ?? "");

    if (!hasSupabaseConfig()) {
      setItems((current) =>
        current.map((product) =>
          product.id === productId
            ? { ...product, stock: product.stock + quantity }
            : product,
        ),
      );
      setShowForm(false);
      setMessage("Stock movement added to this demonstration session.");
      return;
    }

    try {
      const businessId = await getCurrentBusinessId();
      const supabase = createClient();
      const { error } = await supabase.from("inventory_movements").insert({
        business_id: businessId,
        product_id: productId,
        movement_type: movementType,
        quantity_change: quantity,
        note: note || null,
      });
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The movement could not be saved.");
    }
  }

  return (
    <>
      <section className="stat-strip">
        <article className="card stat-tile"><p>Products and services</p><strong>{items.length}</strong></article>
        <article className="card stat-tile"><p>Stock on hand</p><strong>{items.filter((item) => item.productType === "stocked").reduce((sum, item) => sum + item.stock, 0)}</strong></article>
        <article className="card stat-tile"><p>Stock cost value</p><strong>{formatMoney(items.reduce((sum, item) => sum + item.cost * item.stock, 0))}</strong></article>
        <article className="card stat-tile"><p>Low-stock products</p><strong style={{ color: "#D97706" }}>{items.filter((item) => item.productType === "stocked" && item.stock <= item.threshold).length}</strong></article>
      </section>

      <RecordToolbar onChange={setQuery} placeholder="Search products or SKU" value={query}>
        <button className="button button-primary" onClick={() => setShowProductForm(true)} type="button">
          <Plus size={16} /> Add product
        </button>
        <button className="button button-secondary" onClick={() => setShowForm(true)} type="button">
          <PackagePlus size={16} /> Stock movement
        </button>
      </RecordToolbar>
      {message && <p className="form-message form-message-success" style={{ marginBottom: 14 }}>{message}</p>}

      <section className="card">
        <div className="table-wrap desktop-only">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Code</th><th>Category</th><th>Cost</th><th>Selling price</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="table-name">{product.name}</td>
                  <td>{product.sku}</td>
                  <td>{product.category}</td>
                  <td>{formatMoney(product.cost)}</td>
                  <td>{formatMoney(product.price)}</td>
                  <td>{product.productType === "service" ? "Not tracked" : `${product.stock} ${product.unit}`}</td>
                  <td><span className={`badge ${product.status === "Low stock" && product.productType === "stocked" ? "badge-warning" : "badge-success"}`}>{product.productType === "service" ? "Service" : product.status}</span></td>
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
                <span className="list-meta">{product.productType === "service" ? "Stock not tracked" : `${product.stock} ${product.unit} available`}</span>
                <strong>{formatMoney(product.price)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      {showForm && (
        <div className="dialog-backdrop" role="presentation">
          <form className="dialog" onSubmit={addMovement}>
            <div className="dialog-header">
              <div><p className="eyebrow">Inventory</p><h2>Record stock movement</h2><p className="page-copy">Keep a clear record of why stock changed.</p></div>
              <button className="icon-button" aria-label="Close" onClick={() => setShowForm(false)} type="button"><X size={18} /></button>
            </div>
            <div className="form-grid">
              <div className="field"><label htmlFor="movement-product">Product</label><select className="select" id="movement-product" name="productId" required><option value="">Choose a product</option>{items.filter((p) => p.productType === "stocked").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="field"><label htmlFor="movement-type">Movement type</label><select className="select" id="movement-type" name="movementType" required><option value="stock_received">Stock received</option><option value="adjustment">Positive adjustment</option><option value="damaged">Damaged stock</option><option value="customer_return">Customer return</option></select></div>
              <div className="field"><label htmlFor="movement-quantity">Quantity</label><input className="input" id="movement-quantity" min="0.001" name="quantity" required step="0.001" type="number" /></div>
              <div className="field"><label htmlFor="movement-reference">Reference or note</label><input className="input" id="movement-reference" name="note" placeholder="e.g. Supplier delivery 184" /></div>
            </div>
            <div className="dialog-actions"><button className="button button-secondary" onClick={() => setShowForm(false)} type="button">Cancel</button><button className="button button-primary" type="submit"><Plus size={17} /> Save movement</button></div>
          </form>
        </div>
      )}
      {showProductForm && (
        <div className="dialog-backdrop">
          <form className="dialog" onSubmit={addProduct}>
            <div className="dialog-header">
              <div><p className="eyebrow">Inventory</p><h2>Add product</h2><p className="page-copy">Create the product and optionally record its opening stock.</p></div>
              <button className="icon-button" aria-label="Close" onClick={() => setShowProductForm(false)} type="button"><X size={18} /></button>
            </div>
            <div className="form-grid">
              <div className="field"><label htmlFor="product-name">Product name</label><input className="input" id="product-name" name="name" required /></div>
              <div className="field"><label htmlFor="product-type">What are you selling?</label><select className="select" id="product-type" name="productType"><option value="stocked">A product I keep in stock</option><option value="service">A service</option></select></div>
              <div className="field"><label htmlFor="product-sku">SKU or product code</label><input className="input" id="product-sku" name="sku" /></div>
              <div className="field"><label htmlFor="product-barcode">Barcode (optional)</label><input className="input" id="product-barcode" name="barcode" /></div>
              <div className="field"><label htmlFor="product-category">Category</label><input className="input" id="product-category" name="category" /></div>
              <div className="field"><label htmlFor="product-unit">How is it counted?</label><input className="input" defaultValue="item" id="product-unit" name="unit" placeholder="item, box, bag, kg or litre" required /></div>
              <div className="field"><label htmlFor="product-pack-size">Items in one pack</label><input className="input" defaultValue="1" id="product-pack-size" min="0.001" name="packSize" required step="0.001" type="number" /></div>
              <div className="field"><label htmlFor="product-cost">Cost price</label><input className="input" defaultValue="0" id="product-cost" min="0" name="cost" required step="0.01" type="number" /></div>
              <div className="field"><label htmlFor="product-price">Selling price</label><input className="input" id="product-price" min="0" name="price" required step="0.01" type="number" /></div>
              <div className="field"><label htmlFor="product-threshold">Low-stock threshold</label><input className="input" defaultValue="5" id="product-threshold" min="0" name="threshold" required step="0.001" type="number" /></div>
              <div className="field"><label htmlFor="product-opening-stock">Opening stock</label><input className="input" defaultValue="0" id="product-opening-stock" min="0" name="openingStock" step="0.001" type="number" /></div>
            </div>
            <div className="dialog-actions"><button className="button button-secondary" onClick={() => setShowProductForm(false)} type="button">Cancel</button><button className="button button-primary" type="submit"><Plus size={17} /> Save product</button></div>
          </form>
        </div>
      )}
    </>
  );
}
