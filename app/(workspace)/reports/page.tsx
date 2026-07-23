import { ExportReportButton } from "@/components/export-report-button";
import { PageHeading } from "@/components/page-heading";
import { CashFlowBars, ExpensePie } from "@/components/report-charts";
import { getBusinessOverview } from "@/lib/business-overview";
import { formatMoney } from "@/lib/format";
import { AlertTriangle, ArrowRight, PackageCheck, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function ReportsPage() {
  const overview = await getBusinessOverview();
  const sixMonthRevenue = overview.monthly.reduce((sum, month) => sum + month.revenue, 0);
  const sixMonthExpenses = overview.monthly.reduce((sum, month) => sum + month.expenses, 0);
  const topExpense = overview.expenseCategories[0];
  const expenseShare = sixMonthRevenue > 0
    ? (sixMonthExpenses / sixMonthRevenue) * 100
    : 0;

  return (
    <div className="content">
      <PageHeading
        action={<ExportReportButton data={overview.monthly} />}
        description="See what the numbers mean and what you can do next."
        eyebrow={overview.source === "mock" ? "Demo decision support" : "Decision support"}
        title="Business reports"
      />
      <section className="summary-grid">
        <article className="card summary-card"><p className="summary-label">Money in · six months</p><p className="summary-value">{formatMoney(sixMonthRevenue)}</p><p className="trend"><TrendingUp size={14} /> From completed sales</p></article>
        <article className="card summary-card"><p className="summary-label">Money out · six months</p><p className="summary-value">{formatMoney(sixMonthExpenses)}</p><p className="trend">{expenseShare.toFixed(1)}% of money in</p></article>
        <article className="card summary-card"><p className="summary-label">Money left</p><p className="summary-value">{formatMoney(sixMonthRevenue - sixMonthExpenses)}</p><p className="trend">After recorded expenses</p></article>
        <article className="card summary-card"><p className="summary-label">Best-selling product</p><p className="summary-value" style={{ fontSize: "1.2rem" }}>{overview.bestSeller?.name ?? "Not enough sales yet"}</p><p className="trend">{overview.bestSeller ? `${overview.bestSeller.quantity} sold` : "Record sales to see this"}</p></article>
      </section>

      <section className="insight-grid">
        <article className="notice insight-card">
          <PackageCheck size={20} />
          <div>
            <strong>{overview.netCashFlow >= 0 ? "The business kept more money than it spent this month." : "The business spent more than it made this month."}</strong>
            <p>{overview.netCashFlow >= 0 ? `${formatMoney(overview.netCashFlow)} remained after recorded expenses.` : `The shortfall is ${formatMoney(Math.abs(overview.netCashFlow))}. Review spending and unpaid orders.`}</p>
          </div>
        </article>
        <article className="notice insight-card">
          <AlertTriangle size={20} />
          <div>
            <strong>{topExpense ? `${topExpense.name} is your biggest recorded cost.` : "No expense pattern yet."}</strong>
            <p>{topExpense ? `${formatMoney(topExpense.value)} was recorded in this category.` : "Add expenses as they happen to understand where money goes."}</p>
          </div>
        </article>
      </section>

      <div className="grid-main">
        <section className="card card-pad"><div className="section-heading"><div><h2>Money in and money out</h2><p>Compare completed sales with recorded expenses</p></div><span className="badge">Six months</span></div><CashFlowBars data={overview.monthly} /></section>
        <section className="card card-pad"><div className="section-heading"><div><h2>Where money was spent</h2><p>Largest recorded expense categories</p></div></div><ExpensePie data={overview.expenseCategories} /><div className="list">{overview.expenseCategories.slice(0, 4).map((category) => <div className="list-row" key={category.name}><span className="list-title">{category.name}</span><span className="list-value">{formatMoney(category.value)}</span></div>)}</div></section>
      </div>

      <section className="card card-pad action-panel">
        <div className="section-heading"><div><h2>Act on this report</h2><p>Go straight to the records behind the numbers</p></div></div>
        <div className="action-list">
          <Link href="/expenses"><span><strong>Review expenses</strong><small>Check the costs included in this report.</small></span><ArrowRight size={18} /></Link>
          <Link href="/inventory"><span><strong>Plan restocking</strong><small>Review low stock before spending money.</small></span><ArrowRight size={18} /></Link>
          <Link href="/orders"><span><strong>Follow up on open orders</strong><small>Turn confirmed customer requests into sales.</small></span><ArrowRight size={18} /></Link>
        </div>
      </section>
    </div>
  );
}
