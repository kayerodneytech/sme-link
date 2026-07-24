"use client";

import {
  isValidCurrencyCode,
  MAX_CURRENCIES,
  normalizeCurrencyCode,
  SUPPORTED_CURRENCIES,
} from "@/lib/cash";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";
import { sectorLabel } from "@/lib/sectors";
import { Check, LoaderCircle, Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [cashOpenings, setCashOpenings] = useState<Record<string, string>>(
    () => {
      const seed: Record<string, string> = {};
      for (const code of business?.currencies ?? ["USD"]) {
        seed[code] =
          code === (business?.currency ?? "USD")
            ? String(business?.opening_cash ?? 0)
            : "0";
      }
      return seed;
    },
  );
  const [lockedCurrencies, setLockedCurrencies] = useState<string[]>([]);
  const [customCurrency, setCustomCurrency] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    void (async () => {
      try {
        const businessId = await getCurrentBusinessId();
        const supabase = createClient();
        const [{ data: accounts }, { data: sales }, { data: expenses }] =
          await Promise.all([
            supabase
              .from("business_cash_accounts")
              .select("currency, opening_balance")
              .eq("business_id", businessId),
            supabase
              .from("sales")
              .select("currency")
              .eq("business_id", businessId),
            supabase
              .from("expenses")
              .select("currency")
              .eq("business_id", businessId),
          ]);

        if (accounts?.length) {
          const next: Record<string, string> = {};
          for (const account of accounts) {
            next[account.currency] = String(account.opening_balance ?? 0);
          }
          setCashOpenings((current) => ({ ...current, ...next }));
        }

        const used = new Set<string>();
        for (const sale of sales ?? []) {
          if (sale.currency) used.add(sale.currency);
        }
        for (const expense of expenses ?? []) {
          if (expense.currency) used.add(expense.currency);
        }
        for (const account of accounts ?? []) {
          if (Number(account.opening_balance) > 0) used.add(account.currency);
        }
        setLockedCurrencies([...used]);
      } catch {
        // Settings still work if cash-account tables are not migrated yet.
      }
    })();
  }, []);

  function toggleCurrency(currency: string) {
    if (currencies.includes(currency)) {
      if (currencies.length === 1) return;
      if (lockedCurrencies.includes(currency)) {
        setMessage(
          `${currency} cannot be turned off because it already has a balance or transactions.`,
        );
        return;
      }
      const next = currencies.filter((item) => item !== currency);
      setCurrencies(next);
      setCashOpenings((current) => {
        const copy = { ...current };
        delete copy[currency];
        return copy;
      });
      if (primaryCurrency === currency) setPrimaryCurrency(next[0]);
    } else {
      if (currencies.length >= MAX_CURRENCIES) {
        setMessage(`You can accept at most ${MAX_CURRENCIES} currencies.`);
        return;
      }
      setCurrencies([...currencies, currency]);
      setCashOpenings((current) => ({
        ...current,
        [currency]: current[currency] ?? "0",
      }));
    }
  }

  function addCustomCurrency() {
    const code = normalizeCurrencyCode(customCurrency);
    if (!isValidCurrencyCode(code)) {
      setMessage("Enter a valid 3-letter currency code (e.g. EUR, GBP, BWP).");
      return;
    }
    if (currencies.includes(code)) {
      setMessage(`${code} is already enabled.`);
      return;
    }
    if (currencies.length >= MAX_CURRENCIES) {
      setMessage(`You can accept at most ${MAX_CURRENCIES} currencies.`);
      return;
    }
    setCurrencies([...currencies, code]);
    setCashOpenings((current) => ({
      ...current,
      [code]: current[code] ?? "0",
    }));
    setCustomCurrency("");
    setMessage(`${code} added. Save changes to keep it.`);
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

    for (const code of currencies) {
      const amount = Number(cashOpenings[code] ?? "0");
      if (!Number.isFinite(amount) || amount < 0) {
        setMessage(`Enter a valid starting cash amount for ${code}.`);
        return;
      }
    }

    const removedLocked = (business?.currencies ?? []).filter(
      (code) => !currencies.includes(code) && lockedCurrencies.includes(code),
    );
    if (removedLocked.length) {
      setMessage(
        `${removedLocked.join(", ")} cannot be turned off because of existing balance or transactions.`,
      );
      return;
    }

    if (!hasSupabaseConfig()) {
      setMessage("Settings saved for this preview.");
      return;
    }

    setSaving(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (name.length < 2) {
      setMessage("Business name must be at least 2 characters.");
      setSaving(false);
      return;
    }

    const ensuredCurrencies = currencies.includes(primaryCurrency)
      ? currencies
      : [...currencies, primaryCurrency];
    const primaryOpening = Number(
      cashOpenings[primaryCurrency] ?? business?.opening_cash ?? 0,
    );

    try {
      const businessId = await getCurrentBusinessId();
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        name,
        phone: String(form.get("phone") ?? "").trim() || null,
        location: String(form.get("location") ?? "").trim() || null,
        currency: primaryCurrency,
        currencies: ensuredCurrencies,
        team_size: String(form.get("teamSize") ?? "just_me"),
        sales_mode: String(form.get("salesMode") ?? "walk_in"),
        primary_needs: selectedNeeds.filter((need) => need !== "orders"),
        tracks_inventory: form.get("tracksInventory") === "on",
      };

      if (business && Object.prototype.hasOwnProperty.call(business, "vat_registered")) {
        payload.vat_registered = vatRegistered;
        payload.vat_rate = vatRegistered
          ? parsedRate
          : Number(business.vat_rate ?? 15);
      }
      if (business && Object.prototype.hasOwnProperty.call(business, "opening_cash")) {
        payload.opening_cash = primaryOpening;
      }

      const { error } = await supabase
        .from("businesses")
        .update(payload)
        .eq("id", businessId);
      if (error) throw error;

      // Keep per-currency cash accounts in sync with enabled currencies.
      const accountRows = ensuredCurrencies.map((code) => ({
        business_id: businessId,
        currency: code,
        opening_balance: Number(cashOpenings[code] ?? 0),
        updated_at: new Date().toISOString(),
      }));
      const { error: upsertError } = await supabase
        .from("business_cash_accounts")
        .upsert(accountRows, { onConflict: "business_id,currency" });
      if (upsertError) {
        if (/business_cash_accounts|schema cache/i.test(upsertError.message)) {
          setMessage(
            "Basic settings saved. Run supabase/migrations/0008_multi_currency_cash.sql in Supabase to store separate currency balances.",
          );
          return;
        }
        throw upsertError;
      }

      const removable = (business?.currencies ?? []).filter(
        (code) =>
          !ensuredCurrencies.includes(code) &&
          !lockedCurrencies.includes(code),
      );
      if (removable.length) {
        await supabase
          .from("business_cash_accounts")
          .delete()
          .eq("business_id", businessId)
          .in("currency", removable);
      }

      setMessage("Business settings saved.");
    } catch (error) {
      setMessage(supabaseErrorMessage(error));
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
              defaultValue={
                business?.sales_mode === "orders" || business?.sales_mode === "both"
                  ? "both"
                  : business?.sales_mode ?? "walk_in"
              }
              id="sales-mode"
              name="salesMode"
            >
              <option value="walk_in">Mostly walk-in sales</option>
              <option value="both">Walk-ins and regular customers</option>
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
              Turn this on for shops that sell physical stock. Leave it off for
              service businesses — you’ll manage services instead of products.
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
            <h2>Currencies & cash</h2>
            <p>
              Accept up to {MAX_CURRENCIES} currencies. Each is a separate cash
              account. On POS, prices convert from your main currency using live
              exchange rates.
            </p>
          </div>
        </div>
        <div className="need-grid currency-grid">
          {[
            ...SUPPORTED_CURRENCIES,
            ...currencies.filter(
              (code) =>
                !(SUPPORTED_CURRENCIES as readonly string[]).includes(code),
            ),
          ].map((currency) => {
            const active = currencies.includes(currency);
            const locked = lockedCurrencies.includes(currency);
            return (
              <button
                aria-pressed={active}
                className="need-option"
                data-active={active}
                key={currency}
                onClick={() => toggleCurrency(currency)}
                title={
                  locked
                    ? "Cannot turn off: this currency already has a balance or transactions"
                    : undefined
                }
                type="button"
              >
                <span>
                  {currency}
                  {locked ? " · in use" : ""}
                </span>
                {active && <Check size={15} />}
              </button>
            );
          })}
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="custom-currency">Add another currency</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              id="custom-currency"
              maxLength={3}
              onChange={(event) =>
                setCustomCurrency(event.target.value.toUpperCase())
              }
              placeholder="e.g. EUR"
              value={customCurrency}
            />
            <button
              className="button button-secondary"
              disabled={currencies.length >= MAX_CURRENCIES}
              onClick={addCustomCurrency}
              type="button"
            >
              <Plus size={16} /> Add
            </button>
          </div>
          <p className="field-hint">
            Use a standard 3-letter code. Maximum {MAX_CURRENCIES} currencies.
            Live rates come from open.er-api.com (ZiG uses the ZWG market rate).
          </p>
        </div>
        <p className="field-hint">
          A currency cannot be turned off once it has transactions or a starting
          balance.
        </p>
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
        <div className="form-grid">
          {currencies.map((currency) => (
            <div className="field" key={currency}>
              <label htmlFor={`opening-${currency}`}>
                Starting cash · {currency}
              </label>
              <input
                className="input"
                id={`opening-${currency}`}
                inputMode="decimal"
                min="0"
                onChange={(event) =>
                  setCashOpenings((current) => ({
                    ...current,
                    [currency]: event.target.value,
                  }))
                }
                step="0.01"
                type="number"
                value={cashOpenings[currency] ?? "0"}
              />
            </div>
          ))}
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

function supabaseErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : error &&
          typeof error === "object" &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Settings could not be saved.";

  if (/currencies|business_cash_accounts|opening_cash|schema cache/i.test(message)) {
    return `${message} Run supabase/migrations/0008_multi_currency_cash.sql in the Supabase SQL editor, then refresh this page.`;
  }
  if (/vat_registered|vat_rate/i.test(message)) {
    return `${message} Run supabase/migrations/0004_vat_settings.sql in the Supabase SQL editor, then refresh this page.`;
  }
  return message;
}
