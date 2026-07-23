"use client";

import {
  profitPerPiece,
  unitCostFromPack,
} from "@/lib/pricing";
import { products as initialProducts } from "@/lib/sample-data";
import { formatMoney } from "@/lib/format";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { FolderPlus, PackagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataLoadingState } from "./data-loading-state";
import { RecordToolbar } from "./record-toolbar";

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  productType: string;
  unit: string;
  packSize: number;
  cost: number;
  price: number;
  stock: number;
  threshold: number;
  status: string;
};

type ProductGroup = { id: string; name: string };

const demoGroups: ProductGroup[] = [
  { id: "g1", name: "Drinks" },
  { id: "g2", name: "Food" },
  { id: "g3", name: "Home items" },
];

export function InventoryView() {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>(() =>
    hasSupabaseConfig() ? [] : initialProducts,
  );
  const [groups, setGroups] = useState<ProductGroup[]>(() =>
    hasSupabaseConfig() ? [] : demoGroups,
  );
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [message, setMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const [piecesInPack, setPiecesInPack] = useState("1");
  const [paidForPack, setPaidForPack] = useState("");
  const [sellEachFor, setSellEachFor] = useState("");
  const [movementType, setMovementType] = useState("stock_received");
  const [receivedPieces, setReceivedPieces] = useState("");
  const [paidForReceived, setPaidForReceived] = useState("");

  const products = useMemo(
    () =>
      items.filter((product) =>
        `${product.name} ${product.sku} ${product.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const unitCost = unitCostFromPack(Number(piecesInPack), Number(paidForPack));
  const sellPrice = Number(sellEachFor);
  const pieceProfit =
    Number.isFinite(sellPrice) && sellPrice >= 0
      ? profitPerPiece(sellPrice, unitCost)
      : null;

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    let active = true;
    const supabase = createClient();

    Promise.all([
      supabase
        .from("product_stock")
        .select(
          "id, name, sku, barcode, category, product_type, unit, pack_size, cost_price, selling_price, reorder_level, quantity_on_hand",
        )
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("product_categories")
        .select("id, name")
        .order("name"),
    ]).then(([productResult, groupResult]) => {
      if (!active) return;
      if (productResult.data) {
        setItems(
          productResult.data.map((product) => {
            const stock = Number(product.quantity_on_hand);
            const threshold = Number(product.reorder_level);
            return {
              id: product.id,
              name: product.name,
              sku: product.sku ?? "—",
              barcode: product.barcode ?? "",
              category: product.category ?? "No group",
              productType: product.product_type,
              unit: product.unit,
              packSize: Number(product.pack_size),
              cost: Number(product.cost_price),
              price: Number(product.selling_price),
              stock,
              threshold,
              status: stock <= threshold ? "Running low" : "Enough in stock",
            };
          }),
        );
      }
      if (groupResult.data) setGroups(groupResult.data);
      if (groupResult.error) {
        setMessage(
          "Product groups need the latest database update. Run migration 0005 in Supabase.",
        );
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <DataLoadingState />;

  async function refreshGroups(businessId: string) {
    const { data } = await createClient()
      .from("product_categories")
      .select("id, name")
      .eq("business_id", businessId)
      .order("name");
    if (data) setGroups(data);
  }

  async function addGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = groupName.trim();
    if (name.length < 2) {
      setMessage("Give the group a short name, like Drinks or Food.");
      return;
    }

    if (!hasSupabaseConfig()) {
      if (groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
        setMessage("That group already exists.");
        return;
      }
      setGroups((current) => [
        ...current,
        { id: crypto.randomUUID(), name },
      ]);
      setGroupName("");
      setMessage(`Added “${name}”.`);
      return;
    }

    try {
      const businessId = await getCurrentBusinessId();
      const { error } = await createClient().from("product_categories").insert({
        business_id: businessId,
        name,
      });
      if (error) throw error;
      await refreshGroups(businessId);
      setGroupName("");
      setMessage(`Added “${name}”.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The group could not be saved.",
      );
    }
  }

  async function removeGroup(group: ProductGroup) {
    if (!hasSupabaseConfig()) {
      setGroups((current) => current.filter((item) => item.id !== group.id));
      setItems((current) =>
        current.map((item) =>
          item.category === group.name ? { ...item, category: "No group" } : item,
        ),
      );
      return;
    }

    try {
      const businessId = await getCurrentBusinessId();
      const supabase = createClient();
      await supabase
        .from("products")
        .update({ category: null })
        .eq("business_id", businessId)
        .eq("category", group.name);
      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", group.id);
      if (error) throw error;
      await refreshGroups(businessId);
      setItems((current) =>
        current.map((item) =>
          item.category === group.name ? { ...item, category: "No group" } : item,
        ),
      );
      setMessage(`Removed “${group.name}”.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The group could not be removed.",
      );
    }
  }

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const productType = String(form.get("productType") ?? "stocked");
    const code = String(form.get("code") ?? "").trim();
    const barcode = String(form.get("barcode") ?? "").trim();
    const packSize = Number(piecesInPack);
    const paid = Number(paidForPack);
    const price = Number(sellEachFor);
    const threshold = Number(form.get("threshold") ?? 0);
    const openingStock = Number(form.get("openingStock") ?? 0);
    const cost = unitCostFromPack(packSize, paid);

    if (!category) {
      setMessage("Choose a product group, or add one first.");
      return;
    }
    if (!Number.isFinite(packSize) || packSize <= 0) {
      setMessage("Enter how many pieces came in the pack you bought.");
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      setMessage("Enter how much you paid for the whole pack.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setMessage("Enter how much you will sell each piece for.");
      return;
    }

    if (!hasSupabaseConfig()) {
      setItems((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name,
          sku: code || "—",
          barcode,
          category,
          productType,
          unit: "piece",
          packSize,
          cost,
          price,
          threshold,
          stock: openingStock,
          status: openingStock <= threshold ? "Running low" : "Enough in stock",
        },
      ]);
      setShowProductForm(false);
      resetProductForm();
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
          sku: code || null,
          barcode: barcode || null,
          category,
          product_type: productType,
          unit: "piece",
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
            note: "Starting stock",
          });
        if (stockError) throw stockError;
      }
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The product could not be saved.",
      );
    }
  }

  function resetProductForm() {
    setPiecesInPack("1");
    setPaidForPack("");
    setSellEachFor("");
  }

  async function addMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const productId = String(form.get("productId") ?? "");
    const note = String(form.get("note") ?? "");
    const type = movementType;

    let quantity = 0;
    let nextUnitCost: number | null = null;

    if (type === "stock_received") {
      const pieces = Number(receivedPieces);
      const paid = Number(paidForReceived);
      if (!Number.isFinite(pieces) || pieces <= 0) {
        setMessage("Enter how many pieces you received.");
        return;
      }
      quantity = pieces;
      if (Number.isFinite(paid) && paid >= 0 && paidForReceived.trim() !== "") {
        nextUnitCost = unitCostFromPack(pieces, paid);
      }
    } else {
      const enteredQuantity = Number(form.get("quantity") ?? 0);
      if (!Number.isFinite(enteredQuantity) || enteredQuantity <= 0) {
        setMessage("Enter how many pieces changed.");
        return;
      }
      quantity =
        type === "damaged" ? -Math.abs(enteredQuantity) : Math.abs(enteredQuantity);
    }

    if (!hasSupabaseConfig()) {
      setItems((current) =>
        current.map((product) => {
          if (product.id !== productId) return product;
          const stock = product.stock + quantity;
          return {
            ...product,
            stock,
            cost: nextUnitCost ?? product.cost,
            status: stock <= product.threshold ? "Running low" : "Enough in stock",
          };
        }),
      );
      setShowForm(false);
      setReceivedPieces("");
      setPaidForReceived("");
      setMessage("Stock change saved in this demonstration session.");
      return;
    }

    try {
      const businessId = await getCurrentBusinessId();
      const supabase = createClient();
      const { error } = await supabase.from("inventory_movements").insert({
        business_id: businessId,
        product_id: productId,
        movement_type: type,
        quantity_change: quantity,
        note:
          note ||
          (type === "stock_received" && nextUnitCost !== null
            ? `Bought ${quantity} for ${formatMoney(Number(paidForReceived))}`
            : null),
      });
      if (error) throw error;
      if (nextUnitCost !== null) {
        const { error: costError } = await supabase
          .from("products")
          .update({ cost_price: nextUnitCost, pack_size: quantity })
          .eq("id", productId);
        if (costError) throw costError;
      }
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The stock change could not be saved.",
      );
    }
  }

  return (
    <>
      <section className="stat-strip">
        <article className="card stat-tile">
          <p>Products</p>
          <strong>{items.length}</strong>
        </article>
        <article className="card stat-tile">
          <p>Pieces in stock</p>
          <strong>
            {items
              .filter((item) => item.productType === "stocked")
              .reduce((sum, item) => sum + item.stock, 0)}
          </strong>
        </article>
        <article className="card stat-tile">
          <p>What stock cost you</p>
          <strong>
            {formatMoney(
              items.reduce((sum, item) => sum + item.cost * item.stock, 0),
            )}
          </strong>
        </article>
        <article className="card stat-tile">
          <p>Running low</p>
          <strong style={{ color: "#D97706" }}>
            {
              items.filter(
                (item) =>
                  item.productType === "stocked" && item.stock <= item.threshold,
              ).length
            }
          </strong>
        </article>
      </section>

      <RecordToolbar
        onChange={setQuery}
        placeholder="Search by name or group"
        value={query}
      >
        <button
          className="button button-secondary"
          onClick={() => setShowGroups(true)}
          type="button"
        >
          <FolderPlus size={16} /> Product groups
        </button>
        <button
          className="button button-primary"
          onClick={() => {
            resetProductForm();
            setShowProductForm(true);
          }}
          type="button"
        >
          <Plus size={16} /> Add product
        </button>
        <button
          className="button button-secondary"
          onClick={() => setShowForm(true)}
          type="button"
        >
          <PackagePlus size={16} /> Change stock
        </button>
      </RecordToolbar>
      {message && (
        <p className="form-message form-message-success" style={{ marginBottom: 14 }}>
          {message}
        </p>
      )}

      <section className="card">
        <div className="table-wrap desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Group</th>
                <th>You paid each</th>
                <th>You sell each</th>
                <th>Profit each</th>
                <th>In stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="table-name">{product.name}</td>
                  <td>{product.category}</td>
                  <td>{formatMoney(product.cost)}</td>
                  <td>{formatMoney(product.price)}</td>
                  <td className="metric-positive">
                    {formatMoney(profitPerPiece(product.price, product.cost))}
                  </td>
                  <td>
                    {product.productType === "service"
                      ? "Not tracked"
                      : `${product.stock} pcs`}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        product.status === "Running low" &&
                        product.productType === "stocked"
                          ? "badge-warning"
                          : "badge-success"
                      }`}
                    >
                      {product.productType === "service"
                        ? "Service"
                        : product.status}
                    </span>
                  </td>
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
                  <p className="list-meta">{product.category}</p>
                </div>
                <span
                  className={`badge ${
                    product.status === "Running low"
                      ? "badge-warning"
                      : "badge-success"
                  }`}
                >
                  {product.status}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 15,
                  gap: 12,
                }}
              >
                <span className="list-meta">
                  {product.productType === "service"
                    ? "Stock not tracked"
                    : `${product.stock} in stock`}
                </span>
                <strong>
                  Sell {formatMoney(product.price)} · keep{" "}
                  {formatMoney(profitPerPiece(product.price, product.cost))}
                </strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      {showGroups && (
        <div className="dialog-backdrop">
          <div className="dialog">
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Stock</p>
                <h2>Product groups</h2>
                <p className="page-copy">
                  Simple shelves for your products, like Drinks, Food or Home items.
                </p>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={() => setShowGroups(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <form className="form-grid" onSubmit={addGroup}>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="group-name">New group name</label>
                <div className="inline-add">
                  <input
                    className="input"
                    id="group-name"
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder="e.g. Drinks"
                    value={groupName}
                  />
                  <button className="button button-primary" type="submit">
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>
            </form>
            <div className="group-list">
              {groups.map((group) => (
                <div className="group-row" key={group.id}>
                  <strong>{group.name}</strong>
                  <button
                    aria-label={`Remove ${group.name}`}
                    className="icon-button"
                    onClick={() => void removeGroup(group)}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {!groups.length && (
                <p className="page-copy">
                  No groups yet. Add Drinks, Food, Home items, or whatever fits your shop.
                </p>
              )}
            </div>
            <div className="dialog-actions">
              <button
                className="button button-secondary"
                onClick={() => setShowGroups(false)}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="dialog-backdrop" role="presentation">
          <form className="dialog" onSubmit={addMovement}>
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Stock</p>
                <h2>Change stock</h2>
                <p className="page-copy">
                  Record when you buy more, fix a count, or lose stock.
                </p>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={() => setShowForm(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="movement-product">Which product?</label>
                <select
                  className="select"
                  id="movement-product"
                  name="productId"
                  required
                >
                  <option value="">Choose a product</option>
                  {items
                    .filter((product) => product.productType === "stocked")
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="movement-type">What happened?</label>
                <select
                  className="select"
                  id="movement-type"
                  name="movementType"
                  onChange={(event) => setMovementType(event.target.value)}
                  value={movementType}
                >
                  <option value="stock_received">I bought more stock</option>
                  <option value="adjustment">I counted extra pieces</option>
                  <option value="damaged">Damaged, expired or wasted</option>
                  <option value="customer_return">A customer returned it</option>
                </select>
              </div>
              {movementType === "stock_received" ? (
                <>
                  <div className="field">
                    <label htmlFor="received-pieces">How many pieces did you get?</label>
                    <input
                      className="input"
                      id="received-pieces"
                      min="0.001"
                      onChange={(event) => setReceivedPieces(event.target.value)}
                      required
                      step="0.001"
                      type="number"
                      value={receivedPieces}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="received-paid">
                      How much did you pay for them? (optional)
                    </label>
                    <input
                      className="input"
                      id="received-paid"
                      min="0"
                      onChange={(event) => setPaidForReceived(event.target.value)}
                      placeholder="e.g. 20"
                      step="0.01"
                      type="number"
                      value={paidForReceived}
                    />
                    <p className="field-hint">
                      If you fill this in, we update what each piece cost you.
                    </p>
                  </div>
                </>
              ) : (
                <div className="field">
                  <label htmlFor="movement-quantity">How many pieces?</label>
                  <input
                    className="input"
                    id="movement-quantity"
                    min="0.001"
                    name="quantity"
                    required
                    step="0.001"
                    type="number"
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="movement-reference">Note (optional)</label>
                <input
                  className="input"
                  id="movement-reference"
                  name="note"
                  placeholder="e.g. From OK Mart"
                />
              </div>
            </div>
            <div className="dialog-actions">
              <button
                className="button button-secondary"
                onClick={() => setShowForm(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit">
                <Plus size={17} /> Save change
              </button>
            </div>
          </form>
        </div>
      )}

      {showProductForm && (
        <div className="dialog-backdrop">
          <form className="dialog dialog-wide" onSubmit={addProduct}>
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Stock</p>
                <h2>Add a product</h2>
                <p className="page-copy">
                  Tell us how you buy the pack and how you sell each piece. We work out the rest.
                </p>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={() => setShowProductForm(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="product-name">Product name</label>
                <input
                  className="input"
                  id="product-name"
                  name="name"
                  placeholder="e.g. Pepsi 500ml"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="product-type">What are you selling?</label>
                <select className="select" id="product-type" name="productType">
                  <option value="stocked">Something I keep in stock</option>
                  <option value="service">A service</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="product-category">Product group</label>
                <select
                  className="select"
                  id="product-category"
                  name="category"
                  required
                >
                  <option value="">Choose a group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  No group yet?{" "}
                  <button
                    className="text-button"
                    onClick={() => {
                      setShowProductForm(false);
                      setShowGroups(true);
                    }}
                    type="button"
                  >
                    Add product groups
                  </button>
                </p>
              </div>
              <div className="field">
                <label htmlFor="product-code">Your own code (optional)</label>
                <input className="input" id="product-code" name="code" />
              </div>
              <div className="field">
                <label htmlFor="product-barcode">Barcode (optional)</label>
                <input className="input" id="product-barcode" name="barcode" />
              </div>
            </div>

            <section className="pricing-panel">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="product-pack-size">
                    How many pieces in the pack you buy?
                  </label>
                  <input
                    className="input"
                    id="product-pack-size"
                    min="0.001"
                    onChange={(event) => setPiecesInPack(event.target.value)}
                    required
                    step="0.001"
                    type="number"
                    value={piecesInPack}
                  />
                </div>
                <div className="field">
                  <label htmlFor="product-pack-paid">
                    How much do you pay for the whole pack?
                  </label>
                  <input
                    className="input"
                    id="product-pack-paid"
                    min="0"
                    onChange={(event) => setPaidForPack(event.target.value)}
                    placeholder="e.g. 20"
                    required
                    step="0.01"
                    type="number"
                    value={paidForPack}
                  />
                </div>
              </div>
              <p className="pricing-result">
                Each piece costs you about{" "}
                <strong>{formatMoney(unitCost)}</strong>
              </p>
            </section>

            <section className="pricing-panel">
              <h3>How you sell it</h3>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="product-price">
                    How much will you sell each piece for?
                  </label>
                  <input
                    className="input"
                    id="product-price"
                    min="0"
                    onChange={(event) => setSellEachFor(event.target.value)}
                    placeholder="e.g. 0.80"
                    required
                    step="0.01"
                    type="number"
                    value={sellEachFor}
                  />
                </div>
                <div className="field">
                  <label htmlFor="product-threshold">
                    Warn me when stock falls to
                  </label>
                  <input
                    className="input"
                    defaultValue="5"
                    id="product-threshold"
                    min="0"
                    name="threshold"
                    required
                    step="0.001"
                    type="number"
                  />
                </div>
                <div className="field">
                  <label htmlFor="product-opening-stock">
                    How many pieces do you have now?
                  </label>
                  <input
                    className="input"
                    defaultValue="0"
                    id="product-opening-stock"
                    min="0"
                    name="openingStock"
                    step="0.001"
                    type="number"
                  />
                </div>
              </div>
              {pieceProfit !== null && Number.isFinite(pieceProfit) && (
                <p className="pricing-result">
                  Profit on each piece:{" "}
                  <strong className={pieceProfit >= 0 ? "metric-positive" : ""}>
                    {formatMoney(pieceProfit)}
                  </strong>
                </p>
              )}
            </section>

            <div className="dialog-actions">
              <button
                className="button button-secondary"
                onClick={() => setShowProductForm(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit">
                <Plus size={17} /> Save product
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
