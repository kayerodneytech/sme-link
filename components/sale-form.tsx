"use client";

import { formatMoney } from "@/lib/format";
import { productLabel } from "@/lib/product-label";
import {
  customers as sampleCustomers,
  products as sampleProducts,
} from "@/lib/sample-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { Check, LoaderCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataLoadingState } from "./data-loading-state";

type Line = { productId: string; quantity: number };
type ProductOption = {
  id: string;
  name: string;
  label: string;
  price: number;
  stock: number;
  unit: string;
};
type CustomerOption = { id: string; name: string; company?: string };

export function SaleForm({
  serviceMode = false,
}: {
  serviceMode?: boolean;
}) {
  const [lines, setLines] = useState<Line[]>(() =>
    hasSupabaseConfig()
      ? [{ productId: "", quantity: 1 }]
      : [{ productId: serviceMode ? "" : "p4", quantity: 1 }],
  );
  const [productOptions, setProductOptions] = useState<ProductOption[]>(() =>
    hasSupabaseConfig()
      ? []
      : sampleProducts.map((product) => ({
          id: product.id,
          name: product.name,
          label: productLabel(product.name, product.sizeValue, product.sizeUnit),
          price: product.price,
          stock: product.stock,
          unit: product.unit,
        })),
  );
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>(() =>
    hasSupabaseConfig() ? [] : sampleCustomers,
  );
  const [currencies, setCurrencies] = useState<string[]>(["USD"]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(hasSupabaseConfig());
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
      serviceMode
        ? supabase
            .from("products")
            .select(
              "id, name, description, selling_price, unit, parent_product_id, product_type",
            )
            .eq("product_type", "service")
            .eq("is_archived", false)
            .order("name")
        : supabase
            .from("product_stock")
            .select(
              "id, name, selling_price, quantity_on_hand, size_value, size_unit, unit, product_type",
            )
            .eq("is_archived", false)
            .order("name"),
      supabase
        .from("customers")
        .select("id, name")
        .eq("is_archived", false)
        .order("name"),
      getCurrentBusinessId().then(async (businessId) => {
        const { data } = await supabase
          .from("businesses")
          .select("currency, currencies")
          .eq("id", businessId)
          .maybeSingle();
        return data;
      }),
    ]).then(([productResult, customerResult, business]) => {
      if (productResult.data) {
        if (serviceMode) {
          const rows = productResult.data as {
            id: string;
            name: string;
            description: string | null;
            selling_price: number;
            unit: string;
            parent_product_id: string | null;
          }[];
          const parents = new Map(
            rows
              .filter((row) => !row.parent_product_id)
              .map((row) => [row.id, row.name]),
          );
          // Sellable lines: tiers, or parent services that have no tiers.
          const tierParentIds = new Set(
            rows
              .filter((row) => row.parent_product_id)
              .map((row) => row.parent_product_id as string),
          );
          setProductOptions(
            rows
              .filter(
                (row) =>
                  Boolean(row.parent_product_id) ||
                  !tierParentIds.has(row.id),
              )
              .map((row) => {
                const parentName = row.parent_product_id
                  ? parents.get(row.parent_product_id)
                  : null;
                return {
                  id: row.id,
                  name: row.name,
                  label: parentName
                    ? `${parentName} · ${row.name}`
                    : row.name,
                  price: Number(row.selling_price),
                  stock: 999999,
                  unit: row.unit,
                };
              }),
          );
        } else {
          setProductOptions(
            (productResult.data as {
              id: string;
              name: string;
              selling_price: number;
              quantity_on_hand: number;
              size_value: number | null;
              size_unit: string | null;
              unit: string;
            }[]).map((product) => ({
              id: product.id,
              name: product.name,
              label: productLabel(
                product.name,
                product.size_value == null ? null : Number(product.size_value),
                product.size_unit,
              ),
              price: Number(product.selling_price),
              stock: Number(product.quantity_on_hand),
              unit: product.unit,
            })),
          );
        }
        setLines([{ productId: "", quantity: 1 }]);
      }
      if (customerResult.data) {
        setCustomerOptions(
          customerResult.data.map((customer) => ({
            id: customer.id,
            name: customer.name,
          })),
        );
        // Enrich with company when the column exists (migration 0009).
        void supabase
          .from("customers")
          .select("id, company_name")
          .eq("is_archived", false)
          .then(({ data }) => {
            if (!data) return;
            setCustomerOptions((current) =>
              current.map((customer) => ({
                ...customer,
                company:
                  data.find((row) => row.id === customer.id)?.company_name ??
                  undefined,
              })),
            );
          });
      }
      if (business) {
        const list =
          business.currencies?.length > 0
            ? business.currencies
            : [business.currency ?? "USD"];
        setCurrencies(list);
        setCurrency(business.currency ?? list[0] ?? "USD");
      }
      setLoading(false);
    });
  }, [serviceMode]);

  function updateLine(index: number, next: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...next } : line)),
    );
  }

  if (loading) return <DataLoadingState rows={3} />;

  async function completeSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (lines.length === 0 || lines.some((line) => !line.productId)) {
      setMessage(
        serviceMode
          ? "Choose at least one service before completing the sale."
          : "Choose at least one product before completing the sale.",
      );
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
          currency: String(form.get("currency") ?? currency),
          notes: String(form.get("notes") ?? "").trim() || null,
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
      const { error: itemError } = await supabase
        .from("sale_items")
        .insert(saleItems);
      if (itemError) throw itemError;

      const { error: completionError } = await supabase.rpc("complete_sale", {
        target_sale_id: sale.id,
      });
      if (completionError) throw completionError;
      window.location.assign("/sales");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The sale could not be completed.",
      );
      setSaving(false);
    }
  }

  return (
    <form className="grid-main" onSubmit={completeSale}>
      <div style={{ display: "grid", gap: 16 }}>
        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>Customer and payment</h2>
              <p>
                {serviceMode
                  ? "Link the job to a customer when you can — helpful for repeat work."
                  : "Choose a saved customer or record a walk-in sale"}
              </p>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="customer">Customer</label>
              <select className="select" id="customer" name="customerId">
                <option value="">
                  {serviceMode ? "No customer linked" : "Walk-in customer"}
                </option>
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company
                      ? `${customer.name} · ${customer.company}`
                      : customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sale-currency">Currency</label>
              <select
                className="select"
                id="sale-currency"
                name="currency"
                onChange={(event) => setCurrency(event.target.value)}
                value={currency}
              >
                {currencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="payment-method">Payment method</label>
              <select
                className="select"
                id="payment-method"
                name="paymentMethod"
              >
                <option value="cash">Cash</option>
                <option value="ecocash">EcoCash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
              </select>
            </div>
            {serviceMode && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="sale-notes">Job note (optional)</label>
                <input
                  className="input"
                  id="sale-notes"
                  name="notes"
                  placeholder="What was done, site, deadline…"
                />
              </div>
            )}
          </div>
        </section>

        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>{serviceMode ? "Services sold" : "Sale items"}</h2>
              <p>
                {serviceMode
                  ? "Add the service or price tier the customer paid for."
                  : "Add the products included in this transaction"}
              </p>
            </div>
            <button
              className="button button-secondary"
              onClick={() =>
                setLines((current) => [...current, { productId: "", quantity: 1 }])
              }
              type="button"
            >
              <Plus size={16} /> {serviceMode ? "Add service" : "Add item"}
            </button>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {lines.map((line, index) => {
              const product = productOptions.find(
                (item) => item.id === line.productId,
              );
              return (
                <div
                  className="card record-card"
                  key={`${index}-${line.productId}`}
                >
                  <div className="form-grid" style={{ alignItems: "end" }}>
                    <div className="field">
                      <label htmlFor={`product-${index}`}>
                        {serviceMode ? "Service" : "Product"}
                      </label>
                      <select
                        className="select"
                        id={`product-${index}`}
                        onChange={(event) =>
                          updateLine(index, { productId: event.target.value })
                        }
                        value={line.productId}
                      >
                        <option value="">
                          {serviceMode ? "Choose service" : "Choose product"}
                        </option>
                        {productOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {serviceMode
                              ? `${item.label} · ${formatMoney(item.price, currency)} / ${item.unit}`
                              : `${item.label} · ${item.stock} available`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ alignItems: "end", display: "flex", gap: 10 }}>
                      <div className="field" style={{ flex: 1 }}>
                        <label htmlFor={`quantity-${index}`}>
                          {serviceMode
                            ? product?.unit === "hour"
                              ? "Hours"
                              : product?.unit === "session"
                                ? "Sessions"
                                : "Quantity"
                            : "Quantity"}
                        </label>
                        <div
                          style={{ alignItems: "center", display: "flex", gap: 6 }}
                        >
                          <button
                            className="icon-button"
                            onClick={() =>
                              updateLine(index, {
                                quantity: Math.max(1, line.quantity - 1),
                              })
                            }
                            type="button"
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            className="input"
                            id={`quantity-${index}`}
                            min="1"
                            onChange={(event) =>
                              updateLine(index, {
                                quantity: Math.max(
                                  1,
                                  Number(event.target.value),
                                ),
                              })
                            }
                            style={{ textAlign: "center" }}
                            type="number"
                            value={line.quantity}
                          />
                          <button
                            className="icon-button"
                            onClick={() =>
                              updateLine(index, {
                                quantity: line.quantity + 1,
                              })
                            }
                            type="button"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      <button
                        aria-label="Remove item"
                        className="icon-button"
                        onClick={() =>
                          setLines((current) =>
                            current.filter((_, i) => i !== index),
                          )
                        }
                        style={{ color: "#B42318" }}
                        type="button"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                  {product && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 12,
                      }}
                    >
                      <span className="list-meta">
                        {formatMoney(product.price, currency)}
                        {serviceMode ? ` / ${product.unit}` : " each"}
                      </span>
                      <strong>
                        {formatMoney(product.price * line.quantity, currency)}
                      </strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <aside>
        <section
          className="card card-pad"
          style={{ position: "sticky", top: 96 }}
        >
          <div className="section-heading">
            <div>
              <h2>Sale summary</h2>
              <p>Check the transaction before saving</p>
            </div>
          </div>
          <div className="list">
            <div className="list-row">
              <span className="list-title">
                {serviceMode ? "Lines" : "Items"}
              </span>
              <span className="list-value">
                {lines.reduce((sum, line) => sum + line.quantity, 0)}
              </span>
            </div>
            <div className="list-row">
              <span className="list-title">Currency</span>
              <span className="list-value">{currency}</span>
            </div>
            <div className="list-row">
              <span className="list-title">Subtotal</span>
              <span className="list-value">
                {formatMoney(total, currency)}
              </span>
            </div>
            <div className="list-row">
              <span className="list-title">Total</span>
              <span
                className="summary-value"
                style={{ fontSize: "1.65rem", margin: "0 0 0 auto" }}
              >
                {formatMoney(total, currency)}
              </span>
            </div>
          </div>
          <div className="notice" style={{ margin: "16px 0" }}>
            <Check size={18} />
            {serviceMode
              ? "This adds to sales and cash for the chosen currency. No stock is involved."
              : "Stock will be deducted only after the sale is completed."}
          </div>
          {message && (
            <p
              className={`form-message ${
                message.includes("completed")
                  ? "form-message-success"
                  : "form-message-error"
              }`}
            >
              {message}
            </p>
          )}
          <button
            className="button button-primary"
            disabled={saving}
            style={{ width: "100%" }}
            type="submit"
          >
            {saving ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Check size={18} />
            )}{" "}
            {saving ? "Completing…" : "Complete sale"}
          </button>
          <Link
            className="button button-secondary"
            href="/sales"
            style={{ marginTop: 9, width: "100%" }}
          >
            Cancel
          </Link>
        </section>
      </aside>
    </form>
  );
}
