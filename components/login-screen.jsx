"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BearLogo, Icon, Field } from "./ui";

export function LoginScreen({ branches = [] }) {
  const router = useRouter();
  const [mode, setMode] = useState("login");

  // Magic-link / OAuth implicit-flow callback: tokens arrive in window.location.hash.
  // @supabase/ssr auto-consumes the hash and sets the session — once it's set,
  // route the user to /chat (or /pending if their account isn't approved yet).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasTokens = window.location.hash.includes("access_token=") ||
                      window.location.search.includes("access_token=");
    if (!hasTokens) return;
    const supabase = createClient();
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // strip the hash so we don't loop
        history.replaceState(null, "", "/");
        router.push("/chat");
        router.refresh();
      }
    });
    return () => sub?.data?.subscription?.unsubscribe?.();
  }, [router]);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [requestedRole, setRequestedRole] = useState("Staff");
  const [branch, setBranch] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function signInWithGoogle() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
    }
  }

  async function submitLogin(e) {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push("/chat");
    router.refresh();
  }

  async function submitRegister(e) {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: {
        data: {
          full_name: name,
          requested_role: requestedRole.toLowerCase(),
          requested_branch: branch || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data.user) {
      // Update profile metadata that the trigger may have missed.
      await supabase
        .from("profiles")
        .update({
          full_name: name,
          requested_role: requestedRole.toLowerCase(),
          requested_branch: branch || null,
        })
        .eq("id", data.user.id);
    }
    setMode("pending");
  }

  return (
    <div className="login-grid" style={{
      minHeight: "100vh", width: "100vw", display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      background: "var(--bg)", overflow: "auto",
    }}>
      <div className="login-hero" style={{
        position: "relative", overflow: "hidden",
        background: "#1c1308", color: "var(--brand-cream-2)",
        display: "flex", flexDirection: "column", padding: 40,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BearLogo size={36} radius={10} />
          <div className="mono" style={{ font: "600 11px/1 var(--font-mono)", letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.7 }}>BEARHOUSE</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 480 }}>
          <div className="mono" style={{ font: "500 11px/1 var(--font-mono)", color: "var(--brand-cream)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 16, opacity: 0.8 }}>AI · GATEWAY · v1.0</div>
          <h2 style={{ font: "500 40px/1.1 var(--font-sans)", letterSpacing: "-0.02em", margin: 0, color: "var(--brand-cream-2)" }}>
            One AI, all 68 branches,<br />
            <span style={{ color: "#e2a55a" }}>only your data.</span>
          </h2>
          <p style={{ font: "400 15px/1.55 var(--font-sans)", color: "rgba(251,242,220,.65)", marginTop: 18, maxWidth: 440 }}>
            A unified gateway to frontier models, grounded in BEARHOUSE branch data,
            with row-level access that mirrors your store scope — exactly.
          </p>
        </div>

        <div className="mono terminal" style={{
          marginTop: 24, padding: 16, borderRadius: 12,
          background: "rgba(251,242,220,.04)", border: "0.5px solid rgba(251,242,220,.08)",
          font: "400 12px/1.7 var(--font-mono)", color: "rgba(251,242,220,.72)",
        }}>
          <div><span style={{ color: "#e2a55a" }}>$</span> gateway.scope</div>
          <div style={{ paddingLeft: 14, color: "rgba(251,242,220,.5)" }}>→ row-level policies via Supabase RLS</div>
          <div style={{ paddingLeft: 14, color: "rgba(251,242,220,.5)" }}>→ skills + models gated per user</div>
          <div style={{ paddingLeft: 14, color: "rgba(251,242,220,.5)" }}>→ BYO keys, encrypted at rest</div>
          <div style={{ paddingLeft: 14, color: "#e2a55a" }}>✓ admin approval required for new accounts</div>
        </div>
      </div>

      <div className="login-form" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 380, margin: "0 auto" }}>
          {mode === "pending" ? (
            <PendingPanel email={email} onBack={() => setMode("login")} />
          ) : (
            <>
              <h2 className="h-1" style={{ marginBottom: 6 }}>
                {mode === "login" ? "Sign in" : "Request access"}
              </h2>
              <p className="muted" style={{ font: "400 14px/1.5 var(--font-sans)", margin: 0 }}>
                {mode === "login"
                  ? "Use your BEARHOUSE Google account or email."
                  : "Admin will review and approve new members."}
              </p>

              <button className="btn" onClick={signInWithGoogle} type="button" disabled={busy}
                style={{ width: "100%", height: 44, marginTop: 24, gap: 12, fontWeight: 500 }}>
                <Icon name="google" size={16} stroke={0} fill="currentColor" />
                Continue with Google
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                <span className="mono muted" style={{ font: "500 10.5px/1 var(--font-mono)", letterSpacing: ".1em", textTransform: "uppercase" }}>or with email</span>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </div>

              <form onSubmit={mode === "login" ? submitLogin : submitRegister}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {mode === "register" && (
                  <Field label="Full name">
                    <input className="input" placeholder="K. Praya Lertsuk" value={name} onChange={(e) => setName(e.target.value)} required />
                  </Field>
                )}
                <Field label="Email">
                  <input className="input" type="email" placeholder="you@bearhouse.co.th" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Field label="Password" right={mode === "login" ? <a className="muted" style={{ font: "400 12px/1 var(--font-sans)", textDecoration: "none" }} href="#">Forgot?</a> : null}>
                  <input className="input" type="password" placeholder="••••••••" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={8} />
                </Field>

                {mode === "register" && (
                  <>
                    <Field label="Requested role">
                      <select className="input" value={requestedRole} onChange={(e) => setRequestedRole(e.target.value)}>
                        <option>Staff</option>
                        <option>Manager</option>
                      </select>
                    </Field>
                    <Field label="Primary branch">
                      <select className="input" value={branch} onChange={(e) => setBranch(e.target.value)}>
                        <option value="">Select…</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}

                {err && (
                  <div style={{
                    padding: "8px 10px", borderRadius: 6,
                    background: "oklch(0.95 0.05 25 / 0.5)",
                    color: "oklch(0.45 0.18 25)",
                    font: "400 12px/1.4 var(--font-sans)",
                  }}>{err}</div>
                )}

                <button type="submit" className="btn btn-primary" disabled={busy}
                  style={{ width: "100%", height: 40, marginTop: 6, justifyContent: "center" }}>
                  {busy ? "…" : (mode === "login" ? "Sign in" : "Submit for approval")}
                  <Icon name="chevright" size={13} />
                </button>
              </form>

              <div style={{ marginTop: 22, font: "400 13px/1.5 var(--font-sans)", color: "var(--muted)", textAlign: "center" }}>
                {mode === "login" ? (
                  <>New to the gateway? <button type="button" onClick={() => setMode("register")} style={{ appearance: "none", border: 0, background: "none", color: "var(--ink)", font: "500 13px/1 var(--font-sans)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Request access</button></>
                ) : (
                  <>Already approved? <button type="button" onClick={() => setMode("login")} style={{ appearance: "none", border: 0, background: "none", color: "var(--ink)", font: "500 13px/1 var(--font-sans)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Sign in</button></>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingPanel({ email, onBack }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{
        width: 56, height: 56, margin: "0 auto 20px",
        borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-ink)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="check" size={26} stroke={1.75} />
      </div>
      <h2 className="h-1" style={{ marginBottom: 8 }}>Request submitted</h2>
      <p className="muted" style={{ font: "400 14px/1.55 var(--font-sans)", margin: 0 }}>
        Your access request is pending admin review. You'll receive an email at <b style={{ color: "var(--ink)" }}>{email || "your address"}</b> once approved.
      </p>
      <div className="mono" style={{
        marginTop: 24, padding: "12px 14px", textAlign: "left", borderRadius: 10,
        background: "var(--bg-2)", border: "0.5px solid var(--line)",
        font: "400 12px/1.7 var(--font-mono)", color: "var(--muted)",
      }}>
        <div><span style={{ color: "var(--muted-2)" }}>status   </span>· <span className="badge badge-warn" style={{ height: 18, fontSize: 10 }}><span className="dot" /> pending</span></div>
        <div><span style={{ color: "var(--muted-2)" }}>ticket   </span>· REQ-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 9000 + 1000))}</div>
        <div><span style={{ color: "var(--muted-2)" }}>SLA      </span>· typically within 1 business day</div>
      </div>
      <button className="btn" onClick={onBack} type="button" style={{ marginTop: 20 }}>
        <Icon name="chevleft" size={13} /> Back to sign in
      </button>
    </div>
  );
}
