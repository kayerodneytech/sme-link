import { OnboardingForm } from "@/components/onboarding-form";
import { PackageCheck } from "lucide-react";
import Link from "next/link";

export default function OnboardingPage() {
  return (
    <main className="auth-page" style={{ gridTemplateColumns: "1fr" }}>
      <section className="auth-content">
        <div className="card auth-card" style={{ maxWidth: 650 }}>
          <Link className="auth-logo" href="/"><span className="auth-logo-mark"><PackageCheck size={21} /></span> SMElink</Link>
          <p className="eyebrow">First step</p>
          <h1>Set up your business workspace</h1>
          <p className="page-copy" style={{ marginBottom: 28 }}>These details are used across the dashboard and reports. They can be changed later.</p>
          <OnboardingForm />
        </div>
      </section>
    </main>
  );
}
