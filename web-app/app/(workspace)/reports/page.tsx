import { PageHeading } from "@/components/page-heading";
import { CashFlowBars, ExpensePie } from "@/components/report-charts";
import { Download, TrendingUp } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="content">
      <PageHeading action={<button className="button button-secondary"><Download size={17} /> Export CSV</button>} description="Use recorded transactions to understand financial and stock performance." eyebrow="Decision support" title="Reports" />
      <section className="summary-grid">
        <article className="card summary-card"><p className="summary-label">Six-month revenue</p><p className="summary-value">$36,550</p><p className="trend"><TrendingUp size={14} /> 14.2% average growth</p></article>
        <article className="card summary-card"><p className="summary-label">Six-month expenses</p><p className="summary-value">$20,370</p><p className="trend">55.7% of revenue</p></article>
        <article className="card summary-card"><p className="summary-label">Net cash flow</p><p className="summary-value">$16,180</p><p className="trend">Positive period</p></article>
        <article className="card summary-card"><p className="summary-label">Best seller</p><p className="summary-value" style={{ fontSize: "1.2rem" }}>Maize meal 10kg</p><p className="trend">126 units</p></article>
      </section>
      <div className="grid-main">
        <section className="card card-pad"><div className="section-heading"><div><h2>Revenue and expenses</h2><p>Monthly comparison for the last six months</p></div><span className="badge">Jan–Jun</span></div><CashFlowBars /></section>
        <section className="card card-pad"><div className="section-heading"><div><h2>Expense categories</h2><p>Where business money was spent in June</p></div></div><ExpensePie /><div className="list"><div className="list-row"><span className="list-title">Stock purchases</span><span className="list-value">$2,140</span></div><div className="list-row"><span className="list-title">Rent</span><span className="list-value">$650</span></div><div className="list-row"><span className="list-title">Transport</span><span className="list-value">$540</span></div></div></section>
      </div>
    </div>
  );
}
