"use client";

import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function AuthForm() {
  const [mode, setMode] = useState<"sign-in" | "register">("sign-in");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!hasSupabaseConfig()) {
      setMessage({
        type: "error",
        text: "Connect a Supabase project in .env.local before creating an account.",
      });
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "");
    const supabase = createClient();
    setLoading(true);

    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

    setLoading(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
      return;
    }

    if (mode === "register" && !result.data.session) {
      setMessage({
        type: "success",
        text: "Check your email to confirm the account, then sign in.",
      });
      return;
    }

    window.location.assign(mode === "register" ? "/onboarding" : "/dashboard");
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <div className="segmented" style={{ marginBottom: 8 }}>
        <button data-active={mode === "sign-in"} onClick={() => { setMode("sign-in"); setMessage(null); }} type="button">Sign in</button>
        <button data-active={mode === "register"} onClick={() => { setMode("register"); setMessage(null); }} type="button">Create account</button>
      </div>
      {mode === "register" && (
        <div className="field">
          <label htmlFor="full-name">Full name</label>
          <input autoComplete="name" className="input" id="full-name" name="fullName" required />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input autoComplete="email" className="input" id="email" name="email" required type="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <div style={{ position: "relative" }}>
          <input autoComplete={mode === "sign-in" ? "current-password" : "new-password"} className="input" id="password" minLength={8} name="password" required type={showPassword ? "text" : "password"} />
          <button aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} style={{ background: "none", border: 0, color: "#667085", cursor: "pointer", padding: 10, position: "absolute", right: 2, top: 2 }} type="button">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      {message && <p className={`form-message form-message-${message.type}`}>{message.text}</p>}
      <button className="button button-primary" disabled={loading} style={{ marginTop: 4, width: "100%" }} type="submit">
        {loading ? <LoaderCircle className="spin" size={18} /> : <LogIn size={18} />}
        {mode === "sign-in" ? "Sign in to workspace" : "Create account"}
      </button>
      <p className="list-meta" style={{ lineHeight: 1.5, margin: "6px 0 0", textAlign: "center" }}>
        By continuing, you agree to use SMElink for legitimate business records.
      </p>
      {!hasSupabaseConfig() && (
        <Link className="button button-secondary" href="/dashboard">
          Preview the interface
        </Link>
      )}
    </form>
  );
}
