"use client";

import { formatMoney } from "@/lib/format";
import { customers } from "@/lib/sample-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { Building2, Mail, Phone, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RecordToolbar } from "./record-toolbar";
import { DataLoadingState } from "./data-loading-state";
import { ExcelExportButton } from "./excel-export-button";

type CustomerRow = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  orders: number;
  spent: number;
};

export function CustomersView() {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<CustomerRow[]>(() =>
    hasSupabaseConfig()
      ? []
      : customers.map((customer) => ({
          ...customer,
          company: "",
          city: "",
        })),
  );
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    createClient()
      .from("customers")
      .select(
        "id, name, company_name, phone, email, city, sales(count), orders(count)",
      )
      .eq("is_archived", false)
      .order("name")
      .then(({ data, error }) => {
        if (error && /company_name|schema cache/i.test(error.message)) {
          // Fallback before migration 0009 is applied.
          void createClient()
            .from("customers")
            .select("id, name, phone, email, sales(count), orders(count)")
            .eq("is_archived", false)
            .order("name")
            .then(({ data: legacy }) => {
              if (legacy) {
                setItems(
                  legacy.map((customer) => ({
                    id: customer.id,
                    name: customer.name,
                    company: "",
                    phone: customer.phone ?? "—",
                    email: customer.email ?? "—",
                    city: "",
                    orders:
                      Number(
                        Array.isArray(customer.sales)
                          ? customer.sales[0]?.count ?? 0
                          : 0,
                      ) +
                      Number(
                        Array.isArray(customer.orders)
                          ? customer.orders[0]?.count ?? 0
                          : 0,
                      ),
                    spent: 0,
                  })),
                );
              }
              setMessage(
                "Run supabase/migrations/0009_services_and_customers.sql to save company and extra customer details.",
              );
              setLoading(false);
            });
          return;
        }
        if (data) {
          setItems(
            data.map((customer) => ({
              id: customer.id,
              name: customer.name,
              company: customer.company_name ?? "",
              phone: customer.phone ?? "—",
              email: customer.email ?? "—",
              city: customer.city ?? "",
              orders:
                Number(
                  Array.isArray(customer.sales)
                    ? customer.sales[0]?.count ?? 0
                    : 0,
                ) +
                Number(
                  Array.isArray(customer.orders)
                    ? customer.orders[0]?.count ?? 0
                    : 0,
                ),
              spent: 0,
            })),
          );
        }
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((customer) =>
        `${customer.name} ${customer.company} ${customer.phone} ${customer.email} ${customer.city}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );

  if (loading) return <DataLoadingState />;

  async function addCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextCustomer = {
      name: String(form.get("name") ?? "").trim(),
      company_name: String(form.get("company") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      whatsapp: String(form.get("whatsapp") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      address: String(form.get("address") ?? "").trim(),
      city: String(form.get("city") ?? "").trim(),
      tax_number: String(form.get("taxNumber") ?? "").trim(),
      notes: String(form.get("notes") ?? "").trim(),
    };
    if (!hasSupabaseConfig()) {
      setItems((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: nextCustomer.name,
          company: nextCustomer.company_name,
          phone: nextCustomer.phone || "—",
          email: nextCustomer.email || "—",
          city: nextCustomer.city,
          orders: 0,
          spent: 0,
        },
      ]);
      setShowForm(false);
      setMessage("Customer added to this demonstration session.");
      return;
    }
    try {
      const businessId = await getCurrentBusinessId();
      const payload: Record<string, unknown> = {
        business_id: businessId,
        name: nextCustomer.name,
        phone: nextCustomer.phone || null,
        email: nextCustomer.email || null,
        notes: nextCustomer.notes || null,
        company_name: nextCustomer.company_name || null,
        whatsapp: nextCustomer.whatsapp || null,
        address: nextCustomer.address || null,
        city: nextCustomer.city || null,
        tax_number: nextCustomer.tax_number || null,
      };
      const { error } = await createClient().from("customers").insert(payload);
      if (error) {
        if (/company_name|whatsapp|tax_number|schema cache/i.test(error.message)) {
          const { error: legacyError } = await createClient()
            .from("customers")
            .insert({
              business_id: businessId,
              name: nextCustomer.name,
              phone: nextCustomer.phone || null,
              email: nextCustomer.email || null,
              notes: nextCustomer.notes || null,
            });
          if (legacyError) throw legacyError;
          setMessage(
            "Customer saved with basic details. Run migration 0009 to store company and address fields.",
          );
          window.setTimeout(() => window.location.reload(), 900);
          return;
        }
        throw error;
      }
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The customer could not be saved.",
      );
    }
  }

  return (
    <>
      <RecordToolbar
        onChange={setQuery}
        placeholder="Search name, company, phone or email"
        value={query}
      >
        <ExcelExportButton
          documentLabel="customers"
          headers={[
            "Contact name",
            "Company",
            "Phone",
            "Email",
            "City",
            "Jobs",
            "Lifetime spent",
          ]}
          rows={filtered.map((customer) => [
            customer.name,
            customer.company,
            customer.phone,
            customer.email,
            customer.city,
            customer.orders,
            customer.spent,
          ])}
          sheetName="Customers"
        />
      </RecordToolbar>
      {message && (
        <p
          className={`form-message ${
            message.includes("added") || message.includes("saved")
              ? "form-message-success"
              : "form-message-error"
          }`}
          style={{ marginBottom: 14 }}
        >
          {message}
        </p>
      )}
      <div className="mobile-records">
        {filtered.map((customer) => (
          <article className="card record-card" key={customer.id}>
            <div className="record-card-head">
              <div>
                <p className="list-title">{customer.name}</p>
                <p className="list-meta">
                  {customer.company || customer.id}
                  {customer.city ? ` · ${customer.city}` : ""}
                </p>
              </div>
              <span className="badge">{customer.orders} jobs</span>
            </div>
            <div className="list" style={{ marginTop: 10 }}>
              {customer.company && (
                <div className="list-row">
                  <Building2 color="#667085" size={16} />
                  <span className="list-meta">{customer.company}</span>
                </div>
              )}
              <div className="list-row">
                <Phone color="#667085" size={16} />
                <span className="list-meta">{customer.phone}</span>
              </div>
              <div className="list-row">
                <Mail color="#667085" size={16} />
                <span className="list-meta">{customer.email}</span>
              </div>
            </div>
            <strong style={{ display: "block", marginTop: 12 }}>
              {formatMoney(customer.spent)} lifetime value
            </strong>
          </article>
        ))}
      </div>
      <section className="card desktop-only">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Company</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Jobs</th>
                <th>Total spent</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <span className="table-name">{customer.name}</span>
                    {customer.city && (
                      <>
                        <br />
                        <span className="list-meta">{customer.city}</span>
                      </>
                    )}
                  </td>
                  <td>{customer.company || "—"}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.email}</td>
                  <td>{customer.orders}</td>
                  <td className="table-name">{formatMoney(customer.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <button
        className="button button-primary"
        onClick={() => setShowForm(true)}
        style={{
          bottom: 84,
          boxShadow: "0 8px 20px rgba(15,118,110,.25)",
          position: "fixed",
          right: 18,
        }}
        type="button"
      >
        <Plus size={18} /> Add customer
      </button>
      {showForm && (
        <div className="dialog-backdrop">
          <form className="dialog dialog-wide" onSubmit={addCustomer}>
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Customer</p>
                <h2>Add customer</h2>
                <p className="page-copy">
                  Keep contact and company details for repeat work and invoices.
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
                <label htmlFor="customer-name">Contact name</label>
                <input className="input" id="customer-name" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="customer-company">Company (optional)</label>
                <input className="input" id="customer-company" name="company" />
              </div>
              <div className="field">
                <label htmlFor="customer-phone">Phone</label>
                <input className="input" id="customer-phone" name="phone" type="tel" />
              </div>
              <div className="field">
                <label htmlFor="customer-whatsapp">WhatsApp (optional)</label>
                <input
                  className="input"
                  id="customer-whatsapp"
                  name="whatsapp"
                  type="tel"
                />
              </div>
              <div className="field">
                <label htmlFor="customer-email">Email (optional)</label>
                <input
                  className="input"
                  id="customer-email"
                  name="email"
                  type="email"
                />
              </div>
              <div className="field">
                <label htmlFor="customer-tax">VAT / tax number (optional)</label>
                <input className="input" id="customer-tax" name="taxNumber" />
              </div>
              <div className="field">
                <label htmlFor="customer-address">Address (optional)</label>
                <input className="input" id="customer-address" name="address" />
              </div>
              <div className="field">
                <label htmlFor="customer-city">Town or city (optional)</label>
                <input className="input" id="customer-city" name="city" />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="customer-note">Note (optional)</label>
                <input
                  className="input"
                  id="customer-note"
                  name="notes"
                  placeholder="Preferences, how you met them, etc."
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
                <Plus size={17} /> Save customer
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
