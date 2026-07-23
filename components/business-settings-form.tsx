"use client";

import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { sectorLabel } from "@/lib/sectors";
import { Check, LoaderCircle, Save } from "lucide-react";
import { useState } from "react";

type Business = {
  name?: string;
  sector?: string;
  phone?: string | null;
  location?: string | null;
  currency?: string;
  currencies?: string[];
  team_size?: string;
  sales_mode?: string;
  primary_needs?: string[];
  tracks_inventory?: boolean;
  vat_registered?: boolean;
  vat_rate?: number;
  opening_cash?: number;
} | null;

const needs = [
  ["sales", "Record sales"],
  ["inventory", "Manage stock"],
  ["orders", "Follow orders"],
  ["expenses", "Track expenses"],
  ["customers", "Keep customers"],
  ["reports", "Understand performance"],
];

export function BusinessSettingsForm({ business }: { business: Business }) {
  const [currencies, setCurrencies] = useState<string[]>(
    business?.currencies ?? ["USD"],
  );
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(
    business?.primary_needs ?? ["sales", "inventory", "expenses", "reports"],
  );
  const [primaryCurrency, setPrimaryCurrency] = useState(
    business?.currency ?? "USD",
  );
  const [vatRegistered, setVatRegistered] = useState(
    business?.vat_registered ?? false,
  );
  const [vatRate, setVatRate] = useState(String(business?.vat_rate ?? 15));
  const [openingCash, setOpeningCash] = useState(String(business?.opening_cash ?? 0));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function toggleCurrency(currency: string) {
    if (currencies.includes(currency)) {
      if (currencies.length === 1) return;
      const next = currencies.filter((item) => item !== currency);
      setCurrencies(next);
      if (primaryCurrency === currency) setPrimaryCurrency(next[0]);
    } else setCurrencies([...currencies, currency]);
  }

  function toggleNeed(need: string) {
    setSelectedNeeds((current) =>
      current.includes(need)
        ? current.filter((item) => item !== need)
        : [...current, need],
    );
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!selectedNeeds.length) {
      setMessage("Choose at least one area for the workspace.");
      return;
    }

    const parsedRate = Number(vatRate);
    if (
      vatRegistered &&
      (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100)
    ) {
      setMessage("Enter a VAT rate between 0 and 100.");
      return;
    }

    const parsedOpeningCash = Number(openingCash);
    if (!Number.isFinite(parsedOpeningCash) || parsedOpeningCash < 0) {
      setMessage("Enter a valid starting cash amount (0 or more).");
      return;
    }

    if (!hasSupabaseConfig()) {
      setMessage("Settings saved for this preview.");
      return;
    }

    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const businessId = await getCurrentBusinessId();
      const { error } = await createClient()
        .from("businesses")
        .update({
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? "") || null,
          location: String(form.get("location") ?? "") || null,
          currency: primaryCurrency,
          currencies,
          team_size: String(form.get("teamSize") ?? "just_me"),
          sales_mode: String(form.get("salesMode") ?? "walk_in"),
          primary_needs: selectedNeeds,
          tracks_inventory: form.get("tracksInventory") === "on",
          vat_registered: vatRegistered,
          vat_rate: vatRegistered ? parsedRate : Number(business?.vat_rate ?? 15),
          opening_cash: parsedOpeningCash,
        })
        .eq("id", businessId);
      if (error) throw error;
      setMessage("Business settings saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Settings could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={save}>
      <section className="card card-pad">
        <div className="section-heading">
          <div>
            <h2>Business details</h2>
            <p>Used on the workspace and customer receipts.</p>
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="business-name">Business name</label>
            <input
              className="input"
              defaultValue={business?.name ?? "Thabiso Foods"}
              id="business-name"
              name="name"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="business-sector">Business type</label>
            <input
              className="input"
              disabled
              id="business-sector"
              readOnly
              value={sectorLabel(business?.sector)}
            />
            <p className="field-hint">
              Chosen during account setup and cannot be changed later.
            </p>
          </div>
          <div className="field">
            <label htmlFor="business-phone">Phone</label>
            <input
              className="input"
              defaultValue={business?.phone ?? ""}
              id="business-phone"
              name="phone"
              type="tel"
            />
          </div>
          <div className="field">
            <label htmlFor="business-location">Town or location</label>
            <input
              className="input"
              defaultValue={business?.location ?? ""}
              id="business-location"
              name="location"
            />
          </div>
          <div className="field">
            <label htmlFor="opening-cash">Starting money (cash in hand)</label>
            <input
              className="input"
              id="opening-cash"
              inputMode="decimal"
              min="0"
              onChange={(event) => setOpeningCash(event.target.value)}
              step="0.01"
              type="number"
              value={openingCash}
            />
            <p className="field-hint">
              Used to calculate cash in hand. Sales add to it. Expenses and stock purchases come out of it.
            </p>
          </div>
        </div>
      </section>

      <section className="card card-pad">
        <div className="section-heading">
          <div>
            <h2>How the business works</h2>
            <p>These choices control shortcuts, setup guidance and visible tools.</p>
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="team-size">Team size</label>
            <select
              className="select"
              defaultValue={business?.team_size ?? "just_me"}
              id="team-size"
              name="teamSize"
            >
              <option value="just_me">Just me</option>
              <option value="2_5">2–5 people</option>
              <option value="6_20">6–20 people</option>
              <option value="more_than_20">More than 20</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="sales-mode">How customers buy</label>
            <select
              className="select"
              defaultValue={business?.sales_mode ?? "walk_in"}
              id="sales-mode"
              name="salesMode"
            >
              <option value="walk_in">Mostly walk-in sales</option>
              <option value="orders">Mostly customer orders</option>
              <option value="both">Walk-ins and orders</option>
            </select>
          </div>
        </div>
        <label className="check-row settings-check">
          <input
            defaultChecked={business?.tracks_inventory ?? true}
            name="tracksInventory"
            type="checkbox"
          />
          <span>
            <strong>Track products and stock levels</strong>
            <small>
              Enables inventory tools, low-stock warnings and retail POS.
            </small>
          </span>
        </label>
      </section>

      <section className="card card-pad">
        <div className="section-heading">
          <div>
            <h2>VAT on receipts</h2>
            <p>
              Turn this on only if the business is VAT-registered. Receipts always
              show a VAT line.
            </p>
          </div>
        </div>
        <label className="check-row settings-check">
          <input
            checked={vatRegistered}
            onChange={(event) => setVatRegistered(event.target.checked)}
            type="checkbox"
          />
          <span>
            <strong>This business charges VAT</strong>
            <small>
              Product prices are treated as VAT-inclusive when this is on.
            </small>
          </span>
        </label>
        <div className="field settings-vat-rate">
          <label htmlFor="vat-rate">VAT rate (%)</label>
          <input
            className="input"
            disabled={!vatRegistered}
            id="vat-rate"
            inputMode="decimal"
            min="0"
            max="100"
            onChange={(event) => setVatRate(event.target.value)}
            step="0.01"
            type="number"
            value={vatRate}
          />
          {!vatRegistered && (
            <p className="field-hint">
              VAT still prints on receipts as {formatRate(0)} while this is off.
            </p>
          )}
        </div>
      </section>

      <section className="card card-pad">
        <div className="section-heading">
          <div>
            <h2>Workspace tools</h2>
            <p>Choose what should be easy to reach in daily work.</p>
          </div>
        </div>
        <div className="need-grid">
          {needs.map(([value, label]) => {
            const active = selectedNeeds.includes(value);
            return (
              <button
                aria-pressed={active}
                className="need-option"
                data-active={active}
                key={value}
                onClick={() => toggleNeed(value)}
                type="button"
              >
                <span>{label}</span>
                {active && <Check size={15} />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card card-pad">
        <div className="section-heading">
          <div>
            <h2>Currencies</h2>
            <p>Accept several currencies while keeping one currency for reports.</p>
          </div>
        </div>
        <div className="need-grid currency-grid">
          {["USD", "ZIG", "ZAR"].map((currency) => {
            const active = currencies.includes(currency);
            return (
              <button
                aria-pressed={active}
                className="need-option"
                data-active={active}
                key={currency}
                onClick={() => toggleCurrency(currency)}
                type="button"
              >
                <span>{currency}</span>
                {active && <Check size={15} />}
              </button>
            );
          })}
        </div>
        <div className="field settings-primary-currency">
          <label htmlFor="primary-currency">Main reporting currency</label>
          <select
            className="select"
            id="primary-currency"
            onChange={(event) => setPrimaryCurrency(event.target.value)}
            value={primaryCurrency}
          >
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </div>
      </section>

      {message && (
        <p
          className={
            message.includes("saved")
              ? "form-message form-message-success"
              : "form-message form-message-error"
          }
        >
          {message}
        </p>
      )}
      <div>
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function formatRate(value: number) {
  return `${value.toFixed(2)}%`;
}
