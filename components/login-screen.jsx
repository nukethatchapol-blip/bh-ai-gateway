"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon, Field } from "./ui";
import { useLang } from "./lang-context";

export function LoginScreen({ branches = [] }) {
  const router = useRouter();
  const { t } = useLang();
  const [mode, setMode] = useState("login");
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [requestedRole, setRequestedRole] = useState("Staff");
  const [branch, setBranch] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  // Magic-link / OAuth implicit-flow callback (tokens in URL fragment).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasTokens = window.location.hash.includes("access_token=") ||
                      window.location.search.includes("access_token=");
    if (!hasTokens) return;
    const c = createClient();
    const sub = c.auth.onAuthStateChange((event, session) => {
      if (session) {
        history.replaceState(null, "", "/");
        router.push("/chat");
        router.refresh();
      }
    });
    return () => sub?.data?.subscription?.unsubscribe?.();
  }, [router]);

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
    if (error) { setErr(error.message); setBusy(false); }
  }

  async function submitLogin(e) {
    e?.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push("/chat");
    router.refresh();
  }

  async function submitRegister(e) {
    e?.preventDefault();
    setBusy(true); setErr(null);
    const { data, error } = await supabase.auth.signUp({
      email, password: pwd,
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
      await supabase.from("profiles").update({
        full_name: name,
        requested_role: requestedRole.toLowerCase(),
        requested_branch: branch || null,
      }).eq("id", data.user.id);
    }
    setMode("pending");
  }

  const showForm = emailOpen || mode === "register";

  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex", justifyContent: "center",
      // Warm cream radial — same in both themes (the login is the brand surface)
      background: "radial-gradient(120% 80% at 50% 0%, #fbf2dc 0%, #f0e3c4 70%)",
      color: "#3a2a16",
      font: "400 15px/1.4 var(--font-sans)",
    }}>
      <div style={{
        width: "100%", maxWidth: 480, minHeight: "100vh",
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* decorative blobs */}
        <div aria-hidden style={{
          position: "absolute", top: -60, right: -50, width: 200, height: 200, borderRadius: 999,
          background: "radial-gradient(circle, rgba(226,165,90,.25), transparent 70%)", pointerEvents: "none",
        }} />
        <div aria-hidden style={{
          position: "absolute", bottom: 120, left: -70, width: 220, height: 220, borderRadius: 999,
          background: "radial-gradient(circle, rgba(169,107,42,.16), transparent 70%)", pointerEvents: "none",
        }} />

        {mode === "pending" ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", zIndex: 1 }}>
            <PendingPanel email={email} onBack={() => setMode("login")} />
          </div>
        ) : (
          <>
            {/* hero */}
            <div style={{
              flex: 1, position: "relative", zIndex: 1, padding: "0 28px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              {/* bear — no frame, soft glow */}
              <div style={{
                width: 116, height: 116, marginBottom: 22,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "radial-gradient(circle, rgba(217,138,61,.16) 0%, transparent 68%)",
              }}>
                <img src="/bearhouse-bear.png" width={104} height={104} alt="" style={{ display: "block" }} />
              </div>

              <div className="mono" style={{
                font: "600 11px/1 var(--font-mono)", letterSpacing: ".22em",
                textTransform: "uppercase", color: "#a96b2a", marginBottom: 14,
              }}>BEARHOUSE</div>

              <h1 style={{
                font: "600 34px/1.05 var(--font-sans)", letterSpacing: "-0.03em",
                margin: 0, textAlign: "center", color: "#2a1d0e",
              }}>
                ai-store<br />
                <span style={{ color: "#d98a3d" }}>assistant.</span>
              </h1>
              <p style={{
                font: "400 14px/1.5 var(--font-sans)", textAlign: "center",
                marginTop: 14, maxWidth: 280, color: "rgba(58,42,22,.62)",
              }}>{t("login.subhead")}</p>

              {/* email form — collapses until the user opts in */}
              {showForm && (
                <form onSubmit={mode === "login" ? submitLogin : submitRegister}
                  style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, width: "100%", maxWidth: 360 }}>
                  {mode === "register" && (
                    <LoginField label={t("login.fullname")}>
                      <input className="input login-input-light" placeholder="K. Praya Lertsuk" value={name} onChange={(e) => setName(e.target.value)} required />
                    </LoginField>
                  )}
                  <LoginField label={t("login.email")}>
                    <input className="input login-input-light" type="email" placeholder="you@bearhouse.co.th" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </LoginField>
                  <LoginField label={t("login.password")}>
                    <input className="input login-input-light" type="password" placeholder="••••••••" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={8} />
                  </LoginField>
                  {mode === "register" && (
                    <>
                      <LoginField label={t("login.role")}>
                        <select className="input login-input-light" value={requestedRole} onChange={(e) => setRequestedRole(e.target.value)}>
                          <option>Staff</option>
                          <option>Manager</option>
                        </select>
                      </LoginField>
                      <LoginField label={t("login.branch")}>
                        <select className="input login-input-light" value={branch} onChange={(e) => setBranch(e.target.value)}>
                          <option value="">Select…</option>
                          {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                        </select>
                      </LoginField>
                    </>
                  )}

                  {err && (
                    <div style={{
                      padding: "8px 10px", borderRadius: 8,
                      background: "rgba(217,138,61,.16)", color: "#a96b2a",
                      font: "400 12px/1.4 var(--font-sans)",
                    }}>{err}</div>
                  )}

                  <button type="submit" disabled={busy} style={{
                    appearance: "none", border: 0, height: 52, borderRadius: 14, marginTop: 4,
                    background: "#2a1d0e", color: "var(--brand-cream-2)", font: "600 16px/1 var(--font-sans)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
                  }}>
                    {busy ? "…" : (mode === "login" ? t("login.signin") : t("login.submit"))}
                  </button>
                </form>
              )}
            </div>

            {/* frosted-glass auth card (mounted only when form is not expanded) */}
            {!showForm && (
              <div style={{ position: "relative", zIndex: 1, padding: "0 16px", paddingBottom: "calc(var(--safe-bottom) + 18px)" }}>
                <div style={{
                  background: "rgba(255,255,255,.7)",
                  backdropFilter: "blur(20px) saturate(160%)",
                  WebkitBackdropFilter: "blur(20px) saturate(160%)",
                  border: "0.5px solid rgba(255,255,255,.8)",
                  borderRadius: 22, padding: 16,
                  boxShadow: "0 16px 40px -12px rgba(120,80,30,.22)",
                  display: "flex", flexDirection: "column", gap: 9,
                }}>
                  {err && (
                    <div style={{
                      padding: "8px 10px", borderRadius: 8,
                      background: "rgba(217,138,61,.16)", color: "#a96b2a",
                      font: "400 12px/1.4 var(--font-sans)", textAlign: "center",
                    }}>{err}</div>
                  )}

                  <button type="button" onClick={signInWithGoogle} disabled={busy} style={{
                    appearance: "none", border: 0, height: 52, borderRadius: 14,
                    background: "#2a1d0e", color: "var(--brand-cream-2)", font: "600 15.5px/1 var(--font-sans)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer",
                    opacity: busy ? 0.6 : 1,
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 999, background: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Icon name="google" size={13} stroke={0} fill="currentColor" style={{ color: "#4285F4" }} />
                    </span>
                    {t("login.googleBtn")}
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 0" }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(58,42,22,.12)" }} />
                    <span className="mono" style={{
                      font: "500 10px/1 var(--font-mono)", letterSpacing: ".1em",
                      textTransform: "uppercase", color: "rgba(58,42,22,.4)",
                    }}>or</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(58,42,22,.12)" }} />
                  </div>

                  <button type="button" onClick={() => setEmailOpen(true)} style={{
                    appearance: "none", height: 50, borderRadius: 14,
                    background: "transparent", color: "#2a1d0e",
                    border: "1px solid rgba(58,42,22,.16)",
                    font: "500 15px/1 var(--font-sans)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                  }}>
                    <Icon name="user" size={15} stroke={1.6} />
                    {t("login.signinEmail")}
                  </button>
                </div>

                <div style={{
                  textAlign: "center", marginTop: 16,
                  font: "400 13px/1.4 var(--font-sans)", color: "rgba(58,42,22,.55)",
                }}>
                  {t("login.newPrompt")}{" "}
                  <button type="button" onClick={() => { setMode("register"); setEmailOpen(true); }} style={{
                    appearance: "none", border: 0, background: "none", color: "#d98a3d",
                    font: "600 13px/1 var(--font-sans)", cursor: "pointer",
                  }}>{t("login.request")}</button>
                </div>
              </div>
            )}

            {/* footer link when form is open */}
            {showForm && mode !== "login" && (
              <div style={{
                padding: "0 24px", paddingBottom: "calc(var(--safe-bottom) + 18px)",
                textAlign: "center", font: "400 13px/1.4 var(--font-sans)", color: "rgba(58,42,22,.55)", zIndex: 1,
              }}>
                {t("login.approvedPrompt")}{" "}
                <button type="button" onClick={() => { setMode("login"); }} style={{
                  appearance: "none", border: 0, background: "none", color: "#d98a3d",
                  font: "600 13px/1 var(--font-sans)", cursor: "pointer",
                }}>{t("login.signin")}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LoginField({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ font: "500 12px/1 var(--font-sans)", color: "rgba(58,42,22,.7)" }}>{label}</span>
      {children}
    </label>
  );
}

function PendingPanel({ email, onBack }) {
  const { t } = useLang();
  return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "#2a1d0e", zIndex: 1, position: "relative" }}>
      <div style={{
        width: 56, height: 56, margin: "0 auto 20px",
        borderRadius: 999, background: "rgba(217,138,61,.16)", color: "#d98a3d",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="check" size={26} stroke={1.75} />
      </div>
      <h2 style={{ font: "600 22px/1.2 var(--font-sans)", margin: 0 }}>{t("login.pendingTitle") || "Request received"}</h2>
      <p style={{ font: "400 14px/1.55 var(--font-sans)", color: "rgba(58,42,22,.62)", marginTop: 10 }}>
        {t("login.pendingBody") || "An admin will review your request and email you when it's approved."}
        <br />
        <span className="mono" style={{ font: "500 12px/1 var(--font-mono)", color: "#d98a3d" }}>{email}</span>
      </p>
      <button type="button" onClick={onBack} style={{
        appearance: "none", marginTop: 22, height: 44, padding: "0 22px", borderRadius: 12,
        background: "#2a1d0e", color: "var(--brand-cream-2)", font: "600 14px/1 var(--font-sans)",
        border: 0, cursor: "pointer",
      }}>{t("common.back") || "Back"}</button>
    </div>
  );
}
