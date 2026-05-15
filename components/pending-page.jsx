"use client";

import { useRouter } from "next/navigation";
import { BearLogo, Icon } from "./ui";

export function PendingPage({ profile }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <div style={{
      minHeight: "100vh", width: "100vw", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div className="card" style={{ width: 420, padding: 28, textAlign: "center" }}>
        <BearLogo size={56} radius={14} />
        <div style={{
          width: 48, height: 48, margin: "16px auto 12px",
          borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="check" size={22} stroke={1.75} />
        </div>
        <h2 className="h-1" style={{ marginBottom: 8 }}>Waiting on admin</h2>
        <p className="muted" style={{ font: "400 14px/1.55 var(--font-sans)", margin: 0 }}>
          Hi <b style={{ color: "var(--ink)" }}>{profile?.full_name || profile?.email}</b> — your account is pending approval. You'll be notified by email once an admin grants access.
        </p>
        <button className="btn" onClick={logout} style={{ marginTop: 20 }} type="button">
          <Icon name="ext" size={13} /> Sign out
        </button>
      </div>
    </div>
  );
}
