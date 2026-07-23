import { AuthForm } from "@/components/auth-form";
import { BarChart3, Boxes, PackageCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div>
          <div className="brand" style={{ margin: 0 }}>
            <span className="brand-mark"><PackageCheck size={21} /></span>
            <span><span className="brand-name">SMElink</span><span className="brand-subtitle">Operations workspace</span></span>
          </div>
        </div>
        <div style={{ maxWidth: 520, position: "relative", zIndex: 1 }}>
          <p className="eyebrow" style={{ color: "#6ED0C6" }}>Built for practical decisions</p>
          <h1 style={{ color: "white", fontSize: "clamp(2.2rem, 4vw, 4rem)" }}>Keep the whole business in view.</h1>
          <p style={{ color: "#B8C7D3", fontSize: "1.05rem", lineHeight: 1.7 }}>Sales, expenses, orders and stock work together in one clear mobile-friendly workspace.</p>
          <div style={{ display: "flex", gap: 18, marginTop: 30 }}>
            <span className="badge" style={{ background: "rgba(255,255,255,.1)", color: "white" }}><Boxes size={14} /> Stock control</span>
            <span className="badge" style={{ background: "rgba(255,255,255,.1)", color: "white" }}><BarChart3 size={14} /> Useful reports</span>
            <span className="badge" style={{ background: "rgba(255,255,255,.1)", color: "white" }}><ShieldCheck size={14} /> Private records</span>
          </div>
        </div>
        <p style={{ color: "#7F95A7", fontSize: ".74rem", margin: 0 }}>Designed from research into SME resilience in Zimbabwe.</p>
      </section>
      <section className="auth-content">
        <div className="auth-card">
          <Link className="auth-logo" href="/"><span className="auth-logo-mark"><PackageCheck size={21} /></span> SMElink</Link>
          <p className="eyebrow">Welcome</p>
          <h1>{`Run today's business with confidence.`}</h1>
          <p className="page-copy" style={{ marginBottom: 26 }}>Sign in to your workspace or create an account for your business.</p>
          <AuthForm />
        </div>
      </section>
    </main>
  );
}
