"use client";

import { formatDate, formatMoney } from "@/lib/format";
import { expenses } from "@/lib/sample-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { FolderTree, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RecordToolbar } from "./record-toolbar";
import { DataLoadingState } from "./data-loading-state";
import { ExcelExportButton } from "./excel-export-button";

type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  date: string;
  method: string;
  amount: number;
  currency: string;
};

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  is_system: boolean;
};

export function ExpensesView() {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [items, setItems] = useState<ExpenseRow[]>(() =>
    hasSupabaseConfig()
      ? []
      : expenses.map((expense) => ({ ...expense, currency: "USD" })),
  );
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>(() =>
    hasSupabaseConfig()
      ? []
      : [
          { id: "c1", name: "Transport", parent_id: null, is_system: true },
          { id: "c2", name: "Fuel", parent_id: "c1", is_system: false },
          { id: "c3", name: "Utilities", parent_id: null, is_system: true },
          { id: "c4", name: "Rent", parent_id: null, is_system: true },
          { id: "c5", name: "Other", parent_id: null, is_system: true },
        ],
  );
  const [currencies, setCurrencies] = useState<string[]>(["USD"]);
  const [currency, setCurrency] = useState("USD");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [message, setMessage] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubParentId, setNewSubParentId] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const parents = useMemo(
    () => categoryRows.filter((row) => !row.parent_id),
    [categoryRows],
  );
  const subcategories = useMemo(
    () =>
      categoryRows.filter(
        (row) => row.parent_id && row.parent_id === selectedCategoryId,
      ),
    [categoryRows, selectedCategoryId],
  );

  function categoryLabel(categoryId: string | null, subcategoryId: string | null) {
    const parent = categoryRows.find((row) => row.id === categoryId);
    const child = categoryRows.find((row) => row.id === subcategoryId);
    if (parent && child) return `${parent.name} · ${child.name}`;
    if (child) {
      const childParent = categoryRows.find((row) => row.id === child.parent_id);
      return childParent ? `${childParent.name} · ${child.name}` : child.name;
    }
    return parent?.name ?? "Other";
  }

  async function loadData() {
    if (!hasSupabaseConfig()) return;
    const supabase = createClient();
    const [expenseResult, categoryResult, business] = await Promise.all([
      supabase
        .from("expenses")
        .select(
          "id, description, amount, currency, payment_method, expense_date, category_id, subcategory_id",
        )
        .order("expense_date", { ascending: false }),
      supabase
        .from("expense_categories")
        .select("id, name, parent_id, is_system")
        .order("name"),
      getCurrentBusinessId().then(async (businessId) => {
        const { data } = await supabase
          .from("businesses")
          .select("currency, currencies")
          .eq("id", businessId)
          .maybeSingle();
        return data;
      }),
    ]);

    let loadedCategories: CategoryRow[] = [];

    if (categoryResult.data) {
      loadedCategories = categoryResult.data.map((row) => ({
        id: row.id,
        name: row.name,
        parent_id: row.parent_id ?? null,
        is_system: Boolean(row.is_system),
      }));
      setCategoryRows(loadedCategories);
      const top = loadedCategories.find((row) => !row.parent_id);
      if (top && !selectedCategoryId) setSelectedCategoryId(top.id);
    } else if (categoryResult.error) {
      // Fallback before migration 0012: parent_id may be missing.
      const { data: legacy } = await supabase
        .from("expense_categories")
        .select("id, name, is_system")
        .order("name");
      if (legacy) {
        loadedCategories = legacy.map((row) => ({
          id: row.id,
          name: row.name,
          parent_id: null,
          is_system: Boolean(row.is_system),
        }));
        setCategoryRows(loadedCategories);
        if (legacy[0]) setSelectedCategoryId(legacy[0].id);
      }
    }

    if (expenseResult.data) {
      setItems(
        expenseResult.data.map((expense) => {
          const parent = loadedCategories.find(
            (row) => row.id === expense.category_id,
          );
          const child = loadedCategories.find(
            (row) => row.id === expense.subcategory_id,
          );
          const label =
            parent && child
              ? `${parent.name} · ${child.name}`
              : child
                ? child.name
                : parent?.name ?? "Other";
          return {
            id: expense.id,
            description: expense.description,
            category: label,
            date: expense.expense_date,
            method: String(expense.payment_method).replace("_", " "),
            amount: Number(expense.amount),
            currency: expense.currency ?? "USD",
          };
        }),
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
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((expense) =>
        `${expense.description} ${expense.category} ${expense.method} ${expense.currency}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of items) {
      map.set(
        expense.currency,
        (map.get(expense.currency) ?? 0) + expense.amount,
      );
    }
    return [...map.entries()];
  }, [items]);

  const largestExpense = items.reduce(
    (largest, expense) =>
      expense.amount > largest.amount ? expense : largest,
    items[0] ?? { amount: 0, category: "None", currency: "USD" },
  );

  if (loading) return <DataLoadingState />;

  async function addExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const description = String(form.get("description") ?? "");
    const amount = Number(form.get("amount") ?? 0);
    const method = String(form.get("paymentMethod") ?? "cash");
    const date = String(form.get("date") ?? "");
    const reference = String(form.get("reference") ?? "");
    const selectedCurrency = String(form.get("currency") ?? currency);
    const categoryId = selectedCategoryId;
    const subcategoryId = selectedSubcategoryId || null;

    if (!categoryId) {
      setMessage("Choose an expense category.");
      return;
    }

    const label = categoryLabel(categoryId, subcategoryId);

    if (!hasSupabaseConfig()) {
      setItems((current) => [
        {
          id: crypto.randomUUID(),
          description,
          category: label,
          date,
          method: method.replace("_", " "),
          amount,
          currency: selectedCurrency,
        },
        ...current,
      ]);
      setShowForm(false);
      setMessage("Expense added to this demonstration session.");
      return;
    }

    try {
      const businessId = await getCurrentBusinessId();
      const payload: Record<string, unknown> = {
        business_id: businessId,
        category_id: categoryId,
        description,
        amount,
        payment_method: method,
        currency: selectedCurrency,
        expense_date: date,
        reference: reference || null,
      };
      if (subcategoryId) payload.subcategory_id = subcategoryId;

      const { error } = await createClient().from("expenses").insert(payload);
      if (error) {
        if (/subcategory_id|schema cache/i.test(error.message)) {
          delete payload.subcategory_id;
          const { error: retryError } = await createClient()
            .from("expenses")
            .insert(payload);
          if (retryError) throw retryError;
          setMessage(
            "Expense saved. Run migration 0012_expense_subcategories.sql to store subcategories.",
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
          : "The expense could not be saved.",
      );
    }
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (name.length < 2) {
      setMessage("Enter a category name (at least 2 characters).");
      return;
    }
    setSavingCategory(true);
    setMessage("");
    try {
      if (!hasSupabaseConfig()) {
        const id = crypto.randomUUID();
        setCategoryRows((current) => [
          ...current,
          { id, name, parent_id: null, is_system: false },
        ]);
        setNewCategoryName("");
        setMessage("Category added in this demonstration session.");
        return;
      }
      const businessId = await getCurrentBusinessId();
      const { error } = await createClient().from("expense_categories").insert({
        business_id: businessId,
        name,
        is_system: false,
        parent_id: null,
      });
      if (error) throw error;
      setNewCategoryName("");
      await loadData();
      setMessage("Category added.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? /parent_id|schema cache/i.test(error.message)
            ? `${error.message} Run supabase/migrations/0012_expense_subcategories.sql in Supabase.`
            : error.message
          : "Category could not be saved.",
      );
    } finally {
      setSavingCategory(false);
    }
  }

  async function addSubcategory() {
    const name = newSubName.trim();
    if (!newSubParentId) {
      setMessage("Choose a parent category for the subcategory.");
      return;
    }
    if (name.length < 2) {
      setMessage("Enter a subcategory name (at least 2 characters).");
      return;
    }
    setSavingCategory(true);
    setMessage("");
    try {
      if (!hasSupabaseConfig()) {
        setCategoryRows((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            name,
            parent_id: newSubParentId,
            is_system: false,
          },
        ]);
        setNewSubName("");
        setMessage("Subcategory added in this demonstration session.");
        return;
      }
      const businessId = await getCurrentBusinessId();
      const { error } = await createClient().from("expense_categories").insert({
        business_id: businessId,
        name,
        is_system: false,
        parent_id: newSubParentId,
      });
      if (error) throw error;
      setNewSubName("");
      await loadData();
      setMessage("Subcategory added.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? /parent_id|schema cache/i.test(error.message)
            ? `${error.message} Run supabase/migrations/0012_expense_subcategories.sql in Supabase.`
            : error.message
          : "Subcategory could not be saved.",
      );
    } finally {
      setSavingCategory(false);
    }
  }

  async function removeCategory(category: CategoryRow) {
    if (category.is_system) {
      setMessage("Built-in categories cannot be removed.");
      return;
    }
    const hasChildren = categoryRows.some(
      (row) => row.parent_id === category.id,
    );
    if (hasChildren) {
      setMessage("Remove subcategories first.");
      return;
    }
    setSavingCategory(true);
    try {
      if (!hasSupabaseConfig()) {
        setCategoryRows((current) =>
          current.filter((row) => row.id !== category.id),
        );
        return;
      }
      const { error } = await createClient()
        .from("expense_categories")
        .delete()
        .eq("id", category.id);
      if (error) throw error;
      await loadData();
      setMessage("Category removed.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Category could not be removed (it may still be used on expenses).",
      );
    } finally {
      setSavingCategory(false);
    }
  }

  return (
    <>
      <section className="stat-strip">
        <article className="card stat-tile">
          <p>Total expenses</p>
          <strong>
            {totalsByCurrency.length
              ? totalsByCurrency
                  .map(([code, total]) => formatMoney(total, code))
                  .join(" · ")
              : formatMoney(0, currency)}
          </strong>
        </article>
        <article className="card stat-tile">
          <p>Entries</p>
          <strong>{items.length}</strong>
        </article>
        <article className="card stat-tile">
          <p>Largest expense</p>
          <strong>{largestExpense.category}</strong>
        </article>
        <article className="card stat-tile">
          <p>Largest amount</p>
          <strong>
            {formatMoney(largestExpense.amount, largestExpense.currency)}
          </strong>
        </article>
      </section>
      <RecordToolbar
        onChange={setQuery}
        placeholder="Search expense or category"
        value={query}
      >
        <button
          className="button button-secondary"
          onClick={() => setShowCategories(true)}
          type="button"
        >
          <FolderTree size={16} /> Categories
        </button>
        <ExcelExportButton
          documentLabel="expenses"
          headers={["Description", "Date", "Category", "Payment", "Currency", "Amount"]}
          rows={filtered.map((expense) => [
            expense.description,
            expense.date,
            expense.category,
            expense.method,
            expense.currency,
            expense.amount,
          ])}
          sheetName="Expenses"
        />
      </RecordToolbar>
      {message && (
        <p
          className={`form-message ${
            message.includes("added") ||
            message.includes("saved") ||
            message.includes("removed") ||
            message.includes("demonstration")
              ? "form-message-success"
              : "form-message-error"
          }`}
          style={{ marginBottom: 14 }}
        >
          {message}
        </p>
      )}
      <section className="card">
        <div className="table-wrap desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th>Expense</th>
                <th>Date</th>
                <th>Category</th>
                <th>Payment</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense) => (
                <tr key={expense.id}>
                  <td>
                    <span className="table-name">{expense.description}</span>
                    <br />
                    <span className="list-meta">{expense.id}</span>
                  </td>
                  <td>{formatDate(expense.date)}</td>
                  <td>{expense.category}</td>
                  <td>
                    {expense.method} · {expense.currency}
                  </td>
                  <td className="table-name">
                    {formatMoney(expense.amount, expense.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-records" style={{ padding: 10 }}>
          {filtered.map((expense) => (
            <article className="card record-card" key={expense.id}>
              <div className="record-card-head">
                <div>
                  <p className="list-title">{expense.description}</p>
                  <p className="list-meta">
                    {expense.category} · {formatDate(expense.date)}
                  </p>
                </div>
                <strong>{formatMoney(expense.amount, expense.currency)}</strong>
              </div>
              <p className="list-meta" style={{ margin: "14px 0 0" }}>
                {expense.method} · {expense.currency}
              </p>
            </article>
          ))}
        </div>
      </section>
      <button
        aria-label="Add expense"
        className="button button-primary"
        onClick={() => {
          if (!selectedCategoryId && parents[0]) {
            setSelectedCategoryId(parents[0].id);
          }
          setSelectedSubcategoryId("");
          setShowForm(true);
        }}
        style={{
          bottom: 84,
          boxShadow: "0 8px 20px rgba(15,118,110,.25)",
          position: "fixed",
          right: 18,
        }}
        type="button"
      >
        <Plus size={18} /> Add expense
      </button>

      {showForm && (
        <div className="dialog-backdrop">
          <form className="dialog" onSubmit={addExpense}>
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Money out</p>
                <h2>Record expense</h2>
                <p className="page-copy">
                  Save a business cost with category, optional subcategory, and payment method.
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
                <label htmlFor="expense-description">Description</label>
                <input
                  className="input"
                  id="expense-description"
                  name="description"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="expense-category">Category</label>
                <select
                  className="select"
                  id="expense-category"
                  onChange={(event) => {
                    setSelectedCategoryId(event.target.value);
                    setSelectedSubcategoryId("");
                  }}
                  required
                  value={selectedCategoryId}
                >
                  <option value="">Choose category</option>
                  {parents.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="expense-subcategory">
                  Subcategory (optional)
                </label>
                <select
                  className="select"
                  disabled={!selectedCategoryId || subcategories.length === 0}
                  id="expense-subcategory"
                  onChange={(event) =>
                    setSelectedSubcategoryId(event.target.value)
                  }
                  value={selectedSubcategoryId}
                >
                  <option value="">
                    {subcategories.length
                      ? "None"
                      : "No subcategories yet"}
                  </option>
                  {subcategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="expense-currency">Currency</label>
                <select
                  className="select"
                  id="expense-currency"
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
                <label htmlFor="expense-amount">Amount ({currency})</label>
                <input
                  className="input"
                  id="expense-amount"
                  min="0.01"
                  name="amount"
                  required
                  step="0.01"
                  type="number"
                />
              </div>
              <div className="field">
                <label htmlFor="expense-payment">Payment method</label>
                <select
                  className="select"
                  id="expense-payment"
                  name="paymentMethod"
                >
                  <option value="cash">Cash</option>
                  <option value="ecocash">EcoCash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="expense-date">Date</label>
                <input
                  className="input"
                  id="expense-date"
                  name="date"
                  required
                  type="date"
                />
              </div>
              <div className="field">
                <label htmlFor="expense-reference">Reference (optional)</label>
                <input
                  className="input"
                  id="expense-reference"
                  name="reference"
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
                <Plus size={17} /> Save expense
              </button>
            </div>
          </form>
        </div>
      )}

      {showCategories && (
        <div className="dialog-backdrop">
          <div className="dialog dialog-wide">
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Money out</p>
                <h2>Expense categories</h2>
                <p className="page-copy">
                  Add your own categories and optional subcategories (e.g. Transport → Fuel).
                </p>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={() => setShowCategories(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="new-category">New category</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    id="new-category"
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="e.g. Marketing"
                    value={newCategoryName}
                  />
                  <button
                    className="button button-primary"
                    disabled={savingCategory}
                    onClick={() => void addCategory()}
                    type="button"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="new-subcategory">New subcategory</label>
                <div className="form-grid">
                  <select
                    className="select"
                    id="new-sub-parent"
                    onChange={(event) => setNewSubParentId(event.target.value)}
                    value={newSubParentId}
                  >
                    <option value="">Under which category?</option>
                    {parents.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="input"
                      id="new-subcategory"
                      onChange={(event) => setNewSubName(event.target.value)}
                      placeholder="e.g. Fuel"
                      value={newSubName}
                    />
                    <button
                      className="button button-primary"
                      disabled={savingCategory}
                      onClick={() => void addSubcategory()}
                      type="button"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="list" style={{ marginTop: 18 }}>
              {parents.map((parent) => {
                const children = categoryRows.filter(
                  (row) => row.parent_id === parent.id,
                );
                return (
                  <div key={parent.id} style={{ marginBottom: 12 }}>
                    <div className="list-row">
                      <div className="list-body">
                        <p className="list-title">{parent.name}</p>
                        <p className="list-meta">
                          {parent.is_system ? "Built-in" : "Custom"}
                          {children.length
                            ? ` · ${children.length} subcategories`
                            : ""}
                        </p>
                      </div>
                      {!parent.is_system && (
                        <button
                          aria-label={`Remove ${parent.name}`}
                          className="icon-button"
                          disabled={savingCategory}
                          onClick={() => void removeCategory(parent)}
                          style={{ color: "#B42318" }}
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {children.map((child) => (
                      <div
                        className="list-row"
                        key={child.id}
                        style={{ paddingLeft: 18 }}
                      >
                        <div className="list-body">
                          <p className="list-title">{child.name}</p>
                          <p className="list-meta">Subcategory</p>
                        </div>
                        <button
                          aria-label={`Remove ${child.name}`}
                          className="icon-button"
                          disabled={savingCategory}
                          onClick={() => void removeCategory(child)}
                          style={{ color: "#B42318" }}
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="dialog-actions">
              <button
                className="button button-secondary"
                onClick={() => setShowCategories(false)}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
