"use client";

import { SUPPORTED_CURRENCIES } from "@/lib/cash";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";

export function OnboardingForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currencies, setCurrencies] = useState<string[]>(["USD"]);
  const [primaryCurrency, setPrimaryCurrency] = useState("USD");
  const [cashOpenings, setCashOpenings] = useState<Record<string, string>>({
    USD: "",
  });

  const sortedCurrencies = useMemo(
    () =>
      SUPPORTED_CURRENCIES.filter((code) => currencies.includes(code)),
    [currencies],
  );

  function toggleCurrency(code: string) {
    setCurrencies((current) => {
      if (current.includes(code)) {
        if (current.length === 1) return current;
        const next = current.filter((item) => item !== code);
        setCashOpenings((openings) => {
          const copy = { ...openings };
          delete copy[code];
          return copy;
        });
        if (primaryCurrency === code) setPrimaryCurrency(next[0]);
        return next;
      }
      setCashOpenings((openings) => ({
        ...openings,
        [code]: openings[code] ?? "",
      }));
      return [...current, code];
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!hasSupabaseConfig()) {
      window.location.assign("/setup");
      return;
    }

    const form = new FormData(event.currentTarget);
    const openingCash = Number(form.get("openingCash") ?? "");
    if (!Number.isFinite(openingCash) || openingCash < 0) {
      setError(
        "Enter the starting money / cash in hand. Use 0 if you are starting with nothing.",
      );
      return;
    }

    const openings: Record<string, number> = {};
    for (const code of currencies) {
      const raw = cashOpenings[code] ?? "";
      if (raw.trim() === "") {
        openings[code] = code === primaryCurrency ? openingCash : 0;
        continue;
      }
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount < 0) {
        setError(`Enter a valid starting amount for ${code}, or leave it blank.`);
        return;
      }
      openings[code] = amount;
    }

    const supabase = createClient();
    setLoading(true);
    const { error: rpcError } = await supabase.rpc("create_business", {
      business_name: String(form.get("name") ?? ""),
      business_sector: String(form.get("sector") ?? ""),
      business_phone: String(form.get("phone") ?? ""),
      business_location: String(form.get("location") ?? ""),
      business_currency: primaryCurrency,
      business_currencies: currencies,
      business_opening_cash: openingCash,
      business_cash_openings: openings,
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
      <div className="field">
        <label htmlFor="onboarding-name">Business name</label>
        <input className="input" id="onboarding-name" name="name" required />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="onboarding-sector">Sector</label>
          <select className="select" id="onboarding-sector" name="sector">
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
            <option value="services">Services</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="hospitality">Hospitality</option>
            <option value="other">Other</option>
          </select>
          <p className="field-hint">This cannot be changed later, so choose carefully.</p>
        </div>
        <div className="field">
          <label htmlFor="onboarding-currency">Main reporting currency</label>
          <select
            className="select"
            id="onboarding-currency"
            onChange={(event) => setPrimaryCurrency(event.target.value)}
            value={primaryCurrency}
          >
            {sortedCurrencies.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </div>
        <fieldset className="field">
          <legend>Accepted currencies</legend>
          {SUPPORTED_CURRENCIES.map((code) => (
            <label key={code}>
              <input
                checked={currencies.includes(code)}
                onChange={() => toggleCurrency(code)}
                type="checkbox"
              />{" "}
              {code}
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="onboarding-phone">Business phone</label>
          <input className="input" id="onboarding-phone" name="phone" type="tel" />
        </div>
        <div className="field">
          <label htmlFor="onboarding-location">Location</label>
          <input
            className="input"
            id="onboarding-location"
            name="location"
            placeholder="Harare, Zimbabwe"
          />
        </div>
        <div className="field">
          <label htmlFor="onboarding-opening-cash">
            Starting money · {primaryCurrency}
          </label>
          <input
            className="input"
            id="onboarding-opening-cash"
            inputMode="decimal"
            min="0"
            name="openingCash"
            placeholder="e.g. 500"
            required
            step="0.01"
            type="number"
          />
          <p className="field-hint">
            Used as the main currency opening if you leave the optional fields blank.
          </p>
        </div>
      </div>
      {sortedCurrencies.length > 1 && (
        <div className="field">
          <label>Starting cash per currency (optional)</label>
          <p className="field-hint">
            Leave blank to use the main amount for {primaryCurrency} and 0 for others.
          </p>
          <div className="form-grid">
            {sortedCurrencies.map((code) => (
              <div className="field" key={code}>
                <label htmlFor={`onboarding-opening-${code}`}>{code}</label>
                <input
                  className="input"
                  id={`onboarding-opening-${code}`}
                  inputMode="decimal"
                  min="0"
                  onChange={(event) =>
                    setCashOpenings((current) => ({
                      ...current,
                      [code]: event.target.value,
                    }))
                  }
                  step="0.01"
                  type="number"
                  value={cashOpenings[code] ?? ""}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="form-message form-message-error">{error}</p>}
      <button
        className="button button-primary"
        disabled={loading}
        style={{ marginTop: 6 }}
        type="submit"
      >
        {loading ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
        Create workspace
      </button>
    </form>
  );
}
