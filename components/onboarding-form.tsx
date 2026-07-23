"use client";

import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function OnboardingForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!hasSupabaseConfig()) {
      window.location.assign("/setup");
      return;
    }

    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    setLoading(true);
    const { error: rpcError } = await supabase.rpc("create_business", {
      business_name: String(form.get("name") ?? ""),
      business_sector: String(form.get("sector") ?? ""),
      business_phone: String(form.get("phone") ?? ""),
      business_location: String(form.get("location") ?? ""),
      business_currency: String(form.get("currency") ?? "USD"),
      business_currencies: form.getAll("currencies").map(String),
    });
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    window.location.assign("/setup");
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <div className="field"><label htmlFor="onboarding-name">Business name</label><input className="input" id="onboarding-name" name="name" required /></div>
      <div className="form-grid">
        <div className="field"><label htmlFor="onboarding-sector">Sector</label><select className="select" id="onboarding-sector" name="sector"><option value="retail">Retail</option><option value="wholesale">Wholesale</option><option value="services">Services</option><option value="manufacturing">Manufacturing</option><option value="hospitality">Hospitality</option><option value="other">Other</option></select></div>
        <div className="field"><label htmlFor="onboarding-currency">Main reporting currency</label><select className="select" id="onboarding-currency" name="currency"><option>USD</option><option>ZIG</option><option>ZAR</option></select></div>
        <fieldset className="field"><legend>Accepted currencies</legend><label><input defaultChecked name="currencies" type="checkbox" value="USD" /> USD</label><label><input name="currencies" type="checkbox" value="ZIG" /> ZIG</label><label><input name="currencies" type="checkbox" value="ZAR" /> ZAR</label></fieldset>
        <div className="field"><label htmlFor="onboarding-phone">Business phone</label><input className="input" id="onboarding-phone" name="phone" type="tel" /></div>
        <div className="field"><label htmlFor="onboarding-location">Location</label><input className="input" id="onboarding-location" name="location" placeholder="Harare, Zimbabwe" /></div>
      </div>
      {error && <p className="form-message form-message-error">{error}</p>}
      <button className="button button-primary" disabled={loading} style={{ marginTop: 6 }} type="submit">
        {loading ? <LoaderCircle size={18} /> : <ArrowRight size={18} />}
        Create workspace
      </button>
    </form>
  );
}
