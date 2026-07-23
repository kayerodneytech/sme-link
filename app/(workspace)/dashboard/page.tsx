import { DashboardChart } from "@/components/dashboard-chart";
import { PageHeading } from "@/components/page-heading";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  PackageCheck,
  Plus,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";

const lowStock = [
  { name: "Cooking oil 2L", detail: "3 remaining · threshold 5" },
  { name: "Maize meal 10kg", detail: "4 remaining · threshold 8" },
  { name: "Brown sugar 2kg", detail: "2 remaining · threshold 6" },
];

const activity = [
  {
    name: "Sale #SL-1048",
    detail: "Today, 10:42",
    value: "$186.00",
    icon: ShoppingBag,
  },
  {
    name: "Stock received",
    detail: "Cooking oil · 12 units",
    value: "+12",
    icon: Boxes,
  },
  {
    name: "Expense recorded",
    detail: "Transport · Yesterday",
    value: "$42.00",
    icon: ReceiptText,
  },
];

export default function DashboardPage() {
  return (
    <div className="content">
      <PageHeading
        action={
          <Link className="button button-primary" href="/sales/new">
            <Plus size={18} />
            Record sale
          </Link>
        }
        description="A clear view of your business activity for June 2026."
        eyebrow="Business overview"
        title="Good morning, Thabiso"
      />

      <section className="summary-grid" aria-label="Business summary">
        <article className="card summary-card">
          <p className="summary-label">Revenue</p>
          <p className="summary-value">$8,450</p>
          <p className="trend">
            <ArrowUpRight size={14} /> 17.4% from May
          </p>
        </article>
        <article className="card summary-card">
          <p className="summary-label">Expenses</p>
          <p className="summary-value">$4,120</p>
          <p className="trend">
            <ArrowUpRight size={14} /> Within monthly plan
          </p>
        </article>
        <article className="card summary-card">
          <p className="summary-label">Net cash flow</p>
          <p className="summary-value">$4,330</p>
          <p className="trend">
            <PackageCheck size={14} /> Positive this month
          </p>
        </article>
        <article className="card summary-card">
          <p className="summary-label">Low-stock items</p>
          <p className="summary-value">3</p>
          <p className="trend trend-warning">
            <AlertTriangle size={14} /> Needs attention
          </p>
        </article>
      </section>

      <div className="grid-main">
        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>Cash-flow movement</h2>
              <p>Revenue compared with expenses over six months</p>
            </div>
            <span className="badge">6 months</span>
          </div>
          <DashboardChart />
        </section>

        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <h2>Low stock</h2>
              <p>Products at or below their reorder level</p>
            </div>
            <Link href="/inventory" className="badge badge-warning">
              View all
            </Link>
          </div>
          <div className="list">
            {lowStock.map((item) => (
              <div className="list-row" key={item.name}>
                <span className="list-icon" style={{ background: "#FFF7E8", color: "#D97706" }}>
                  <AlertTriangle size={18} />
                </span>
                <div className="list-body">
                  <p className="list-title">{item.name}</p>
                  <p className="list-meta">{item.detail}</p>
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
            <p>The latest changes in your workspace</p>
          </div>
          <span className="badge badge-success">Live summary</span>
        </div>
        <div className="list">
          {activity.map((item) => {
            const Icon = item.icon;
            return (
              <div className="list-row" key={item.name}>
                <span className="list-icon">
                  <Icon size={18} />
                </span>
                <div className="list-body">
                  <p className="list-title">{item.name}</p>
                  <p className="list-meta">{item.detail}</p>
                </div>
                <span className="list-value">{item.value}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
