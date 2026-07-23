import Link from "next/link";

export default function NotFound() {
  return (
    <main className="content" style={{ maxWidth: 620, paddingTop: 90, textAlign: "center" }}>
      <p className="eyebrow">404</p>
      <h1>That page is not available</h1>
      <p className="page-copy" style={{ margin: "0 auto 24px" }}>
        The address may be incorrect, or the page may have moved.
      </p>
      <Link className="button button-primary" href="/dashboard">
        Return to dashboard
      </Link>
    </main>
  );
}
