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
  const expenseShare =
    sixMonthRevenue > 0 ? (sixMonthExpenses / sixMonthRevenue) * 100 : 0;

  return (
    <div className="content">
      <PageHeading
        action={<ExportReportButton data={overview.monthly} />}
        description="See what you made, what stock cost you, and what is left after expenses."
        eyebrow={overview.source === "mock" ? "Demo decision support" : "Decision support"}
        title="Business reports"
      />
      <section className="summary-grid">
        <article className="card summary-card">
          <p className="summary-label">Money from sales · this month</p>
          <p className="summary-value">{formatMoney(overview.revenue)}</p>
          <p className="trend">
            <TrendingUp size={14} /> What customers paid you
          </p>
        </article>
        <article className="card summary-card">
          <p className="summary-label">What that stock cost you</p>
          <p className="summary-value">{formatMoney(overview.costOfGoods)}</p>
          <p className="trend">Based on what you paid for each piece</p>
        </article>
        <article className="card summary-card">
          <p className="summary-label">Profit from sales</p>
          <p className="summary-value">{formatMoney(overview.salesProfit)}</p>
          <p className="trend">Sales minus stock cost</p>
        </article>
        <article className="card summary-card">
          <p className="summary-label">After other expenses</p>
          <p className="summary-value">{formatMoney(overview.estimatedTakeHome)}</p>
          <p className="trend">
            {overview.estimatedTakeHome >= 0
              ? "Estimated money left this month"
              : "Expenses are higher than sales profit"}
          </p>
        </article>
      </section>

      <section className="insight-grid">
        <article className="notice insight-card">
          <PackageCheck size={20} />
          <div>
            <strong>
              {overview.salesProfit >= 0
                ? `Sales left about ${formatMoney(overview.salesProfit)} after stock cost.`
                : "Stock is costing more than customers are paying."}
            </strong>
            <p>
              {overview.estimatedTakeHome >= 0
                ? `After other expenses, about ${formatMoney(overview.estimatedTakeHome)} remains.`
                : `Other expenses of ${formatMoney(overview.expenses)} are eating into that profit.`}
            </p>
          </div>
        </article>
        <article className="notice insight-card">
          <AlertTriangle size={20} />
          <div>
            <strong>
              {topExpense
                ? `${topExpense.name} is your biggest recorded cost.`
                : "No expense pattern yet."}
            </strong>
            <p>
              {topExpense
                ? `${formatMoney(topExpense.value)} was recorded in this group.`
                : "Add expenses as they happen to understand where money goes."}
            </p>
          </div>
        </article>
      </section>

      <div className="grid-main">
        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>Money in and money out</h2>
              <p>Compare completed sales with recorded expenses</p>
            </div>
            <span className="badge">Six months</span>
          </div>
          <CashFlowBars data={overview.monthly} />
          <p className="field-hint" style={{ marginTop: 12 }}>
            Six-month sales {formatMoney(sixMonthRevenue)} · expenses{" "}
            {formatMoney(sixMonthExpenses)} ({expenseShare.toFixed(1)}% of sales)
          </p>
        </section>
        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>Where money was spent</h2>
              <p>Largest recorded expense groups</p>
            </div>
          </div>
          <ExpensePie data={overview.expenseCategories} />
          <div className="list">
            {overview.expenseCategories.slice(0, 4).map((category) => (
              <div className="list-row" key={category.name}>
                <span className="list-title">{category.name}</span>
                <span className="list-value">{formatMoney(category.value)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card card-pad action-panel">
        <div className="section-heading">
          <div>
            <h2>Act on this report</h2>
            <p>Go straight to the records behind the numbers</p>
          </div>
        </div>
        <div className="action-list">
          <Link href="/expenses">
            <span>
              <strong>Review expenses</strong>
              <small>Check the costs included in this report.</small>
            </span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/inventory">
            <span>
              <strong>Check products and stock</strong>
              <small>Update what you pay and what you sell each piece for.</small>
            </span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/orders">
            <span>
              <strong>Follow up on open orders</strong>
              <small>Turn confirmed customer requests into sales.</small>
            </span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
