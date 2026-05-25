"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BearLogo, Icon, Field } from "./ui";
import { useLang } from "./lang-context";

export function LoginScreen({ branches = [] }) {
  const router = useRouter();
  const { t } = useLang();
  const [mode, setMode] = useState("login");
  // When false we show the mobile hero with the action stack; the email
  // form stays mounted but collapsed until the user taps "Sign in with email".
  const [emailOpen, setEmailOpen] = useState(false);

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

  // Whether the email/password (and register) form is visible.
  const showForm = emailOpen || mode === "register";

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: "#1c1308",
      display: "flex", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: 480, minHeight: "100vh",
        background: "#1c1308", color: "var(--brand-cream-2)",
        font: "400 15px/1.4 var(--font-sans)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* eyebrow */}
        <div style={{ padding: "40px 24px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <BearLogo size={36} radius={10} />
          <div className="mono" style={{ font: "600 11px/1 var(--font-mono)", letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.7 }}>BEARHOUSE</div>
        </div>

        {mode === "pending" ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
            <PendingPanel email={email} onBack={() => setMode("login")} />
          </div>
        ) : (
          <>
            {/* hero headline */}
            <div style={{ flex: 1, padding: "24px 24px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h1 style={{ font: "500 38px/1.05 var(--font-sans)", letterSpacing: "-0.025em", margin: 0, color: "var(--brand-cream-2)" }}>
                {t("login.heroTitle")}<br />
                <span style={{ color: "#e2a55a" }}>{t("login.heroSubtitle")}</span>
              </h1>
              <p style={{ font: "400 14.5px/1.55 var(--font-sans)", color: "rgba(251,242,220,.6)", marginTop: 18, maxWidth: 420 }}>
                {t("login.subhead")}
              </p>

              {/* email/password form — revealed on demand */}
              {showForm && (
                <form onSubmit={mode === "login" ? submitLogin : submitRegister}
                  style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
                  {mode === "register" && (
                    <LoginField label={t("login.fullname")}>
                      <input className="input login-input" placeholder="K. Praya Lertsuk" value={name} onChange={(e) => setName(e.target.value)} required />
                    </LoginField>
                  )}
                  <LoginField label={t("login.email")}>
                    <input className="input login-input" type="email" placeholder="you@bearhouse.co.th" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </LoginField>
                  <LoginField label={t("login.password")}>
                    <input className="input login-input" type="password" placeholder="••••••••" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={8} />
                  </LoginField>

                  {mode === "register" && (
                    <>
                      <LoginField label={t("login.role")}>
                        <select className="input login-input" value={requestedRole} onChange={(e) => setRequestedRole(e.target.value)}>
                          <option>Staff</option>
                          <option>Manager</option>
                        </select>
                      </LoginField>
                      <LoginField label={t("login.branch")}>
                        <select className="input login-input" value={branch} onChange={(e) => setBranch(e.target.value)}>
                          <option value="">Select…</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </LoginField>
                    </>
                  )}

                  {err && (
                    <div style={{
                      padding: "8px 10px", borderRadius: 8,
                      background: "rgba(226,165,90,.12)",
                      color: "#e2a55a",
                      font: "400 12px/1.4 var(--font-sans)",
                    }}>{err}</div>
                  )}

                  <button type="submit" disabled={busy} style={{
                    appearance: "none", border: 0, height: 52, borderRadius: 14, marginTop: 4,
                    background: "var(--brand-cream-2)", color: "#1c1308", font: "600 16px/1 var(--font-sans)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
                  }}>
                    {busy ? "…" : (mode === "login" ? t("login.signin") : t("login.submit"))}
                  </button>
                </form>
              )}
            </div>

            {/* bottom action stack */}
            <div style={{ padding: "0 20px", paddingBottom: "calc(var(--safe-bottom) + 18px)", display: "flex", flexDirection: "column", gap: 10 }}>
              {!showForm && err && (
                <div style={{
                  padding: "8px 10px", borderRadius: 8,
                  background: "rgba(226,165,90,.12)", color: "#e2a55a",
                  font: "400 12px/1.4 var(--font-sans)", textAlign: "center",
                }}>{err}</div>
              )}

              <button type="button" onClick={signInWithGoogle} disabled={busy} style={{
                appearance: "none", border: 0, height: 52, borderRadius: 14,
                background: "var(--brand-cream-2)", color: "#1c1308", font: "600 16px/1 var(--font-sans)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer",
                opacity: busy ? 0.6 : 1,
              }}>
                <Icon name="google" size={18} stroke={0} fill="currentColor" />
                {t("login.googleBtn")}
              </button>

              {mode === "login" && !emailOpen && (
                <button type="button" onClick={() => setEmailOpen(true)} style={{
                  appearance: "none", height: 52, borderRadius: 14,
                  background: "transparent", color: "var(--brand-cream-2)",
                  border: "1px solid rgba(251,242,220,.18)", font: "500 16px/1 var(--font-sans)", cursor: "pointer",
                }}>
                  {t("login.signinEmail")}
                </button>
              )}

              <div style={{ textAlign: "center", marginTop: 6, font: "400 13px/1 var(--font-sans)", color: "rgba(251,242,220,.55)" }}>
                {mode === "login" ? (
                  <>{t("login.newPrompt")} <button type="button" onClick={() => { setMode("register"); setEmailOpen(true); }} style={{ appearance: "none", border: 0, background: "none", color: "#e2a55a", font: "500 13px/1 var(--font-sans)", cursor: "pointer" }}>{t("login.request")}</button></>
                ) : (
                  <>{t("login.approvedPrompt")} <button type="button" onClick={() => { setMode("login"); }} style={{ appearance: "none", border: 0, background: "none", color: "#e2a55a", font: "500 13px/1 var(--font-sans)", cursor: "pointer" }}>{t("login.signin")}</button></>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Dark-hero variant of a labelled field.
function LoginField({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ font: "500 12px/1 var(--font-sans)", color: "rgba(251,242,220,.7)" }}>{label}</span>
      {children}
    </label>
  );
}

function PendingPanel({ email, onBack }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--brand-cream-2)" }}>
      <div style={{
        width: 56, height: 56, margin: "0 auto 20px",
        borderRadius: 999, background: "rgba(226,165,90,.16)", color: "#e2a55a",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="check" size={26} stroke={1.75} />
      </div>
      <h2 style={{ font: "600 24px/1.2 var(--font-sans)", margin: "0 0 8px", color: "var(--brand-cream-2)" }}>Request submitted</h2>
      <p style={{ font: "400 14px/1.55 var(--font-sans)", margin: 0, color: "rgba(251,242,220,.65)" }}>
        Your access request is pending admin review. You'll receive an email at <b style={{ color: "var(--brand-cream-2)" }}>{email || "your address"}</b> once approved.
      </p>
      <div className="mono" style={{
        marginTop: 24, padding: "12px 14px", textAlign: "left", borderRadius: 12,
        background: "rgba(251,242,220,.04)", border: "0.5px solid rgba(251,242,220,.1)",
        font: "400 12px/1.7 var(--font-mono)", color: "rgba(251,242,220,.6)",
      }}>
        <div><span style={{ color: "rgba(251,242,220,.4)" }}>status   </span>· <span style={{ color: "#e2a55a" }}>● pending</span></div>
        <div><span style={{ color: "rgba(251,242,220,.4)" }}>ticket   </span>· REQ-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 9000 + 1000))}</div>
        <div><span style={{ color: "rgba(251,242,220,.4)" }}>SLA      </span>· typically within 1 business day</div>
      </div>
      <button type="button" onClick={onBack} style={{
        appearance: "none", marginTop: 20, height: 46, padding: "0 18px", borderRadius: 12,
        background: "transparent", color: "var(--brand-cream-2)", border: "1px solid rgba(251,242,220,.18)",
        font: "500 14px/1 var(--font-sans)", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 8,
      }}>
        <Icon name="chevleft" size={13} /> Back to sign in
      </button>
    </div>
  );
}
