"use client";

import React from "react";
import Link from "next/link";
import { Icon, Avatar } from "./ui";
import { NavBar, SectionHeader, GroupCard, roundBtn } from "./mobile-ui";
import { useLang } from "./lang-context";

// Activity Overview screen — Phase C of the mobile redesign.
// Peach hero ("Automation Impact"), two stat cards with segmented progress
// bars (Sales Synced / Stock Alerts), and a Connected Branches card with
// an icon grid. Reuses the global app shell (MobileShell + TabBar).
export function ActivityScreen({
  profile, branches = [], authorizedIds = [],
  hoursSaved = 0, events = 0,
  salesSyncedPct = 0, branchesWithSales = 0,
  stockAlerts = 0,
}) {
  const { t } = useLang();
  const connected = authorizedIds.length;
  const total = branches.length;
  const sampleConnected = branches
    .filter((b) => authorizedIds.includes(b.id))
    .slice(0, 12);

  return (
    <>
      <NavBar
        title={t("activity.title")}
        sub={`${connected} ${connected === 1 ? "branch" : "branches"} in scope`}
        leading={<Avatar name={profile?.full_name || profile?.email || "?"} size={32} />}
        trailing={
          <Link href="/dashboard" style={{ ...roundBtn(), textDecoration: "none" }} aria-label="Dashboard">
            <Icon name="dashboard" size={14} />
          </Link>
        }
      />

      {/* === Hero card with stacked-shadow effect === */}
      <div style={{ padding: "0 16px", position: "relative", marginBottom: 14 }}>
        {/* back stack layer 2 — peach-stack-2 */}
        <div style={{
          position: "absolute", left: 28, right: 28, top: 14, height: 120,
          background: "var(--peach-stack-2)", borderRadius: 18, zIndex: 0,
        }} />
        {/* back stack layer 1 — peach-stack-1 */}
        <div style={{
          position: "absolute", left: 22, right: 22, top: 8, height: 120,
          background: "var(--peach-stack-1)", borderRadius: 18, zIndex: 1,
        }} />
        {/* main hero card */}
        <div style={{
          position: "relative", zIndex: 2,
          background: "var(--peach-grad)", color: "var(--peach-deep-ink)",
          borderRadius: 18, padding: "18px 18px 20px",
          boxShadow: "0 12px 28px -16px rgba(238, 154, 100, 0.55)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 26, height: 26, borderRadius: 8,
              background: "rgba(255,255,255,.35)", color: "var(--peach-deep-ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="bolt" size={14} stroke={1.8} />
            </span>
            <span className="mono" style={{
              font: "600 11px/1 var(--font-mono)", letterSpacing: ".08em",
              textTransform: "uppercase",
            }}>{t("activity.heroLabel")}</span>
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="tnum" style={{
              font: "700 44px/1 var(--font-sans)", letterSpacing: "-0.02em",
            }}>{hoursSaved.toFixed(1)}</span>
            <span style={{ font: "500 14px/1 var(--font-sans)", color: "var(--peach-ink)" }}>hours</span>
          </div>
          <div style={{
            font: "400 12.5px/1.3 var(--font-sans)", color: "var(--peach-ink)", marginTop: 6,
          }}>
            {t("activity.heroValueSub")} · {events.toLocaleString()} events handled
          </div>

          {/* mini sparkline-style bar */}
          <div style={{
            marginTop: 14, display: "flex", alignItems: "flex-end", gap: 3, height: 28,
          }}>
            {Array.from({ length: 14 }).map((_, i) => {
              // Deterministic peaks/troughs so SSR + CSR match without RNG.
              const h = 6 + ((i * 31 + 11) % 18) + (i === 13 ? 6 : 0);
              return (
                <div key={i} style={{
                  flex: 1, height: h,
                  background: i === 13 ? "var(--peach-deep-ink)" : "rgba(58, 35, 15, 0.35)",
                  borderRadius: 2,
                }} />
              );
            })}
          </div>
        </div>
      </div>

      {/* === Two stat cards === */}
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <StatCard
          label={t("activity.salesSynced")}
          value={`${salesSyncedPct.toFixed(2)}%`}
          fill={Math.round(salesSyncedPct)}
          sub={`${branchesWithSales}/${Math.max(1, authorizedIds.length)} branches`}
          tint="var(--peach-b)"
        />
        <StatCard
          label={t("activity.stockAlerts")}
          value={stockAlerts.toLocaleString()}
          fill={Math.min(100, stockAlerts * 5)}
          sub={stockAlerts ? "items below par" : "no alerts"}
          tint={stockAlerts ? "var(--accent)" : "var(--green-ok)"}
        />
      </div>

      {/* === Connected branches card === */}
      <SectionHeader>{t("activity.connected")}</SectionHeader>
      <GroupCard style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="tnum" style={{
            font: "700 30px/1 var(--font-sans)", color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}>{connected}</span>
          <span style={{ font: "400 13px/1.2 var(--font-sans)", color: "var(--muted)" }}>
            / {total} {t("activity.connected.sub", { n: connected, total })}
          </span>
        </div>

        {/* Mini icon grid — up to 12 connected branches, then a "+N" tile */}
        <div style={{
          marginTop: 14, display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)", gap: 8,
        }}>
          {sampleConnected.map((b) => (
            <div key={b.id} title={b.name} style={{
              aspectRatio: "1", borderRadius: 10,
              background: "var(--peach-stack-1)", color: "var(--peach-deep-ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
              font: "600 11px/1 var(--font-mono)",
              border: "0.5px solid var(--peach-stack-2)",
            }}>{b.id.slice(0, 3).toUpperCase()}</div>
          ))}
          {connected > 12 && (
            <div style={{
              aspectRatio: "1", borderRadius: 10,
              background: "var(--bg-2)", color: "var(--muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              font: "600 11px/1 var(--font-mono)",
              border: "0.5px solid var(--line)",
            }}>+{connected - 12}</div>
          )}
        </div>
      </GroupCard>

      <div style={{ height: 28 }} />
    </>
  );
}

// Single stat card with a segmented progress bar (10 cells, filled proportionally).
function StatCard({ label, value, fill, sub, tint }) {
  const cells = 10;
  const filled = Math.max(0, Math.min(cells, Math.round((fill / 100) * cells)));
  return (
    <div style={{
      background: "var(--panel)", border: "0.5px solid var(--line)",
      borderRadius: 14, padding: 14,
    }}>
      <div style={{
        font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)",
        letterSpacing: ".06em", textTransform: "uppercase",
      }}>{label}</div>
      <div className="tnum" style={{
        font: "700 22px/1 var(--font-sans)", marginTop: 10,
        letterSpacing: "-0.01em", color: "var(--ink)",
      }}>{value}</div>

      {/* segmented bar */}
      <div style={{ marginTop: 10, display: "flex", gap: 3 }}>
        {Array.from({ length: cells }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 5, borderRadius: 1,
            background: i < filled ? tint : "var(--bg-2)",
          }} />
        ))}
      </div>
      <div style={{
        font: "400 11px/1.2 var(--font-sans)", color: "var(--muted)", marginTop: 8,
      }}>{sub}</div>
    </div>
  );
}
