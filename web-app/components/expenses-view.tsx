"use client";

import { formatDate, formatMoney } from "@/lib/format";
import { expenses } from "@/lib/sample-data";
import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { RecordToolbar } from "./record-toolbar";

export function ExpensesView() {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const filtered = useMemo(
    () => expenses.filter((expense) => `${expense.description} ${expense.category} ${expense.method}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <>
      <section className="stat-strip">
        <article className="card stat-tile"><p>June expenses</p><strong>$4,120.00</strong></article>
        <article className="card stat-tile"><p>Entries</p><strong>24</strong></article>
        <article className="card stat-tile"><p>Largest category</p><strong>Stock</strong></article>
        <article className="card stat-tile"><p>Against May</p><strong style={{ color: "#0F766E" }}>-4.8%</strong></article>
      </section>
      <RecordToolbar onChange={setQuery} placeholder="Search expense or category" value={query} />
      <section className="card">
        <div className="table-wrap desktop-only">
          <table className="data-table"><thead><tr><th>Expense</th><th>Date</th><th>Category</th><th>Payment</th><th>Amount</th></tr></thead><tbody>{filtered.map((expense) => <tr key={expense.id}><td><span className="table-name">{expense.description}</span><br /><span className="list-meta">{expense.id}</span></td><td>{formatDate(expense.date)}</td><td>{expense.category}</td><td>{expense.method}</td><td className="table-name">{formatMoney(expense.amount)}</td></tr>)}</tbody></table>
        </div>
        <div className="mobile-records" style={{ padding: 10 }}>{filtered.map((expense) => <article className="card record-card" key={expense.id}><div className="record-card-head"><div><p className="list-title">{expense.description}</p><p className="list-meta">{expense.category} · {formatDate(expense.date)}</p></div><strong>{formatMoney(expense.amount)}</strong></div><p className="list-meta" style={{ margin: "14px 0 0" }}>{expense.method}</p></article>)}</div>
      </section>
      <button aria-label="Add expense" className="button button-primary" onClick={() => setShowForm(true)} style={{ bottom: 84, boxShadow: "0 8px 20px rgba(15,118,110,.25)", position: "fixed", right: 18 }} type="button"><Plus size={18} /> Add expense</button>
      {showForm && <div className="dialog-backdrop"><form className="dialog" onSubmit={(event) => { event.preventDefault(); setShowForm(false); }}><div className="dialog-header"><div><p className="eyebrow">Money out</p><h2>Record expense</h2><p className="page-copy">Save a business cost with its category and payment method.</p></div><button aria-label="Close" className="icon-button" onClick={() => setShowForm(false)} type="button"><X size={18} /></button></div><div className="form-grid"><div className="field"><label htmlFor="expense-description">Description</label><input className="input" id="expense-description" required /></div><div className="field"><label htmlFor="expense-category">Category</label><select className="select" id="expense-category"><option>Stock purchases</option><option>Transport</option><option>Utilities</option><option>Rent</option><option>Supplies</option><option>Other</option></select></div><div className="field"><label htmlFor="expense-amount">Amount (USD)</label><input className="input" id="expense-amount" min="0.01" required step="0.01" type="number" /></div><div className="field"><label htmlFor="expense-payment">Payment method</label><select className="select" id="expense-payment"><option>Cash</option><option>EcoCash</option><option>Bank transfer</option><option>Card</option></select></div><div className="field"><label htmlFor="expense-date">Date</label><input className="input" id="expense-date" required type="date" /></div><div className="field"><label htmlFor="expense-reference">Reference (optional)</label><input className="input" id="expense-reference" /></div></div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setShowForm(false)} type="button">Cancel</button><button className="button button-primary" type="submit"><Plus size={17} /> Save expense</button></div></form></div>}
    </>
  );
}
