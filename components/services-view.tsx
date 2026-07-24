"use client";

import { formatMoney } from "@/lib/format";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { Briefcase, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataLoadingState } from "./data-loading-state";
import { RecordToolbar } from "./record-toolbar";

type Tier = {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
};

type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  tiers: Tier[];
};

type TierDraft = {
  id?: string;
  name: string;
  description: string;
  price: string;
};

const demoServices: Service[] = [
  {
    id: "s1",
    name: "Website design",
    description: "Simple brochure site for a small business.",
    price: 0,
    unit: "job",
    tiers: [
      { id: "t1", name: "Starter", description: "3 pages", price: 150, unit: "job" },
      { id: "t2", name: "Business", description: "Up to 8 pages", price: 400, unit: "job" },
      { id: "t3", name: "Premium", description: "Custom design + forms", price: 800, unit: "job" },
    ],
  },
  {
    id: "s2",
    name: "Bookkeeping support",
    description: "Monthly help keeping sales and expenses tidy.",
    price: 80,
    unit: "month",
    tiers: [],
  },
];

const UNIT_OPTIONS = [
  ["job", "Per job"],
  ["hour", "Per hour"],
  ["session", "Per session"],
  ["day", "Per day"],
  ["month", "Per month"],
  ["visit", "Per visit"],
];

function uniqueServiceSku(prefix = "SVC") {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function ServicesView() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Service[]>(() =>
    hasSupabaseConfig() ? [] : demoServices,
  );
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("job");
  const [basePrice, setBasePrice] = useState("");
  const [tiers, setTiers] = useState<TierDraft[]>([]);

  function loadServices() {
    if (!hasSupabaseConfig()) return;
    const supabase = createClient();
    return supabase
      .from("products")
      .select(
        "id, name, description, selling_price, unit, parent_product_id, product_type",
      )
      .eq("product_type", "service")
      .eq("is_archived", false)
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          setMessage(
            /description|parent_product_id|schema cache/i.test(error.message)
              ? `${error.message} Run supabase/migrations/0009_services_and_customers.sql in Supabase.`
              : error.message,
          );
          setLoading(false);
          return;
        }
        const rows = data ?? [];
        const parents = rows.filter((row) => !row.parent_product_id);
        const children = rows.filter((row) => row.parent_product_id);
        setItems(
          parents.map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description ?? "",
            price: Number(service.selling_price),
            unit: service.unit,
            tiers: children
              .filter((tier) => tier.parent_product_id === service.id)
              .map((tier) => ({
                id: tier.id,
                name: tier.name,
                description: tier.description ?? "",
                price: Number(tier.selling_price),
                unit: tier.unit,
              })),
          })),
        );
        setLoading(false);
      });
  }

  useEffect(() => {
    void loadServices();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((service) =>
        `${service.name} ${service.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );

  function addTierRow() {
    setTiers((current) => [
      ...current,
      { name: "", description: "", price: "" },
    ]);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setUnit("job");
    setBasePrice("");
    setTiers([]);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(service: Service) {
    setEditingId(service.id);
    setName(service.name);
    setDescription(service.description);
    setUnit(service.unit);
    setBasePrice(String(service.price));
    setTiers(
      service.tiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        description: tier.description,
        price: String(tier.price),
      })),
    );
    setShowForm(true);
  }

  async function saveService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setMessage("Enter a service name.");
      return;
    }

    const parsedBase = Number(basePrice || "0");
    if (!Number.isFinite(parsedBase) || parsedBase < 0) {
      setMessage("Enter a valid price, or 0 if pricing is only on tiers.");
      return;
    }

    const parsedTiers = tiers
      .map((tier) => ({
        id: tier.id,
        name: tier.name.trim(),
        description: tier.description.trim(),
        price: Number(tier.price),
      }))
      .filter((tier) => tier.name.length > 0);

    for (const tier of parsedTiers) {
      if (!Number.isFinite(tier.price) || tier.price < 0) {
        setMessage(`Enter a valid price for the “${tier.name}” tier.`);
        return;
      }
    }

    if (parsedTiers.length === 0 && parsedBase <= 0) {
      setMessage("Add a price, or at least one priced tier.");
      return;
    }

    if (!hasSupabaseConfig()) {
      if (editingId) {
        setItems((current) =>
          current.map((service) =>
            service.id === editingId
              ? {
                  ...service,
                  name: trimmedName,
                  description: description.trim(),
                  price: parsedBase,
                  unit,
                  tiers: parsedTiers.map((tier) => ({
                    id: tier.id ?? crypto.randomUUID(),
                    name: tier.name,
                    description: tier.description,
                    price: tier.price,
                    unit,
                  })),
                }
              : service,
          ),
        );
        setMessage("Service updated in this demonstration session.");
      } else {
        setItems((current) => [
          {
            id: crypto.randomUUID(),
            name: trimmedName,
            description: description.trim(),
            price: parsedBase,
            unit,
            tiers: parsedTiers.map((tier) => ({
              id: crypto.randomUUID(),
              name: tier.name,
              description: tier.description,
              price: tier.price,
              unit,
            })),
          },
          ...current,
        ]);
        setMessage("Service added to this demonstration session.");
      }
      setShowForm(false);
      resetForm();
      return;
    }

    setSaving(true);
    try {
      const businessId = await getCurrentBusinessId();
      const supabase = createClient();

      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update({
            name: trimmedName,
            description: description.trim() || null,
            unit,
            selling_price: parsedBase,
          })
          .eq("id", editingId);
        if (error) throw error;

        const existingTier =
          items.find((service) => service.id === editingId)?.tiers ?? [];
        const keptIds = new Set(
          parsedTiers.map((tier) => tier.id).filter(Boolean) as string[],
        );

        for (const tier of existingTier) {
          if (!keptIds.has(tier.id)) {
            const { error: archiveError } = await supabase
              .from("products")
              .update({ is_archived: true })
              .eq("id", tier.id);
            if (archiveError) throw archiveError;
          }
        }

        for (const tier of parsedTiers) {
          if (tier.id) {
            const { error: tierError } = await supabase
              .from("products")
              .update({
                name: tier.name,
                description: tier.description || null,
                unit,
                selling_price: tier.price,
              })
              .eq("id", tier.id);
            if (tierError) throw tierError;
          } else {
            const { error: tierError } = await supabase.from("products").insert({
              business_id: businessId,
              name: tier.name,
              description: tier.description || null,
              product_type: "service",
              unit,
              selling_price: tier.price,
              cost_price: 0,
              pack_size: 1,
              reorder_level: 0,
              parent_product_id: editingId,
              sku: uniqueServiceSku("TIER"),
            });
            if (tierError) throw tierError;
          }
        }

        setMessage("Service updated.");
      } else {
        const { data: service, error } = await supabase
          .from("products")
          .insert({
            business_id: businessId,
            name: trimmedName,
            description: description.trim() || null,
            product_type: "service",
            unit,
            selling_price: parsedBase,
            cost_price: 0,
            pack_size: 1,
            reorder_level: 0,
            sku: uniqueServiceSku("SVC"),
          })
          .select("id")
          .single();
        if (error) throw error;

        if (parsedTiers.length) {
          const { error: tierError } = await supabase.from("products").insert(
            parsedTiers.map((tier) => ({
              business_id: businessId,
              name: tier.name,
              description: tier.description || null,
              product_type: "service",
              unit,
              selling_price: tier.price,
              cost_price: 0,
              pack_size: 1,
              reorder_level: 0,
              parent_product_id: service.id,
              sku: uniqueServiceSku("TIER"),
            })),
          );
          if (tierError) throw tierError;
        }
        setMessage("Service added.");
      }

      setShowForm(false);
      resetForm();
      setLoading(true);
      await loadServices();
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "The service could not be saved.";
      setMessage(
        /products_business_id_sku|duplicate key/i.test(detail)
          ? `${detail} Run supabase/migrations/0011_product_sku_nulls.sql in Supabase, then try again.`
          : /description|parent_product_id|schema cache/i.test(detail)
            ? `${detail} Run supabase/migrations/0009_services_and_customers.sql in Supabase.`
            : detail,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <DataLoadingState />;

  return (
    <>
      <RecordToolbar
        onChange={setQuery}
        placeholder="Search services"
        value={query}
      />
      {message && (
        <p
          className={`form-message ${
            message.includes("added") ||
            message.includes("updated") ||
            message.includes("demonstration")
              ? "form-message-success"
              : "form-message-error"
          }`}
          style={{ marginBottom: 14 }}
        >
          {message}
        </p>
      )}

      <section className="stat-strip">
        <article className="card stat-tile">
          <p>Services</p>
          <strong>{items.length}</strong>
        </article>
        <article className="card stat-tile">
          <p>With price tiers</p>
          <strong>{items.filter((item) => item.tiers.length > 0).length}</strong>
        </article>
      </section>

      <div className="mobile-records" style={{ paddingBottom: 24 }}>
        {filtered.map((service) => (
          <article className="card record-card" key={service.id}>
            <div className="record-card-head">
              <div>
                <p className="list-title">{service.name}</p>
                <p className="list-meta">
                  {service.tiers.length
                    ? `${service.tiers.length} tiers · billed ${service.unit}`
                    : `Billed ${service.unit}`}
                </p>
              </div>
              <strong>
                {service.tiers.length
                  ? `From ${formatMoney(
                      Math.min(...service.tiers.map((tier) => tier.price)),
                    )}`
                  : formatMoney(service.price)}
              </strong>
            </div>
            {service.description && (
              <p className="list-meta" style={{ marginTop: 10 }}>
                {service.description}
              </p>
            )}
            {service.tiers.length > 0 && (
              <div className="list" style={{ marginTop: 12 }}>
                {service.tiers.map((tier) => (
                  <div className="list-row" key={tier.id}>
                    <span className="list-body">
                      <span className="list-title">{tier.name}</span>
                      {tier.description && (
                        <span className="list-meta">{tier.description}</span>
                      )}
                    </span>
                    <strong>{formatMoney(tier.price)}</strong>
                  </div>
                ))}
              </div>
            )}
            <button
              className="button button-secondary"
              onClick={() => openEdit(service)}
              style={{ marginTop: 14, width: "100%" }}
              type="button"
            >
              <Pencil size={16} /> Edit service
            </button>
          </article>
        ))}
        {!filtered.length && (
          <div className="card card-pad" style={{ textAlign: "center" }}>
            <Briefcase size={28} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
            <strong>No services yet</strong>
            <p className="page-copy">Add what customers hire or book from you.</p>
          </div>
        )}
      </div>

      <section className="card desktop-only">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Billing</th>
                <th>Tiers</th>
                <th>Price</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((service) => (
                <tr key={service.id}>
                  <td>
                    <span className="table-name">{service.name}</span>
                    {service.description && (
                      <>
                        <br />
                        <span className="list-meta">{service.description}</span>
                      </>
                    )}
                  </td>
                  <td>{service.unit}</td>
                  <td>
                    {service.tiers.length
                      ? service.tiers.map((tier) => tier.name).join(", ")
                      : "—"}
                  </td>
                  <td className="table-name">
                    {service.tiers.length
                      ? `From ${formatMoney(
                          Math.min(...service.tiers.map((tier) => tier.price)),
                        )}`
                      : formatMoney(service.price)}
                  </td>
                  <td>
                    <button
                      className="button button-secondary"
                      onClick={() => openEdit(service)}
                      style={{ minHeight: 36, padding: "0 10px" }}
                      type="button"
                    >
                      <Pencil size={15} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <button
        className="button button-primary"
        onClick={openCreate}
        style={{
          bottom: 84,
          boxShadow: "0 8px 20px rgba(15,118,110,.25)",
          position: "fixed",
          right: 18,
        }}
        type="button"
      >
        <Plus size={18} /> Add service
      </button>

      {showForm && (
        <div className="dialog-backdrop">
          <form className="dialog dialog-wide" onSubmit={saveService}>
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Offerings</p>
                <h2>{editingId ? "Edit service" : "Add a service"}</h2>
                <p className="page-copy">
                  Name what you do, describe it, and optionally add price tiers
                  (Starter, Standard, Premium).
                </p>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="service-name">Service name</label>
                <input
                  className="input"
                  id="service-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Website design"
                  required
                  value={name}
                />
              </div>
              <div className="field">
                <label htmlFor="service-unit">How you bill it</label>
                <select
                  className="select"
                  id="service-unit"
                  onChange={(event) => setUnit(event.target.value)}
                  value={unit}
                >
                  {UNIT_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="service-description">Description</label>
                <textarea
                  className="input"
                  id="service-description"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What the customer gets"
                  rows={3}
                  value={description}
                />
              </div>
              <div className="field">
                <label htmlFor="service-price">
                  Base price (optional if you use tiers)
                </label>
                <input
                  className="input"
                  id="service-price"
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => setBasePrice(event.target.value)}
                  placeholder="0"
                  step="0.01"
                  type="number"
                  value={basePrice}
                />
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="section-heading">
                <div>
                  <h3 style={{ margin: 0 }}>Price tiers (optional)</h3>
                  <p className="page-copy">
                    Use this when one service has different packages or levels.
                  </p>
                </div>
                <button
                  className="button button-secondary"
                  onClick={addTierRow}
                  type="button"
                >
                  <Plus size={16} /> Add tier
                </button>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {tiers.map((tier, index) => (
                  <div className="card record-card" key={tier.id ?? `new-${index}`}>
                    <div className="form-grid" style={{ alignItems: "end" }}>
                      <div className="field">
                        <label htmlFor={`tier-name-${index}`}>Tier name</label>
                        <input
                          className="input"
                          id={`tier-name-${index}`}
                          onChange={(event) =>
                            setTiers((current) =>
                              current.map((row, i) =>
                                i === index
                                  ? { ...row, name: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="e.g. Standard"
                          value={tier.name}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`tier-price-${index}`}>Price</label>
                        <input
                          className="input"
                          id={`tier-price-${index}`}
                          min="0"
                          onChange={(event) =>
                            setTiers((current) =>
                              current.map((row, i) =>
                                i === index
                                  ? { ...row, price: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          step="0.01"
                          type="number"
                          value={tier.price}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`tier-desc-${index}`}>
                          Tier note (optional)
                        </label>
                        <input
                          className="input"
                          id={`tier-desc-${index}`}
                          onChange={(event) =>
                            setTiers((current) =>
                              current.map((row, i) =>
                                i === index
                                  ? { ...row, description: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="What’s included"
                          value={tier.description}
                        />
                      </div>
                      <button
                        aria-label="Remove tier"
                        className="icon-button"
                        onClick={() =>
                          setTiers((current) =>
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
                ))}
              </div>
            </div>

            <div className="dialog-actions">
              <button
                className="button button-secondary"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={saving}
                type="submit"
              >
                <Plus size={17} />
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Save service"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
