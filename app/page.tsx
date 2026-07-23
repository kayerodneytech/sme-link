import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  CircleDollarSign,
  ClipboardList,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: CircleDollarSign,
    title: "Know where the money goes",
    copy: "Record sales and expenses as they happen, then see revenue and cash flow without rebuilding a spreadsheet.",
  },
  {
    icon: Boxes,
    title: "Keep stock under control",
    copy: "Follow every stock movement and catch low quantities before they interrupt a customer order.",
  },
  {
    icon: ClipboardList,
    title: "Turn orders into sales",
    copy: "Keep customer requests organised from the first order through to payment and stock deduction.",
  },
  {
    icon: BarChart3,
    title: "Make practical decisions",
    copy: "Use focused reports for income, costs and product performance instead of decorative dashboards.",
  },
];

const steps = [
  {
    number: "01",
    title: "Set up the business",
    copy: "Create a secure workspace with the business name, sector and reporting currency.",
  },
  {
    number: "02",
    title: "Record daily activity",
    copy: "Add products, stock, customers, orders, sales and expenses from a phone or computer.",
  },
  {
    number: "03",
    title: "Review and respond",
    copy: "Monitor low stock, open orders and cash flow while there is still time to act.",
  },
];

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link className="landing-brand" href="/">
            <span className="landing-brand-mark">
              <PackageCheck size={20} />
            </span>
            <span>SMElink</span>
          </Link>
          <nav className="landing-links" aria-label="Landing page">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#purpose">Purpose</a>
          </nav>
          <div className="landing-actions">
            <Link className="landing-sign-in" href="/login">
              Sign in
            </Link>
            <Link className="button button-primary" href="/login">
              Get started
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-kicker">
              <Sparkles size={15} />
              Built for the work behind a growing SME
            </div>
            <h1>Run the business with clarity, not guesswork.</h1>
            <p>
              SMElink brings sales, expenses, orders, customers and stock into
              one calm workspace—so everyday records become useful business
              decisions.
            </p>
            <div className="landing-hero-actions">
              <Link className="button button-primary landing-main-cta" href="/login">
                Create your workspace
                <ArrowRight size={18} />
              </Link>
              <a className="button button-secondary" href="#features">
                Explore the system
              </a>
            </div>
            <div className="landing-trust">
              <span>
                <Check size={15} />
                Mobile friendly
              </span>
              <span>
                <Check size={15} />
                Secure business records
              </span>
              <span>
                <Check size={15} />
                Clear, focused reports
              </span>
            </div>
          </div>

          <div className="landing-product" aria-label="SMElink dashboard preview">
            <div className="landing-product-top">
              <div>
                <span className="landing-product-label">Business overview</span>
                <strong>Good morning, Tariro</strong>
              </div>
              <span className="landing-avatar">TF</span>
            </div>
            <div className="landing-metrics">
              <article>
                <span>Revenue</span>
                <strong>$8,450</strong>
                <small>↑ 17.4% this month</small>
              </article>
              <article>
                <span>Net cash flow</span>
                <strong>$4,330</strong>
                <small>Positive this month</small>
              </article>
              <article>
                <span>Low stock</span>
                <strong>3 items</strong>
                <small className="landing-warning">Needs attention</small>
              </article>
            </div>
            <div className="landing-product-lower">
              <article className="landing-mini-chart">
                <div className="landing-preview-heading">
                  <div>
                    <strong>Cash-flow movement</strong>
                    <span>Last six months</span>
                  </div>
                  <span className="badge badge-success">Healthy</span>
                </div>
                <div className="landing-chart-bars" aria-hidden="true">
                  {[38, 51, 45, 68, 74, 88].map((height, index) => (
                    <span key={height} style={{ height: `${height}%` }}>
                      <i style={{ height: `${Math.max(18, height - 28)}%` }} />
                      <b>{["Jan", "Feb", "Mar", "Apr", "May", "Jun"][index]}</b>
                    </span>
                  ))}
                </div>
              </article>
              <article className="landing-stock-card">
                <div className="landing-preview-heading">
                  <div>
                    <strong>Stock watch</strong>
                    <span>Reorder soon</span>
                  </div>
                </div>
                {[
                  ["Cooking oil 2L", "3 left"],
                  ["Maize meal 10kg", "4 left"],
                  ["Brown sugar 2kg", "2 left"],
                ].map(([name, quantity]) => (
                  <div className="landing-stock-row" key={name}>
                    <span><Boxes size={15} /></span>
                    <p>{name}</p>
                    <strong>{quantity}</strong>
                  </div>
                ))}
              </article>
            </div>
            <span className="landing-mobile-chip">
              <Smartphone size={16} />
              Works beautifully on mobile
            </span>
          </div>
        </div>
      </section>

      <section className="landing-proof">
        <p>One workspace for the records that keep an SME moving</p>
        <div>
          <span><ReceiptText size={19} /> Expenses</span>
          <span><CircleDollarSign size={19} /> Sales</span>
          <span><Boxes size={19} /> Inventory</span>
          <span><Users size={19} /> Customers</span>
          <span><ClipboardList size={19} /> Orders</span>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="landing-section-intro">
          <p className="eyebrow">Practical by design</p>
          <h2>Everything needed for a clear daily picture.</h2>
          <p>
            The system stays focused on the activities identified in the SME
            resilience study—without becoming accounting software or an
            oversized enterprise platform.
          </p>
        </div>
        <div className="landing-feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="landing-feature" key={feature.title}>
                <span className="landing-feature-icon"><Icon size={21} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-process" id="how-it-works">
        <div className="landing-process-inner">
          <div className="landing-process-copy">
            <p className="eyebrow">Simple working rhythm</p>
            <h2>Useful from the first day.</h2>
            <p>
              SMElink follows the natural flow of a small business. Setup is
              short, data entry is direct, and reports are built from the
              records already captured.
            </p>
            <Link className="button button-primary" href="/login">
              Start with your business
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="landing-steps">
            {steps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-purpose" id="purpose">
        <div className="landing-purpose-card">
          <div>
            <p className="eyebrow">Why SMElink exists</p>
            <h2>Designed from evidence, built for resilience.</h2>
            <p>
              The COVID-19 study found that Zimbabwean SMEs were constrained by
              disrupted operations, weak cash-flow visibility, limited digital
              readiness and difficult access to timely information. SMElink
              turns those lessons into a practical system for stronger everyday
              management.
            </p>
          </div>
          <div className="landing-purpose-points">
            <span><ShieldCheck size={20} /> Business records stay separated and protected</span>
            <span><Smartphone size={20} /> Core work remains usable on a phone</span>
            <span><BarChart3 size={20} /> Reports connect directly to saved transactions</span>
          </div>
        </div>
      </section>

      <section className="landing-final-cta">
        <div>
          <p className="eyebrow">Ready when the business is</p>
          <h2>Bring the day-to-day work into one clear view.</h2>
          <p>Start with products, record the first sale, and build a more reliable picture of the business over time.</p>
          <Link className="button landing-light-button" href="/login">
            Create your SMElink workspace
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand" href="/">
          <span className="landing-brand-mark"><PackageCheck size={20} /></span>
          <span>SMElink</span>
        </Link>
        <p>Practical operations support for growing SMEs.</p>
        <span>University project · Zimbabwe</span>
      </footer>
    </main>
  );
}
