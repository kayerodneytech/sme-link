"use client";

import { formatDate, formatMoney } from "@/lib/format";
import { expenses } from "@/lib/sample-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RecordToolbar } from "./record-toolbar";
import { DataLoadingState } from "./data-loading-state";

export function ExpensesView() {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState(() => hasSupabaseConfig() ? [] : expenses);
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    createClient()
      .from("expenses")
      .select("id, description, amount, payment_method, expense_date, expense_categories(name)")
      .order("expense_date", { ascending: false })
      .then(({ data }) => {
        if (data) setItems(
          data.map((expense) => {
            const category = Array.isArray(expense.expense_categories)
              ? expense.expense_categories[0]
              : expense.expense_categories;
            return {
              id: expense.id,
              description: expense.description,
              category: category?.name ?? "Other",
              date: expense.expense_date,
              method: String(expense.payment_method).replace("_", " "),
              amount: Number(expense.amount),
            };
          }),
        );
        setLoading(false);
      });
  }, []);
  const filtered = useMemo(
    () => items.filter((expense) => `${expense.description} ${expense.category} ${expense.method}`.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );
  const expenseTotal = items.reduce((sum, expense) => sum + expense.amount, 0);
  const largestExpense = items.reduce((largest, expense) =>
    expense.amount > largest.amount ? expense : largest,
  items[0] ?? { amount: 0, category: "None" });

  if (loading) return <DataLoadingState />;

  async function addExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const description = String(form.get("description") ?? "");
    const categoryName = String(form.get("category") ?? "Other");
    const amount = Number(form.get("amount") ?? 0);
    const method = String(form.get("paymentMethod") ?? "cash");
    const date = String(form.get("date") ?? "");
    const reference = String(form.get("reference") ?? "");

    if (!hasSupabaseConfig()) {
      setItems((current) => [{ id: crypto.randomUUID(), description, category: categoryName, date, method: method.replace("_", " "), amount }, ...current]);
      setShowForm(false);
      setMessage("Expense added to this demonstration session.");
      return;
    }

    try {
      const businessId = await getCurrentBusinessId();
      const supabase = createClient();
      const { data: category, error: categoryError } = await supabase
        .from("expense_categories")
        .select("id")
        .eq("business_id", businessId)
        .eq("name", categoryName)
        .single();
      if (categoryError) throw categoryError;
      const { error } = await supabase.from("expenses").insert({
        business_id: businessId,
        category_id: category.id,
        description,
        amount,
        payment_method: method,
        expense_date: date,
        reference: reference || null,
      });
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The expense could not be saved.");
    }
  }

  return (
    <>
      <section className="stat-strip">
        <article className="card stat-tile"><p>Total expenses</p><strong>{formatMoney(expenseTotal)}</strong></article>
        <article className="card stat-tile"><p>Entries</p><strong>{items.length}</strong></article>
        <article className="card stat-tile"><p>Largest expense</p><strong>{largestExpense.category}</strong></article>
        <article className="card stat-tile"><p>Largest amount</p><strong>{formatMoney(largestExpense.amount)}</strong></article>
      </section>
      <RecordToolbar onChange={setQuery} placeholder="Search expense or category" value={query} />
      {message && <p className="form-message form-message-success" style={{ marginBottom: 14 }}>{message}</p>}
      <section className="card">
        <div className="table-wrap desktop-only">
          <table className="data-table"><thead><tr><th>Expense</th><th>Date</th><th>Category</th><th>Payment</th><th>Amount</th></tr></thead><tbody>{filtered.map((expense) => <tr key={expense.id}><td><span className="table-name">{expense.description}</span><br /><span className="list-meta">{expense.id}</span></td><td>{formatDate(expense.date)}</td><td>{expense.category}</td><td>{expense.method}</td><td className="table-name">{formatMoney(expense.amount)}</td></tr>)}</tbody></table>
        </div>
        <div className="mobile-records" style={{ padding: 10 }}>{filtered.map((expense) => <article className="card record-card" key={expense.id}><div className="record-card-head"><div><p className="list-title">{expense.description}</p><p className="list-meta">{expense.category} · {formatDate(expense.date)}</p></div><strong>{formatMoney(expense.amount)}</strong></div><p className="list-meta" style={{ margin: "14px 0 0" }}>{expense.method}</p></article>)}</div>
      </section>
      <button aria-label="Add expense" className="button button-primary" onClick={() => setShowForm(true)} style={{ bottom: 84, boxShadow: "0 8px 20px rgba(15,118,110,.25)", position: "fixed", right: 18 }} type="button"><Plus size={18} /> Add expense</button>
      {showForm && <div className="dialog-backdrop"><form className="dialog" onSubmit={addExpense}><div className="dialog-header"><div><p className="eyebrow">Money out</p><h2>Record expense</h2><p className="page-copy">Save a business cost with its category and payment method.</p></div><button aria-label="Close" className="icon-button" onClick={() => setShowForm(false)} type="button"><X size={18} /></button></div><div className="form-grid"><div className="field"><label htmlFor="expense-description">Description</label><input className="input" id="expense-description" name="description" required /></div><div className="field"><label htmlFor="expense-category">Category</label><select className="select" id="expense-category" name="category"><option>Stock purchases</option><option>Transport</option><option>Utilities</option><option>Rent</option><option>Supplies</option><option>Other</option></select></div><div className="field"><label htmlFor="expense-amount">Amount (USD)</label><input className="input" id="expense-amount" min="0.01" name="amount" required step="0.01" type="number" /></div><div className="field"><label htmlFor="expense-payment">Payment method</label><select className="select" id="expense-payment" name="paymentMethod"><option value="cash">Cash</option><option value="ecocash">EcoCash</option><option value="bank_transfer">Bank transfer</option><option value="card">Card</option></select></div><div className="field"><label htmlFor="expense-date">Date</label><input className="input" id="expense-date" name="date" required type="date" /></div><div className="field"><label htmlFor="expense-reference">Reference (optional)</label><input className="input" id="expense-reference" name="reference" /></div></div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setShowForm(false)} type="button">Cancel</button><button className="button button-primary" type="submit"><Plus size={17} /> Save expense</button></div></form></div>}
    </>
  );
}
