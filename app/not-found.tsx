import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="status-page">
      <div className="status-card">
        <span className="status-icon status-icon-muted" aria-hidden>
          <SearchX size={28} />
        </span>
        <p className="eyebrow">404</p>
        <h1>That page isn’t here</h1>
        <p className="page-copy">
          The address may be wrong, or the page may have moved. Head back to your
          dashboard to keep working.
        </p>
        <div className="status-actions">
          <Link className="button button-primary" href="/dashboard">
            <Home size={17} /> Return to dashboard
          </Link>
          <Link className="button button-secondary" href="/">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
