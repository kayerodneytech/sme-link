"use client";

import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ClipboardList,
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
  tracksInventory: boolean;
  needs: string[];
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
  tracksInventory: true,
  needs: ["sales", "inventory", "expenses", "reports"],
};

const needOptions = [
  { value: "sales", label: "Record sales", icon: ShoppingBag },
  { value: "inventory", label: "Manage stock", icon: Boxes },
  { value: "orders", label: "Follow orders", icon: ClipboardList },
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
    needs: ["sales", "inventory", "orders", "customers", "expenses", "reports"],
    tracksInventory: true,
    salesMode: "orders",
  },
  services: {
    needs: ["sales", "customers", "expenses", "reports"],
    tracksInventory: false,
    salesMode: "orders",
  },
  manufacturing: {
    needs: ["sales", "inventory", "orders", "expenses", "reports"],
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
        setMessage({ type: "error", text: result.error.message });
        return;
      }
      window.location.assign("/dashboard");
      return;
    }

    const result = await supabase.auth.signUp({
      email: registration.email,
      password: registration.password,
      options: { data: { full_name: registration.fullName } },
    });

    if (result.error) {
      setLoading(false);
      setMessage({ type: "error", text: result.error.message });
      return;
    }

    if (!result.data.session) {
      setLoading(false);
      setMessage({
        type: "error",
        text: "Email confirmation is still enabled in Supabase. Turn off Confirm email in Authentication settings, then try again.",
      });
      return;
    }

    const { error: businessError } = await supabase.rpc("create_business", {
      business_name: registration.businessName,
      business_sector: registration.sector,
      business_phone: registration.phone,
      business_location: registration.location,
      business_currency: registration.currency,
      business_team_size: registration.teamSize,
      business_sales_mode: registration.salesMode,
      business_needs: registration.needs,
      business_tracks_inventory: registration.tracksInventory,
    });
    setLoading(false);

    if (businessError) {
      setMessage({
        type: "error",
        text: `The account was created, but the business setup could not be saved: ${businessError.message}`,
      });
      return;
    }

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
          <div className="field"><label htmlFor="business-sector">What type of business is it?</label><select className="select" id="business-sector" onChange={(event) => chooseSector(event.target.value)} value={registration.sector}><option value="retail">Shop or retail business</option><option value="wholesale">Wholesale or distribution</option><option value="services">Service business</option><option value="manufacturing">Manufacturing or production</option><option value="hospitality">Food, accommodation or hospitality</option><option value="other">Another type of business</option></select></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="team-size">How many people work here?</label><select className="select" id="team-size" onChange={(event) => update("teamSize", event.target.value)} value={registration.teamSize}><option value="just_me">Just me</option><option value="2_5">2–5 people</option><option value="6_20">6–20 people</option><option value="more_than_20">More than 20</option></select></div>
            <div className="field"><label htmlFor="sales-mode">How do customers usually buy?</label><select className="select" id="sales-mode" onChange={(event) => update("salesMode", event.target.value)} value={registration.salesMode}><option value="walk_in">Mostly walk-in sales</option><option value="orders">Mostly customer orders</option><option value="both">Both walk-ins and orders</option></select></div>
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
            <span><strong>We keep products in stock</strong><small>Turn this off for a service-only business.</small></span>
          </label>
          <div className="form-grid">
            <div className="field"><label htmlFor="currency">Main currency</label><select className="select" id="currency" onChange={(event) => update("currency", event.target.value)} value={registration.currency}><option>USD</option><option>ZiG</option><option>ZAR</option></select></div>
            <div className="field"><label htmlFor="location">Town or location</label><input className="input" id="location" onChange={(event) => update("location", event.target.value)} placeholder="Harare, Zimbabwe" value={registration.location} /></div>
            <div className="field"><label htmlFor="business-phone">Business phone (optional)</label><input className="input" id="business-phone" onChange={(event) => update("phone", event.target.value)} type="tel" value={registration.phone} /></div>
          </div>
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
