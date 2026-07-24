"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="status-page">
      <div className="status-card">
        <span className="status-icon status-icon-error" aria-hidden>
          <AlertTriangle size={28} />
        </span>
        <p className="eyebrow">Something went wrong</p>
        <h1>This page couldn’t load</h1>
        <p className="page-copy">
          A temporary problem stopped SMElink from showing this screen. Try
          again — if it keeps happening, return to the dashboard.
        </p>
        {error.digest ? (
          <p className="status-meta">Reference: {error.digest}</p>
        ) : null}
        <div className="status-actions">
          <button className="button button-primary" onClick={reset} type="button">
            <RotateCcw size={17} /> Try again
          </button>
          <Link className="button button-secondary" href="/dashboard">
            <Home size={17} /> Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
