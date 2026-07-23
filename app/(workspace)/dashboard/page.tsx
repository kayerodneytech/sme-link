import { DashboardChart } from "@/components/dashboard-chart";
import { PageHeading } from "@/components/page-heading";
import { getBusinessOverview } from "@/lib/business-overview";
import { formatMoney } from "@/lib/format";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  PackageCheck,
  Plus,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";

function percentageChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export default async function DashboardPage() {
  const overview = await getBusinessOverview();
  const change = percentageChange(overview.revenue, overview.previousRevenue);
  const topExpense = overview.expenseCategories[0];

  return (
    <div className="content">
      <PageHeading
        action={
          <Link className="button button-primary" href="/sales/new">
            <Plus size={18} />
            Record sale
          </Link>
        }
        description="A clear view of what is happening in your business right now."
        eyebrow={overview.source === "mock" ? "Demo business overview" : "Business overview"}
        title={overview.source === "mock" ? "Good morning, Thabiso" : "Welcome back"}
      />

      <section className="summary-grid" aria-label="Business summary">
        <article className="card summary-card">
          <p className="summary-label">Cash in hand</p>
          <p className="summary-value">{formatMoney(overview.cashOnHand)}</p>
          <p className="trend">
            <PackageCheck size={14} />
            Started with {formatMoney(overview.openingCash)}
          </p>
        </article>
        <article className="card summary-card">
          <p className="summary-label">Money in this month</p>
          <p className="summary-value">{formatMoney(overview.revenue)}</p>
          <p className="trend">
            <ArrowUpRight size={14} />
            {change === null
              ? "First month being tracked"
              : `${Math.abs(change).toFixed(1)}% ${change >= 0 ? "more" : "less"} than last month`}
          </p>
        </article>
        <article className="card summary-card">
          <p className="summary-label">Money out this month</p>
          <p className="summary-value">{formatMoney(overview.expenses)}</p>
          <p className="trend">
            <ReceiptText size={14} />
            {topExpense ? `Most spent on ${topExpense.name.toLowerCase()}` : "No expenses recorded"}
          </p>
        </article>
        <article className="card summary-card">
          <p className="summary-label">
            {overview.tracksInventory ? "Low-stock products" : "Profit after costs"}
          </p>
          <p className="summary-value">
            {overview.tracksInventory
              ? overview.lowStock.length
              : formatMoney(overview.estimatedTakeHome)}
          </p>
          <p className={overview.tracksInventory ? "trend trend-warning" : "trend"}>
            {overview.tracksInventory ? (
              <>
                <AlertTriangle size={14} />
                {overview.lowStock.length
                  ? "Check what needs restocking"
                  : "Stock levels look healthy"}
              </>
            ) : (
              <>
                <ShoppingBag size={14} />
                Sales minus recorded expenses
              </>
            )}
          </p>
        </article>
      </section>

      <section className="card card-pad action-panel">
        <div className="section-heading">
          <div>
            <h2>What needs your attention</h2>
            <p>Simple actions based on the records in your workspace</p>
          </div>
        </div>
        <div className="action-list">
          {overview.tracksInventory && (
            <Link href="/inventory">
              <span className="list-icon action-warning"><Boxes size={18} /></span>
              <span><strong>Check {overview.lowStock.length} low-stock {overview.lowStock.length === 1 ? "product" : "products"}</strong><small>Decide what to restock before it runs out.</small></span>
              <ArrowRight size={18} />
            </Link>
          )}
          <Link href="/orders">
            <span className="list-icon"><ClipboardList size={18} /></span>
            <span><strong>Follow up on {overview.openOrders} open {overview.openOrders === 1 ? "order" : "orders"}</strong><small>Confirm payment, collection or delivery.</small></span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/expenses">
            <span className="list-icon"><ReceiptText size={18} /></span>
            <span><strong>Review where money went</strong><small>{topExpense ? `${topExpense.name} is the largest expense category.` : "Start recording expenses to see spending patterns."}</small></span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <div className="grid-main">
        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>Money in and money out</h2>
              <p>A six-month view of sales and expenses</p>
            </div>
            <Link className="badge" href="/reports">See report</Link>
          </div>
          <DashboardChart data={overview.monthly} />
        </section>

        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>Low stock</h2>
              <p>At or below the level you set</p>
            </div>
            <Link href="/inventory" className="badge badge-warning">Restock</Link>
          </div>
          <div className="list">
            {overview.lowStock.length === 0 && <p className="empty-copy">Nothing needs restocking right now.</p>}
            {overview.lowStock.slice(0, 4).map((item) => (
              <div className="list-row" key={item.id}>
                <span className="list-icon action-warning"><AlertTriangle size={18} /></span>
                <div className="list-body">
                  <p className="list-title">{item.name}</p>
                  <p className="list-meta">{item.stock} {item.unit} left · restock level {item.threshold}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card card-pad" style={{ marginTop: 16 }}>
        <div className="section-heading">
          <div>
            <h2>Recent activity</h2>
            <p>Your latest recorded sales and expenses</p>
          </div>
          <span className="badge badge-success">{overview.source === "mock" ? "Demo records" : "Up to date"}</span>
        </div>
        <div className="list">
          {overview.recentActivity.map((item) => {
            const Icon = item.kind === "sale" ? ShoppingBag : ReceiptText;
            return (
              <div className="list-row" key={`${item.kind}-${item.id}`}>
                <span className="list-icon"><Icon size={18} /></span>
                <div className="list-body">
                  <p className="list-title">{item.label}</p>
                  <p className="list-meta">{item.detail}</p>
                </div>
                <span className="list-value">
                  {item.kind === "expense" ? "−" : "+"}{formatMoney(item.value)}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
