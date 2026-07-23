"use client";

import { formatMoney } from "@/lib/format";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { Check, LoaderCircle, Minus, Plus, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataLoadingState } from "./data-loading-state";

type ServiceOption = {
  id: string;
  label: string;
  price: number;
  unit: string;
};

type CustomerOption = {
  id: string;
  name: string;
  company?: string;
};

type Line = { productId: string; quantity: number };

export function ServiceInvoiceForm() {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
  });
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: 1 }]);
  const [currencies, setCurrencies] = useState<string[]>(["USD"]);
  const [currency, setCurrency] = useState("USD");
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const service = services.find((item) => item.id === line.productId);
        return sum + (service?.price ?? 0) * line.quantity;
      }, 0),
    [lines, services],
  );

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setServices([
        { id: "s1", label: "Website design · Starter", price: 150, unit: "job" },
        { id: "s2", label: "Bookkeeping support", price: 80, unit: "month" },
      ]);
      setCustomers([{ id: "c1", name: "Demo Client", company: "Demo Co" }]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    Promise.all([
      supabase
        .from("products")
        .select("id, name, selling_price, unit, parent_product_id, product_type")
        .eq("product_type", "service")
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("customers")
        .select("id, name, company_name")
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
    ]).then(([serviceResult, customerResult, business]) => {
      if (serviceResult.data) {
        const rows = serviceResult.data;
        const parents = new Map(
          rows
            .filter((row) => !row.parent_product_id)
            .map((row) => [row.id, row.name]),
        );
        const tierParents = new Set(
          rows
            .filter((row) => row.parent_product_id)
            .map((row) => row.parent_product_id as string),
        );
        setServices(
          rows
            .filter(
              (row) =>
                Boolean(row.parent_product_id) || !tierParents.has(row.id),
            )
            .map((row) => {
              const parent = row.parent_product_id
                ? parents.get(row.parent_product_id)
                : null;
              return {
                id: row.id,
                label: parent ? `${parent} · ${row.name}` : row.name,
                price: Number(row.selling_price),
                unit: row.unit,
              };
            }),
        );
      }
      if (customerResult.data) {
        setCustomers(
          customerResult.data.map((customer) => ({
            id: customer.id,
            name: customer.name,
            company: customer.company_name ?? undefined,
          })),
        );
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
  }, []);

  function updateLine(index: number, next: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...next } : line)),
    );
  }

  async function resolveCustomerId(businessId: string) {
    if (customerMode === "existing") {
      if (!customerId) throw new Error("Choose a customer, or add a new one.");
      return customerId;
    }

    const name = newCustomer.name.trim();
    if (name.length < 2) {
      throw new Error("Enter the new customer’s name.");
    }

    const { data, error } = await createClient()
      .from("customers")
      .insert({
        business_id: businessId,
        name,
        company_name: newCustomer.company.trim() || null,
        phone: newCustomer.phone.trim() || null,
        email: newCustomer.email.trim() || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async function createInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (lines.length === 0 || lines.some((line) => !line.productId)) {
      setMessage("Add at least one service to the invoice.");
      return;
    }

    if (!hasSupabaseConfig()) {
      setMessage("Invoice created in this demonstration session.");
      return;
    }

    setSaving(true);
    try {
      const businessId = await getCurrentBusinessId();
      const supabase = createClient();
      const resolvedCustomerId = await resolveCustomerId(businessId);

      const issueDate = new Date().toISOString().slice(0, 10);
      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          business_id: businessId,
          customer_id: resolvedCustomerId,
          status: "unpaid",
          currency,
          issue_date: issueDate,
          due_date: dueDate || issueDate,
          notes: notes.trim() || null,
          subtotal: total,
          total,
        })
        .select("id, invoice_number")
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("invoice_items").insert(
        lines.map((line) => {
          const service = services.find((item) => item.id === line.productId);
          return {
            invoice_id: invoice.id,
            product_id: line.productId,
            description: service?.label ?? "Service",
            quantity: line.quantity,
            unit_price: service?.price ?? 0,
          };
        }),
      );
      if (itemsError) throw itemsError;

      window.location.assign(`/invoices/${invoice.id}`);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "The invoice could not be saved.";
      setMessage(
        /invoices|schema cache/i.test(detail)
          ? `${detail} Run supabase/migrations/0010_service_invoices.sql in Supabase.`
          : detail,
      );
      setSaving(false);
    }
  }

  if (loading) return <DataLoadingState rows={3} />;

  return (
    <form className="grid-main" onSubmit={createInvoice}>
      <div style={{ display: "grid", gap: 16 }}>
        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>Customer</h2>
              <p>Pick someone you already know, or add them here.</p>
            </div>
          </div>
          <div className="need-grid" style={{ marginBottom: 14, maxWidth: 420 }}>
            <button
              aria-pressed={customerMode === "existing"}
              className="need-option"
              data-active={customerMode === "existing"}
              onClick={() => setCustomerMode("existing")}
              type="button"
            >
              Existing customer
            </button>
            <button
              aria-pressed={customerMode === "new"}
              className="need-option"
              data-active={customerMode === "new"}
              onClick={() => setCustomerMode("new")}
              type="button"
            >
              <UserPlus size={15} /> New customer
            </button>
          </div>

          {customerMode === "existing" ? (
            <div className="field">
              <label htmlFor="invoice-customer">Customer</label>
              <select
                className="select"
                id="invoice-customer"
                onChange={(event) => setCustomerId(event.target.value)}
                value={customerId}
              >
                <option value="">Choose customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company
                      ? `${customer.name} · ${customer.company}`
                      : customer.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-grid">
              <div className="field">
                <label htmlFor="new-customer-name">Contact name</label>
                <input
                  className="input"
                  id="new-customer-name"
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                  value={newCustomer.name}
                />
              </div>
              <div className="field">
                <label htmlFor="new-customer-company">Company (optional)</label>
                <input
                  className="input"
                  id="new-customer-company"
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      company: event.target.value,
                    }))
                  }
                  value={newCustomer.company}
                />
              </div>
              <div className="field">
                <label htmlFor="new-customer-phone">Phone (optional)</label>
                <input
                  className="input"
                  id="new-customer-phone"
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  type="tel"
                  value={newCustomer.phone}
                />
              </div>
              <div className="field">
                <label htmlFor="new-customer-email">Email (optional)</label>
                <input
                  className="input"
                  id="new-customer-email"
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  type="email"
                  value={newCustomer.email}
                />
              </div>
            </div>
          )}
        </section>

        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>Invoice details</h2>
              <p>Created as Unpaid. Mark paid later to record the sale.</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="invoice-currency">Currency</label>
              <select
                className="select"
                id="invoice-currency"
                onChange={(event) => setCurrency(event.target.value)}
                value={currency}
              >
                {currencies.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="invoice-due">Due date</label>
              <input
                className="input"
                id="invoice-due"
                onChange={(event) => setDueDate(event.target.value)}
                required
                type="date"
                value={dueDate}
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="invoice-notes">Note (optional)</label>
              <input
                className="input"
                id="invoice-notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Job details, site, terms…"
                value={notes}
              />
            </div>
          </div>
        </section>

        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>Services</h2>
              <p>What this invoice covers.</p>
            </div>
            <button
              className="button button-secondary"
              onClick={() =>
                setLines((current) => [...current, { productId: "", quantity: 1 }])
              }
              type="button"
            >
              <Plus size={16} /> Add line
            </button>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {lines.map((line, index) => {
              const service = services.find((item) => item.id === line.productId);
              return (
                <div className="card record-card" key={`${index}-${line.productId}`}>
                  <div className="form-grid" style={{ alignItems: "end" }}>
                    <div className="field">
                      <label htmlFor={`service-${index}`}>Service</label>
                      <select
                        className="select"
                        id={`service-${index}`}
                        onChange={(event) =>
                          updateLine(index, { productId: event.target.value })
                        }
                        value={line.productId}
                      >
                        <option value="">Choose service</option>
                        {services.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label} · {formatMoney(item.price, currency)} /{" "}
                            {item.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ alignItems: "end", display: "flex", gap: 10 }}>
                      <div className="field" style={{ flex: 1 }}>
                        <label htmlFor={`qty-${index}`}>Qty</label>
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
                            id={`qty-${index}`}
                            min="1"
                            onChange={(event) =>
                              updateLine(index, {
                                quantity: Math.max(1, Number(event.target.value)),
                              })
                            }
                            style={{ textAlign: "center" }}
                            type="number"
                            value={line.quantity}
                          />
                          <button
                            className="icon-button"
                            onClick={() =>
                              updateLine(index, { quantity: line.quantity + 1 })
                            }
                            type="button"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      <button
                        aria-label="Remove line"
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
                  {service && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 12,
                      }}
                    >
                      <span className="list-meta">
                        {formatMoney(service.price, currency)} / {service.unit}
                      </span>
                      <strong>
                        {formatMoney(service.price * line.quantity, currency)}
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
        <section className="card card-pad" style={{ position: "sticky", top: 96 }}>
          <div className="section-heading">
            <div>
              <h2>Invoice total</h2>
              <p>Saved as Unpaid until you mark it paid.</p>
            </div>
          </div>
          <div className="list">
            <div className="list-row">
              <span className="list-title">Currency</span>
              <span className="list-value">{currency}</span>
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
          {message && (
            <p
              className={`form-message ${
                message.includes("demonstration") || message.includes("created")
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
            style={{ marginTop: 16, width: "100%" }}
            type="submit"
          >
            {saving ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Check size={18} />
            )}
            {saving ? "Creating…" : "Create unpaid invoice"}
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
