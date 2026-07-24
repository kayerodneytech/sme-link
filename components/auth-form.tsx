"use client";

import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { MAX_CURRENCIES, SUPPORTED_CURRENCIES } from "@/lib/cash";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LogIn,
  ReceiptText,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Registration = {
  fullName: string;
  email: string;
  password: string;
  businessName: string;
  sector: string;
  teamSize: string;
  salesMode: string;
  phone: string;
  location: string;
  currency: string;
  currencies: string[];
  tracksInventory: boolean;
  needs: string[];
  openingCash: string;
  cashOpenings: Record<string, string>;
};

const initialRegistration: Registration = {
  fullName: "",
  email: "",
  password: "",
  businessName: "",
  sector: "retail",
  teamSize: "just_me",
  salesMode: "walk_in",
  phone: "",
  location: "",
  currency: "USD",
  currencies: ["USD"],
  tracksInventory: true,
  needs: ["sales", "inventory", "expenses", "reports"],
  openingCash: "",
  cashOpenings: { USD: "" },
};

const needOptions = [
  { value: "sales", label: "Record sales", icon: ShoppingBag },
  { value: "inventory", label: "Manage stock", icon: Boxes },
  { value: "expenses", label: "Track expenses", icon: ReceiptText },
  { value: "customers", label: "Keep customers", icon: Users },
  { value: "reports", label: "Understand performance", icon: BarChart3 },
];

const sectorDefaults: Record<string, Pick<Registration, "needs" | "tracksInventory" | "salesMode">> = {
  retail: {
    needs: ["sales", "inventory", "expenses", "reports"],
    tracksInventory: true,
    salesMode: "walk_in",
  },
  wholesale: {
    needs: ["sales", "inventory", "customers", "expenses", "reports"],
    tracksInventory: true,
    salesMode: "both",
  },
  services: {
    needs: ["sales", "customers", "expenses", "reports"],
    tracksInventory: false,
    salesMode: "both",
  },
  manufacturing: {
    needs: ["sales", "inventory", "expenses", "reports"],
    tracksInventory: true,
    salesMode: "both",
  },
  hospitality: {
    needs: ["sales", "inventory", "expenses", "customers", "reports"],
    tracksInventory: true,
    salesMode: "walk_in",
  },
  other: {
    needs: ["sales", "expenses", "reports"],
    tracksInventory: false,
    salesMode: "both",
  },
};

export function AuthForm() {
  const [mode, setMode] = useState<"sign-in" | "register">("sign-in");
  const [step, setStep] = useState(1);
  const [registration, setRegistration] = useState(initialRegistration);
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function switchMode(nextMode: "sign-in" | "register") {
    setMode(nextMode);
    setStep(1);
    setMessage(null);
  }

  function update<K extends keyof Registration>(key: K, value: Registration[K]) {
    setRegistration((current) => ({ ...current, [key]: value }));
  }

  function chooseSector(sector: string) {
    setRegistration((current) => ({
      ...current,
      ...sectorDefaults[sector],
      sector,
    }));
  }

  function toggleNeed(value: string) {
    setRegistration((current) => ({
      ...current,
      needs: current.needs.includes(value)
        ? current.needs.filter((need) => need !== value)
        : [...current.needs, value],
    }));
  }

  function toggleCurrency(value: string) {
    setRegistration((current) => {
      if (current.currencies.includes(value)) {
        if (current.currencies.length === 1) return current;
        const currencies = current.currencies.filter((currency) => currency !== value);
        const cashOpenings = { ...current.cashOpenings };
        delete cashOpenings[value];
        return {
          ...current,
          currencies,
          cashOpenings,
          currency: current.currency === value ? currencies[0] : current.currency,
        };
      }
      if (current.currencies.length >= MAX_CURRENCIES) {
        setMessage({
          type: "error",
          text: `You can accept at most ${MAX_CURRENCIES} currencies.`,
        });
        return current;
      }
      return {
        ...current,
        currencies: [...current.currencies, value],
        cashOpenings: { ...current.cashOpenings, [value]: current.cashOpenings[value] ?? "" },
      };
    });
  }

  function nextStep() {
    setMessage(null);
    if (
      step === 1 &&
      (!registration.fullName.trim() ||
        !registration.email.includes("@") ||
        registration.password.length < 8)
    ) {
      setMessage({
        type: "error",
        text: "Add your name, a valid email address and a password with at least 8 characters.",
      });
      return;
    }
    if (step === 2 && !registration.businessName.trim()) {
      setMessage({ type: "error", text: "Add the business name before continuing." });
      return;
    }
    if (step === 2) {
      const openingCash = Number(registration.openingCash);
      if (!Number.isFinite(openingCash) || openingCash < 0) {
        setMessage({
          type: "error",
          text: "Enter the money you have to start with (cash in hand). Use 0 if you are starting with nothing.",
        });
        return;
      }
    }
    if (step === 3) {
      for (const currency of registration.currencies) {
        const raw = registration.cashOpenings[currency] ?? "";
        if (raw.trim() === "") continue;
        const amount = Number(raw);
        if (!Number.isFinite(amount) || amount < 0) {
          setMessage({
            type: "error",
            text: `Enter a valid starting amount for ${currency}, or leave it blank.`,
          });
          return;
        }
      }
    }
    setStep((current) => Math.min(3, current + 1));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (mode === "register" && step < 3) {
      nextStep();
      return;
    }

    if (!hasSupabaseConfig()) {
      if (mode === "register") {
        window.location.assign("/setup");
        return;
      }
      setMessage({
        type: "error",
        text: "Connect Supabase in .env.local before signing in.",
      });
      return;
    }

    const supabase = createClient();
    setLoading(true);

    if (mode === "sign-in") {
      const result = await supabase.auth.signInWithPassword(signIn);
      setLoading(false);
      if (result.error) {
        const raw = result.error.message.toLowerCase();
        let text = result.error.message;
        if (raw.includes("email not confirmed") || raw.includes("not confirmed")) {
          text =
            "This email is not confirmed yet. In Supabase → Authentication → Providers → Email, turn off “Confirm email”, then try again. Or confirm via the email link.";
        } else if (
          raw.includes("invalid login") ||
          raw.includes("invalid credentials")
        ) {
          text =
            "Email or password is wrong. If you just registered, wait a moment and try again — or use Forgot password if you have it.";
        }
        setMessage({ type: "error", text });
        return;
      }
      window.location.assign("/dashboard");
      return;
    }

    const result = await supabase.auth.signUp({
      email: registration.email,
      password: registration.password,
      options: {
        data: {
          full_name: registration.fullName,
          business_name: registration.businessName,
          business_sector: registration.sector,
          business_phone: registration.phone,
          business_location: registration.location,
          business_currency: registration.currency,
          business_currencies: registration.currencies,
          business_team_size: registration.teamSize,
          business_sales_mode: registration.salesMode,
          business_needs: registration.needs,
          business_tracks_inventory: registration.tracksInventory,
          business_opening_cash: Number(registration.openingCash || "0"),
          business_cash_openings: Object.fromEntries(
            registration.currencies.map((currency) => [
              currency,
              Number(
                registration.cashOpenings[currency] ||
                  (currency === registration.currency
                    ? registration.openingCash || "0"
                    : "0"),
              ),
            ]),
          ),
        },
      },
    });

    if (result.error) {
      setLoading(false);
      const raw = result.error.message.toLowerCase();
      let text = result.error.message;
      if (raw.includes("already") || raw.includes("registered")) {
        text =
          "An account with this email already exists. Switch to Sign in, or delete the old auth user in Supabase if this was a test account.";
      }
      setMessage({ type: "error", text });
      return;
    }

    if (!result.data.session) {
      setLoading(false);
      setMessage({
        type: "error",
        text: "Account was created, but you are not signed in yet. In Supabase → Authentication → Providers → Email, turn OFF “Confirm email”, then sign in with the same email and password.",
      });
      return;
    }

    // Persist the signup session before any authenticated API calls.
    // Without this, create_business sees auth.uid() as null ("Authentication required").
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.data.session.access_token,
      refresh_token: result.data.session.refresh_token,
    });
    if (sessionError) {
      setLoading(false);
      setMessage({
        type: "error",
        text: `Account created, but sign-in could not be completed: ${sessionError.message}. Try Sign in with the same email and password.`,
      });
      return;
    }

    // handle_new_user may create the business; give it a moment, then fall back to RPC.
    let membershipId: string | null = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data: membership } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("user_id", result.data.user!.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (membership?.business_id) {
        membershipId = membership.business_id;
        break;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
    }

    if (!membershipId) {
      const openings = Object.fromEntries(
        registration.currencies.map((currency) => [
          currency,
          Number(
            registration.cashOpenings[currency] ||
              (currency === registration.currency
                ? registration.openingCash || "0"
                : "0"),
          ),
        ]),
      );
      const { error: businessError } = await supabase.rpc("create_business", {
        business_name: registration.businessName,
        business_sector: registration.sector,
        business_phone: registration.phone || null,
        business_location: registration.location || null,
        business_currency: registration.currency,
        business_team_size: registration.teamSize,
        business_sales_mode: registration.salesMode,
        business_needs: registration.needs,
        business_tracks_inventory: registration.tracksInventory,
        business_currencies: registration.currencies,
        business_opening_cash: Number(registration.openingCash || "0"),
        business_cash_openings: openings,
      });
      if (businessError) {
        setLoading(false);
        setMessage({
          type: "error",
          text: `Account created, but the business workspace could not be set up: ${businessError.message}. Try Sign in — if that fails, turn off Confirm email in Supabase Auth settings.`,
        });
        return;
      }
    }

    setLoading(false);
    window.location.assign("/setup");
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <div className="segmented auth-mode-switch">
        <button data-active={mode === "sign-in"} onClick={() => switchMode("sign-in")} type="button">Sign in</button>
        <button data-active={mode === "register"} onClick={() => switchMode("register")} type="button">Create account</button>
      </div>

      {mode === "register" && (
        <div className="registration-progress" aria-label={`Registration step ${step} of 3`}>
          {[1, 2, 3].map((item) => (
            <span data-active={item <= step} key={item}>
              {item < step ? <Check size={13} /> : item}
            </span>
          ))}
          <div><i style={{ width: `${((step - 1) / 2) * 100}%` }} /></div>
        </div>
      )}

      {mode === "sign-in" && (
        <>
          <div className="field">
            <label htmlFor="sign-in-email">Email address</label>
            <input autoComplete="email" className="input" id="sign-in-email" onChange={(event) => setSignIn((current) => ({ ...current, email: event.target.value }))} required type="email" value={signIn.email} />
          </div>
          <PasswordField id="sign-in-password" mode="current-password" onChange={(password) => setSignIn((current) => ({ ...current, password }))} password={signIn.password} setShowPassword={setShowPassword} showPassword={showPassword} />
        </>
      )}

      {mode === "register" && step === 1 && (
        <>
          <div className="registration-heading"><p className="eyebrow">Step 1 of 3</p><h2>Your account</h2><p>Start with the details you will use to sign in.</p></div>
          <div className="field"><label htmlFor="full-name">Your name</label><input autoComplete="name" className="input" id="full-name" onChange={(event) => update("fullName", event.target.value)} required value={registration.fullName} /></div>
          <div className="field"><label htmlFor="email">Email address</label><input autoComplete="email" className="input" id="email" onChange={(event) => update("email", event.target.value)} required type="email" value={registration.email} /></div>
          <PasswordField id="password" mode="new-password" onChange={(password) => update("password", password)} password={registration.password} setShowPassword={setShowPassword} showPassword={showPassword} />
        </>
      )}

      {mode === "register" && step === 2 && (
        <>
          <div className="registration-heading"><p className="eyebrow">Step 2 of 3</p><h2>About the business</h2><p>This helps SMElink suggest a useful starting setup.</p></div>
          <div className="field"><label htmlFor="business-name">Business name</label><input className="input" id="business-name" onChange={(event) => update("businessName", event.target.value)} required value={registration.businessName} /></div>
          <div className="field">
            <label htmlFor="business-sector">What type of business is it?</label>
            <select className="select" id="business-sector" onChange={(event) => chooseSector(event.target.value)} value={registration.sector}>
              <option value="retail">Shop or retail business</option>
              <option value="wholesale">Wholesale or distribution</option>
              <option value="services">Service business</option>
              <option value="manufacturing">Manufacturing or production</option>
              <option value="hospitality">Food, accommodation or hospitality</option>
              <option value="other">Another type of business</option>
            </select>
            <p className="field-hint">This cannot be changed later, so choose carefully.</p>
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="team-size">How many people work here?</label><select className="select" id="team-size" onChange={(event) => update("teamSize", event.target.value)} value={registration.teamSize}><option value="just_me">Just me</option><option value="2_5">2–5 people</option><option value="6_20">6–20 people</option><option value="more_than_20">More than 20</option></select></div>
            <div className="field"><label htmlFor="sales-mode">How do customers usually buy?</label><select className="select" id="sales-mode" onChange={(event) => update("salesMode", event.target.value)} value={registration.salesMode === "orders" ? "both" : registration.salesMode}><option value="walk_in">Mostly walk-in sales</option><option value="both">Walk-ins and regular customers</option></select></div>
          </div>
          <div className="field">
            <label htmlFor="opening-cash">Starting money (cash in hand)</label>
            <input
              className="input"
              id="opening-cash"
              inputMode="decimal"
              min="0"
              onChange={(event) => update("openingCash", event.target.value)}
              placeholder="e.g. 500"
              required
              step="0.01"
              type="number"
              value={registration.openingCash}
            />
            <p className="field-hint">
              The money the business has now. Sales add to it. Expenses and stock purchases come out of it.
            </p>
          </div>
        </>
      )}

      {mode === "register" && step === 3 && (
        <>
          <div className="registration-heading"><p className="eyebrow">Step 3 of 3</p><h2>What should SMElink help with?</h2><p>Choose what matters now. You can change this later.</p></div>
          <div className="need-grid">
            {needOptions.map((option) => {
              const Icon = option.icon;
              const selected = registration.needs.includes(option.value);
              return (
                <button aria-pressed={selected} className="need-option" data-active={selected} key={option.value} onClick={() => toggleNeed(option.value)} type="button">
                  <Icon size={18} />
                  <span>{option.label}</span>
                  {selected && <Check size={15} />}
                </button>
              );
            })}
          </div>
          <label className="check-row">
            <input checked={registration.tracksInventory} onChange={(event) => update("tracksInventory", event.target.checked)} type="checkbox" />
            <span><strong>We keep products in stock</strong><small>Turn this off for service businesses — you’ll manage services, not products.</small></span>
          </label>
          <div className="field">
            <label>Which currencies do you accept? (max {MAX_CURRENCIES})</label>
            <div className="need-grid">
              {SUPPORTED_CURRENCIES.map((currency) => {
                const selected = registration.currencies.includes(currency);
                return (
                  <button aria-pressed={selected} className="need-option" data-active={selected} key={currency} onClick={() => toggleCurrency(currency)} type="button">
                    <span>{currency}</span>
                    {selected && <Check size={15} />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="currency">Main reporting currency</label><select className="select" id="currency" onChange={(event) => update("currency", event.target.value)} value={registration.currency}>{registration.currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></div>
            <div className="field"><label htmlFor="location">Town or location</label><input className="input" id="location" onChange={(event) => update("location", event.target.value)} placeholder="Harare, Zimbabwe" value={registration.location} /></div>
            <div className="field"><label htmlFor="business-phone">Business phone (optional)</label><input className="input" id="business-phone" onChange={(event) => update("phone", event.target.value)} type="tel" value={registration.phone} /></div>
          </div>
          {registration.currencies.length > 0 && (
            <div className="field">
              <label>Starting cash per currency (optional)</label>
              <p className="field-hint">
                Leave blank to use the main starting amount for your main currency and 0 for the others.
              </p>
              <div className="form-grid">
                {registration.currencies.map((currency) => (
                  <div className="field" key={currency}>
                    <label htmlFor={`opening-${currency}`}>{currency} starting cash</label>
                    <input
                      className="input"
                      id={`opening-${currency}`}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) =>
                        setRegistration((current) => ({
                          ...current,
                          cashOpenings: {
                            ...current.cashOpenings,
                            [currency]: event.target.value,
                          },
                        }))
                      }
                      placeholder={
                        currency === registration.currency
                          ? registration.openingCash || "0"
                          : "0"
                      }
                      step="0.01"
                      type="number"
                      value={registration.cashOpenings[currency] ?? ""}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {message && <p className={`form-message form-message-${message.type}`}>{message.text}</p>}

      <div className="registration-actions">
        {mode === "register" && step > 1 && (
          <button className="button button-secondary" onClick={() => { setStep((current) => current - 1); setMessage(null); }} type="button">
            <ArrowLeft size={17} /> Back
          </button>
        )}
        <button className="button button-primary" disabled={loading || (mode === "register" && step === 3 && registration.needs.length === 0)} type="submit">
          {loading ? <LoaderCircle className="spin" size={18} /> : mode === "sign-in" ? <LogIn size={18} /> : step === 3 ? <Check size={18} /> : <ArrowRight size={18} />}
          {mode === "sign-in" ? "Sign in" : step === 3 ? "Create my workspace" : "Continue"}
        </button>
      </div>

      {!hasSupabaseConfig() && (
        <Link className="button button-secondary" href="/dashboard">Preview the interface</Link>
      )}
    </form>
  );
}

function PasswordField({
  id,
  mode,
  onChange,
  password,
  setShowPassword,
  showPassword,
}: {
  id: string;
  mode: "current-password" | "new-password";
  onChange: (password: string) => void;
  password: string;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showPassword: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>Password</label>
      <div style={{ position: "relative" }}>
        <input autoComplete={mode} className="input" id={id} minLength={8} onChange={(event) => onChange(event.target.value)} required type={showPassword ? "text" : "password"} value={password} />
        <button aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} style={{ background: "none", border: 0, color: "#667085", cursor: "pointer", padding: 10, position: "absolute", right: 2, top: 2 }} type="button">
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {mode === "new-password" && <small>Use at least 8 characters.</small>}
    </div>
  );
}
