"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { logAppError } from "@/lib/log-app-error";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    void logAppError({
      source: "ui.workspace_error",
      message: error.message || "Unknown workspace error",
      details: {
        digest: error.digest ?? null,
        name: error.name,
      },
    });
  }, [error]);

  return (
    <div className="content">
      <main className="status-page status-page-inset">
        <div className="status-card">
          <span className="status-icon status-icon-error" aria-hidden>
            <AlertTriangle size={28} />
          </span>
          <p className="eyebrow">Workspace error</p>
          <h1>This screen couldn’t load</h1>
          <p className="page-copy">
            Something went wrong while loading your workspace. Try again, or go
            back to the dashboard.
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
    </div>
  );
}
