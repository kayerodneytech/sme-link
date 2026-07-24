"use client";

import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { MAX_CURRENCIES, SUPPORTED_CURRENCIES } from "@/lib/cash";
import { logAppError } from "@/lib/log-app-error";
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

type FieldErrors = Record<string, string>;

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

const sectorDefaults: Record<
  string,
  Pick<Registration, "needs" | "tracksInventory" | "salesMode">
> = {
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function firstError(errors: FieldErrors) {
  return Object.values(errors)[0] ?? null;
}

function validateSignIn(signIn: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  const email = signIn.email.trim();
  if (!email) errors.signInEmail = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email)) {
    errors.signInEmail = "Enter a valid email address, like name@example.com.";
  }
  if (!signIn.password) errors.signInPassword = "Enter your password.";
  return errors;
}

function validateStep1(registration: Registration): FieldErrors {
  const errors: FieldErrors = {};
  const fullName = registration.fullName.trim();
  const email = registration.email.trim();

  if (!fullName) errors.fullName = "Enter your name.";
  else if (fullName.length < 2) {
    errors.fullName = "Name must be at least 2 characters.";
  }

  if (!email) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address, like name@example.com.";
  }

  if (!registration.password) errors.password = "Create a password.";
  else if (registration.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (registration.password.length > 72) {
    errors.password = "Password must be 72 characters or fewer.";
  }

  return errors;
}

function validateStep2(registration: Registration): FieldErrors {
  const errors: FieldErrors = {};
  const businessName = registration.businessName.trim();

  if (!businessName) errors.businessName = "Enter the business name.";
  else if (businessName.length < 2) {
    errors.businessName = "Business name must be at least 2 characters.";
  } else if (businessName.length > 120) {
    errors.businessName = "Business name must be 120 characters or fewer.";
  }

  if (!registration.sector) {
    errors.sector = "Choose the type of business.";
  }

  if (registration.openingCash.trim() === "") {
    errors.openingCash =
      "Enter starting money (cash in hand). Use 0 if you are starting with nothing.";
  } else {
    const openingCash = Number(registration.openingCash);
    if (!Number.isFinite(openingCash)) {
      errors.openingCash = "Starting money must be a number.";
    } else if (openingCash < 0) {
      errors.openingCash = "Starting money cannot be negative.";
    }
  }

  return errors;
}

function validateStep3(registration: Registration): FieldErrors {
  const errors: FieldErrors = {};

  if (registration.needs.length === 0) {
    errors.needs = "Choose at least one thing SMElink should help with.";
  }

  if (registration.currencies.length === 0) {
    errors.currencies = "Choose at least one currency.";
  } else if (registration.currencies.length > MAX_CURRENCIES) {
    errors.currencies = `You can accept at most ${MAX_CURRENCIES} currencies.`;
  }

  if (!registration.currencies.includes(registration.currency)) {
    errors.currency = "Main currency must be one of the currencies you accept.";
  }

  const location = registration.location.trim();
  if (location && location.length < 2) {
    errors.location = "Location must be at least 2 characters, or leave it blank.";
  }

  const phone = registration.phone.trim();
  if (phone && phone.replace(/\D/g, "").length < 7) {
    errors.phone = "Enter a fuller phone number, or leave it blank.";
  }

  for (const currency of registration.currencies) {
    const raw = registration.cashOpenings[currency] ?? "";
    if (raw.trim() === "") continue;
    const amount = Number(raw);
    if (!Number.isFinite(amount)) {
      errors[`opening-${currency}`] = `${currency} starting cash must be a number.`;
    } else if (amount < 0) {
      errors[`opening-${currency}`] = `${currency} starting cash cannot be negative.`;
    }
  }

  return errors;
}

export function AuthForm() {
  const [mode, setMode] = useState<"sign-in" | "register">("sign-in");
  const [step, setStep] = useState(1);
  const [registration, setRegistration] = useState(initialRegistration);
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  function clearFeedback() {
    setMessage(null);
    setFieldErrors({});
  }

  function switchMode(nextMode: "sign-in" | "register") {
    setMode(nextMode);
    setStep(1);
    clearFeedback();
  }

  function update<K extends keyof Registration>(key: K, value: Registration[K]) {
    setRegistration((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
    setMessage(null);
  }

  function chooseSector(sector: string) {
    setRegistration((current) => ({
      ...current,
      ...sectorDefaults[sector],
      sector,
    }));
    setFieldErrors((current) => {
      if (!current.sector) return current;
      const next = { ...current };
      delete next.sector;
      return next;
    });
  }

  function toggleNeed(value: string) {
    setRegistration((current) => ({
      ...current,
      needs: current.needs.includes(value)
        ? current.needs.filter((need) => need !== value)
        : [...current.needs, value],
    }));
    setFieldErrors((current) => {
      if (!current.needs) return current;
      const next = { ...current };
      delete next.needs;
      return next;
    });
    setMessage(null);
  }

  function toggleCurrency(value: string) {
    setRegistration((current) => {
      if (current.currencies.includes(value)) {
        if (current.currencies.length === 1) {
          setFieldErrors({
            currencies: "Keep at least one currency selected.",
          });
          setMessage({
            type: "error",
            text: "Keep at least one currency selected.",
          });
          return current;
        }
        const currencies = current.currencies.filter(
          (currency) => currency !== value,
        );
        const cashOpenings = { ...current.cashOpenings };
        delete cashOpenings[value];
        return {
          ...current,
          currencies,
          cashOpenings,
          currency:
            current.currency === value ? currencies[0] : current.currency,
        };
      }
      if (current.currencies.length >= MAX_CURRENCIES) {
        const text = `You can accept at most ${MAX_CURRENCIES} currencies.`;
        setFieldErrors({ currencies: text });
        setMessage({ type: "error", text });
        return current;
      }
      setFieldErrors((errors) => {
        if (!errors.currencies) return errors;
        const next = { ...errors };
        delete next.currencies;
        return next;
      });
      return {
        ...current,
        currencies: [...current.currencies, value],
        cashOpenings: {
          ...current.cashOpenings,
          [value]: current.cashOpenings[value] ?? "",
        },
      };
    });
    setMessage(null);
  }

  function applyErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    const summary = firstError(errors);
    setMessage(summary ? { type: "error", text: summary } : null);
    return Object.keys(errors).length === 0;
  }

  function nextStep() {
    clearFeedback();
    if (step === 1 && !applyErrors(validateStep1(registration))) return;
    if (step === 2 && !applyErrors(validateStep2(registration))) return;
    if (step === 3 && !applyErrors(validateStep3(registration))) return;
    setStep((current) => Math.min(3, current + 1));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    if (mode === "sign-in") {
      if (!applyErrors(validateSignIn(signIn))) return;
    }

    if (mode === "register" && step < 3) {
      nextStep();
      return;
    }

    if (mode === "register" && step === 3) {
      if (!applyErrors(validateStep3(registration))) return;
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
      const result = await supabase.auth.signInWithPassword({
        email: signIn.email.trim(),
        password: signIn.password,
      });
      setLoading(false);
      if (result.error) {
        const raw = result.error.message.toLowerCase();
        let text = result.error.message;
        if (raw.includes("email not confirmed") || raw.includes("not confirmed")) {
          text =
            "This email is not confirmed yet. Check your inbox for a confirmation link, or ask an admin to turn off Confirm email in Supabase.";
        } else if (
          raw.includes("invalid login") ||
          raw.includes("invalid credentials")
        ) {
          text = "Email or password is wrong. Check both and try again.";
          setFieldErrors({
            signInEmail: "Check this email.",
            signInPassword: "Check this password.",
          });
        }
        void logAppError({
          source: "auth.sign_in",
          message: result.error.message,
          email: signIn.email,
          details: {
            code: result.error.code ?? null,
            status: result.error.status ?? null,
            shown_message: text,
          },
        });
        setMessage({ type: "error", text });
        return;
      }
      window.location.assign("/dashboard");
      return;
    }

    const result = await supabase.auth.signUp({
      email: registration.email.trim(),
      password: registration.password,
      options: {
        data: {
          full_name: registration.fullName.trim(),
          business_name: registration.businessName.trim(),
          business_sector: registration.sector,
          business_phone: registration.phone.trim() || null,
          business_location: registration.location.trim() || null,
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
          "An account with this email already exists. Switch to Sign in, or use a different email.";
        setFieldErrors({ email: "This email is already registered." });
      } else if (raw.includes("password")) {
        setFieldErrors({ password: result.error.message });
      } else if (raw.includes("email")) {
        setFieldErrors({ email: result.error.message });
      }
      void logAppError({
        source: "auth.sign_up",
        message: result.error.message,
        email: registration.email,
        details: {
          code: result.error.code ?? null,
          status: result.error.status ?? null,
          sector: registration.sector,
          shown_message: text,
        },
      });
      setMessage({ type: "error", text });
      return;
    }

    if (!result.data.session) {
      setLoading(false);
      const text =
        "Account was created, but you are not signed in yet. Turn OFF “Confirm email” in Supabase Auth settings, then sign in with the same email and password.";
      void logAppError({
        source: "auth.sign_up.no_session",
        message:
          "Signup succeeded without a session (email confirmation likely enabled)",
        email: registration.email,
        details: {
          user_id: result.data.user?.id ?? null,
          shown_message: text,
        },
      });
      setMessage({ type: "error", text });
      return;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.data.session.access_token,
      refresh_token: result.data.session.refresh_token,
    });
    if (sessionError) {
      setLoading(false);
      const text = `Account created, but sign-in could not be completed: ${sessionError.message}. Try Sign in with the same email and password.`;
      void logAppError({
        source: "auth.sign_up.set_session",
        message: sessionError.message,
        email: registration.email,
        details: {
          user_id: result.data.user?.id ?? null,
          shown_message: text,
        },
      });
      setMessage({ type: "error", text });
      return;
    }

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
      await new Promise((resolve) =>
        window.setTimeout(resolve, 250 * (attempt + 1)),
      );
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
        business_name: registration.businessName.trim(),
        business_sector: registration.sector,
        business_phone: registration.phone.trim() || null,
        business_location: registration.location.trim() || null,
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
        const text = `Account created, but the business workspace could not be set up: ${businessError.message}. Try Sign in — if that fails, turn off Confirm email in Supabase Auth settings.`;
        void logAppError({
          source: "auth.sign_up.create_business",
          message: businessError.message,
          email: registration.email,
          details: {
            code: businessError.code ?? null,
            user_id: result.data.user?.id ?? null,
            sector: registration.sector,
            shown_message: text,
          },
        });
        setMessage({ type: "error", text });
        return;
      }
    }

    setLoading(false);
    window.location.assign("/setup");
  }

  return (
    <form className="form-stack" noValidate onSubmit={submit}>
      <div className="segmented auth-mode-switch">
        <button
          data-active={mode === "sign-in"}
          onClick={() => switchMode("sign-in")}
          type="button"
        >
          Sign in
        </button>
        <button
          data-active={mode === "register"}
          onClick={() => switchMode("register")}
          type="button"
        >
          Create account
        </button>
      </div>

      {mode === "register" && (
        <div
          className="registration-progress"
          aria-label={`Registration step ${step} of 3`}
        >
          {[1, 2, 3].map((item) => (
            <span data-active={item <= step} key={item}>
              {item < step ? <Check size={13} /> : item}
            </span>
          ))}
          <div>
            <i style={{ width: `${((step - 1) / 2) * 100}%` }} />
          </div>
        </div>
      )}

      {mode === "sign-in" && (
        <>
          <div className="field">
            <label htmlFor="sign-in-email">Email address</label>
            <input
              aria-invalid={Boolean(fieldErrors.signInEmail)}
              autoComplete="email"
              className="input"
              id="sign-in-email"
              onChange={(event) => {
                setSignIn((current) => ({
                  ...current,
                  email: event.target.value,
                }));
                setFieldErrors((current) => {
                  if (!current.signInEmail) return current;
                  const next = { ...current };
                  delete next.signInEmail;
                  return next;
                });
                setMessage(null);
              }}
              type="email"
              value={signIn.email}
            />
            {fieldErrors.signInEmail && (
              <p className="field-error">{fieldErrors.signInEmail}</p>
            )}
          </div>
          <PasswordField
            error={fieldErrors.signInPassword}
            id="sign-in-password"
            mode="current-password"
            onChange={(password) => {
              setSignIn((current) => ({ ...current, password }));
              setFieldErrors((current) => {
                if (!current.signInPassword) return current;
                const next = { ...current };
                delete next.signInPassword;
                return next;
              });
              setMessage(null);
            }}
            password={signIn.password}
            setShowPassword={setShowPassword}
            showPassword={showPassword}
          />
        </>
      )}

      {mode === "register" && step === 1 && (
        <>
          <div className="registration-heading">
            <p className="eyebrow">Step 1 of 3</p>
            <h2>Your account</h2>
            <p>Start with the details you will use to sign in.</p>
          </div>
          <div className="field">
            <label htmlFor="full-name">Your name</label>
            <input
              aria-invalid={Boolean(fieldErrors.fullName)}
              autoComplete="name"
              className="input"
              id="full-name"
              onChange={(event) => update("fullName", event.target.value)}
              value={registration.fullName}
            />
            {fieldErrors.fullName && (
              <p className="field-error">{fieldErrors.fullName}</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              className="input"
              id="email"
              onChange={(event) => update("email", event.target.value)}
              type="email"
              value={registration.email}
            />
            {fieldErrors.email && (
              <p className="field-error">{fieldErrors.email}</p>
            )}
          </div>
          <PasswordField
            error={fieldErrors.password}
            id="password"
            mode="new-password"
            onChange={(password) => update("password", password)}
            password={registration.password}
            setShowPassword={setShowPassword}
            showPassword={showPassword}
          />
        </>
      )}

      {mode === "register" && step === 2 && (
        <>
          <div className="registration-heading">
            <p className="eyebrow">Step 2 of 3</p>
            <h2>About the business</h2>
            <p>This helps SMElink suggest a useful starting setup.</p>
          </div>
          <div className="field">
            <label htmlFor="business-name">Business name</label>
            <input
              aria-invalid={Boolean(fieldErrors.businessName)}
              className="input"
              id="business-name"
              onChange={(event) => update("businessName", event.target.value)}
              value={registration.businessName}
            />
            {fieldErrors.businessName && (
              <p className="field-error">{fieldErrors.businessName}</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="business-sector">What type of business is it?</label>
            <select
              aria-invalid={Boolean(fieldErrors.sector)}
              className="select"
              id="business-sector"
              onChange={(event) => chooseSector(event.target.value)}
              value={registration.sector}
            >
              <option value="retail">Shop or retail business</option>
              <option value="wholesale">Wholesale or distribution</option>
              <option value="services">Service business</option>
              <option value="manufacturing">Manufacturing or production</option>
              <option value="hospitality">
                Food, accommodation or hospitality
              </option>
              <option value="other">Another type of business</option>
            </select>
            <p className="field-hint">
              This cannot be changed later, so choose carefully.
            </p>
            {fieldErrors.sector && (
              <p className="field-error">{fieldErrors.sector}</p>
            )}
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="team-size">How many people work here?</label>
              <select
                className="select"
                id="team-size"
                onChange={(event) => update("teamSize", event.target.value)}
                value={registration.teamSize}
              >
                <option value="just_me">Just me</option>
                <option value="2_5">2–5 people</option>
                <option value="6_20">6–20 people</option>
                <option value="more_than_20">More than 20</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="sales-mode">How do customers usually buy?</label>
              <select
                className="select"
                id="sales-mode"
                onChange={(event) => update("salesMode", event.target.value)}
                value={
                  registration.salesMode === "orders"
                    ? "both"
                    : registration.salesMode
                }
              >
                <option value="walk_in">Mostly walk-in sales</option>
                <option value="both">Walk-ins and regular customers</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="opening-cash">Starting money (cash in hand)</label>
            <input
              aria-invalid={Boolean(fieldErrors.openingCash)}
              className="input"
              id="opening-cash"
              inputMode="decimal"
              min="0"
              onChange={(event) => update("openingCash", event.target.value)}
              placeholder="e.g. 500"
              step="0.01"
              type="number"
              value={registration.openingCash}
            />
            <p className="field-hint">
              The money the business has now. Use 0 if you are starting with
              nothing.
            </p>
            {fieldErrors.openingCash && (
              <p className="field-error">{fieldErrors.openingCash}</p>
            )}
          </div>
        </>
      )}

      {mode === "register" && step === 3 && (
        <>
          <div className="registration-heading">
            <p className="eyebrow">Step 3 of 3</p>
            <h2>What should SMElink help with?</h2>
            <p>Choose what matters now. You can change this later.</p>
          </div>
          <div className="need-grid">
            {needOptions.map((option) => {
              const Icon = option.icon;
              const selected = registration.needs.includes(option.value);
              return (
                <button
                  aria-pressed={selected}
                  className="need-option"
                  data-active={selected}
                  key={option.value}
                  onClick={() => toggleNeed(option.value)}
                  type="button"
                >
                  <Icon size={18} />
                  <span>{option.label}</span>
                  {selected && <Check size={15} />}
                </button>
              );
            })}
          </div>
          {fieldErrors.needs && (
            <p className="field-error">{fieldErrors.needs}</p>
          )}
          <label className="check-row">
            <input
              checked={registration.tracksInventory}
              onChange={(event) =>
                update("tracksInventory", event.target.checked)
              }
              type="checkbox"
            />
            <span>
              <strong>We keep products in stock</strong>
              <small>
                Turn this off for service businesses — you’ll manage services,
                not products.
              </small>
            </span>
          </label>
          <div className="field">
            <label>Which currencies do you accept? (max {MAX_CURRENCIES})</label>
            <div className="need-grid">
              {SUPPORTED_CURRENCIES.map((currency) => {
                const selected = registration.currencies.includes(currency);
                return (
                  <button
                    aria-pressed={selected}
                    className="need-option"
                    data-active={selected}
                    key={currency}
                    onClick={() => toggleCurrency(currency)}
                    type="button"
                  >
                    <span>{currency}</span>
                    {selected && <Check size={15} />}
                  </button>
                );
              })}
            </div>
            {fieldErrors.currencies && (
              <p className="field-error">{fieldErrors.currencies}</p>
            )}
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="currency">Main reporting currency</label>
              <select
                aria-invalid={Boolean(fieldErrors.currency)}
                className="select"
                id="currency"
                onChange={(event) => update("currency", event.target.value)}
                value={registration.currency}
              >
                {registration.currencies.map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
              {fieldErrors.currency && (
                <p className="field-error">{fieldErrors.currency}</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="location">Town or location (optional)</label>
              <input
                aria-invalid={Boolean(fieldErrors.location)}
                className="input"
                id="location"
                onChange={(event) => update("location", event.target.value)}
                placeholder="Harare, Zimbabwe"
                value={registration.location}
              />
              {fieldErrors.location && (
                <p className="field-error">{fieldErrors.location}</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="business-phone">Business phone (optional)</label>
              <input
                aria-invalid={Boolean(fieldErrors.phone)}
                className="input"
                id="business-phone"
                onChange={(event) => update("phone", event.target.value)}
                type="tel"
                value={registration.phone}
              />
              {fieldErrors.phone && (
                <p className="field-error">{fieldErrors.phone}</p>
              )}
            </div>
          </div>
          {registration.currencies.length > 0 && (
            <div className="field">
              <label>Starting cash per currency (optional)</label>
              <p className="field-hint">
                Leave blank to use the main starting amount for your main
                currency and 0 for the others.
              </p>
              <div className="form-grid">
                {registration.currencies.map((currency) => (
                  <div className="field" key={currency}>
                    <label htmlFor={`opening-${currency}`}>
                      {currency} starting cash
                    </label>
                    <input
                      aria-invalid={Boolean(fieldErrors[`opening-${currency}`])}
                      className="input"
                      id={`opening-${currency}`}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => {
                        setRegistration((current) => ({
                          ...current,
                          cashOpenings: {
                            ...current.cashOpenings,
                            [currency]: event.target.value,
                          },
                        }));
                        setFieldErrors((current) => {
                          const key = `opening-${currency}`;
                          if (!current[key]) return current;
                          const next = { ...current };
                          delete next[key];
                          return next;
                        });
                      }}
                      placeholder={
                        currency === registration.currency
                          ? registration.openingCash || "0"
                          : "0"
                      }
                      step="0.01"
                      type="number"
                      value={registration.cashOpenings[currency] ?? ""}
                    />
                    {fieldErrors[`opening-${currency}`] && (
                      <p className="field-error">
                        {fieldErrors[`opening-${currency}`]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {message && (
        <p className={`form-message form-message-${message.type}`} role="alert">
          {message.text}
        </p>
      )}

      <div className="registration-actions">
        {mode === "register" && step > 1 && (
          <button
            className="button button-secondary"
            onClick={() => {
              setStep((current) => current - 1);
              clearFeedback();
            }}
            type="button"
          >
            <ArrowLeft size={17} /> Back
          </button>
        )}
        <button className="button button-primary" disabled={loading} type="submit">
          {loading ? (
            <LoaderCircle className="spin" size={18} />
          ) : mode === "sign-in" ? (
            <LogIn size={18} />
          ) : step === 3 ? (
            <Check size={18} />
          ) : (
            <ArrowRight size={18} />
          )}
          {mode === "sign-in"
            ? "Sign in"
            : step === 3
              ? "Create my workspace"
              : "Continue"}
        </button>
      </div>

      {!hasSupabaseConfig() && (
        <Link className="button button-secondary" href="/dashboard">
          Preview the interface
        </Link>
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
  error,
}: {
  id: string;
  mode: "current-password" | "new-password";
  onChange: (password: string) => void;
  password: string;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showPassword: boolean;
  error?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>Password</label>
      <div style={{ position: "relative" }}>
        <input
          aria-invalid={Boolean(error)}
          autoComplete={mode}
          className="input"
          id={id}
          minLength={mode === "new-password" ? 8 : undefined}
          onChange={(event) => onChange(event.target.value)}
          type={showPassword ? "text" : "password"}
          value={password}
        />
        <button
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((value) => !value)}
          style={{
            background: "none",
            border: 0,
            color: "#667085",
            cursor: "pointer",
            padding: 10,
            position: "absolute",
            right: 2,
            top: 2,
          }}
          type="button"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {mode === "new-password" && !error && (
        <small>Use at least 8 characters.</small>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
