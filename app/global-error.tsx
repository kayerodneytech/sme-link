"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main className="status-page">
          <div className="status-card">
            <span className="status-icon status-icon-error" aria-hidden>
              <AlertTriangle size={28} />
            </span>
            <p className="eyebrow">System error</p>
            <h1>SMElink hit a serious problem</h1>
            <p className="page-copy">
              The app could not recover from this error. Reload the page to
              continue.
            </p>
            {error.digest ? (
              <p className="status-meta">Reference: {error.digest}</p>
            ) : null}
            <div className="status-actions">
              <button
                className="button button-primary"
                onClick={reset}
                type="button"
              >
                <RotateCcw size={17} /> Reload
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
