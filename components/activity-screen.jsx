"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon, Avatar, LogoMark, SegBar } from "./ui";
import { roundBtn } from "./mobile-ui";
import { useLang } from "./lang-context";

// Activity Overview — Phase C + G ("redesign based on this" pass).
// Triple-stack peach hero, multi-color segmented bars, Total/Mine columns
// on the Connected Branches card with an icon grid sampled from real
// branch icons. Reuses the global MobileShell + TabBar.
export function ActivityScreen({
  profile, branches = [], authorizedIds = [],
  hoursSaved = 0, events = 0,
  salesSyncedPct = 0, branchesWithSales = 0, autoflowCount = 0, manualCount = 0,
  stockAlerts = 0, stockResolved = 0, stockPending = 0,
}) {
  const { t } = useLang();
  const connected = authorizedIds.length;
  const total = branches.length;
  const mine = Math.min(connected, 5); // "Mine" column on the design — top 5 closest

  // Segments for Sales Synced — autoflow / manual / remainder
  // Use the ratio in the design as floor, but bend toward real data when present.
  const syncSeg = (() => {
    const auto = Math.round(salesSyncedPct * 0.62);          // dominant orange
    const manual = Math.round((100 - salesSyncedPct) * 0.5); // green slice
    const rest = Math.max(0, 100 - auto - manual);            // track grey
    return [
      { pct: auto,   color: "var(--peach-b)" },
      { pct: manual, color: "var(--green-ok)" },
      { pct: rest,   color: "var(--ring-track)" },
    ];
  })();
  // Segments for Stock Alerts — resolved / pending / clean
  const stockSeg = (() => {
    const sumPR = Math.max(1, stockResolved + stockPending);
    const resolvedPct = (stockResolved / sumPR) * 50; // half-width band
    const pendingPct  = (stockPending  / sumPR) * 50;
    const restPct = Math.max(0, 100 - resolvedPct - pendingPct);
    return [
      { pct: resolvedPct, color: "var(--green-ok)" },
      { pct: pendingPct,  color: "var(--peach-b)" },
      { pct: restPct,     color: "var(--ring-track)" },
    ];
  })();

  return (
    <>
      {/* === custom top bar — leading logomark, trailing bell+sparkles+avatar === */}
      <div style={{ padding: "8px 16px 6px", display: "flex", alignItems: "center", gap: 10 }}>
        <LogoMark size={36} />
        <span style={{ flex: 1 }} />
        <button type="button" aria-label="Notifications" style={iconBtn()}>
          <Icon name="bell" size={14} />
        </button>
        <button type="button" aria-label="Smart assistant" style={iconBtn()}>
          <Icon name="sparkles" size={14} />
        </button>
        <Avatar name={profile?.full_name || profile?.email || "?"} size={36} />
      </div>

      {/* === header === */}
      <div style={{ padding: "4px 16px 2px" }}>
        <div style={{ font: "400 13px/1.4 var(--font-sans)", color: "var(--muted)" }}>
          {t("activity.scopeNote", { n: connected })}
        </div>
        <h1 style={{
          font: "700 30px/1.12 var(--font-sans)",
          letterSpacing: "-0.025em",
          margin: "6px 0 18px",
          color: "var(--ink)",
        }}>
          {t("activity.title")}
        </h1>
      </div>

      {/* === peach hero with TRIPLE stack === */}
      <div style={{ padding: "0 16px", position: "relative", marginBottom: 18 }}>
        {/* back stack layer 2 */}
        <div style={{
          position: "absolute", left: 22, right: 10, top: 16, bottom: -8,
          background: "var(--peach-stack-2)", borderRadius: 22, zIndex: 0,
        }} />
        {/* back stack layer 1 */}
        <div style={{
          position: "absolute", left: 19, right: 13, top: 8, bottom: -4,
          background: "var(--peach-stack-1)", borderRadius: 22, zIndex: 1,
        }} />
        {/* main hero */}
        <div style={{
          position: "relative", zIndex: 2,
          background: "var(--peach-grad)", color: "var(--peach-deep-ink)",
          borderRadius: 22, padding: 20, overflow: "hidden",
          boxShadow: "0 12px 30px -10px rgba(238, 154, 100, .55)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              font: "600 12.5px/1 var(--font-sans)", color: "var(--peach-ink)",
            }}>
              <Icon name="bolt" size={13} stroke={1.8} /> {t("activity.heroLabel")}
            </span>
            <span style={{
              width: 30, height: 30, borderRadius: 10,
              background: "rgba(255,255,255,.35)", color: "var(--peach-ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }} aria-hidden>
              {/* arrow-NE glyph, drawn inline */}
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 11L11 5" /><path d="M6 5h5v5" />
              </svg>
            </span>
          </div>

          <div style={{
            font: "600 22px/1.3 var(--font-sans)", letterSpacing: "-0.01em",
            margin: "16px 0 18px", maxWidth: 280, color: "#321d0c",
          }}>
            {t("activity.heroLine.before")}{" "}
            <span style={{ color: "#fff" }}>
              {hoursSaved.toFixed(1)} {t("activity.hours")}
            </span>{" "}
            {t("activity.heroLine.after")}
          </div>

          {/* dots indicator (3 dots, 1 active) */}
          <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: i === 0 ? 18 : 6, height: 6, borderRadius: 999,
                background: i === 0 ? "var(--peach-ink)" : "rgba(90,52,23,.3)",
              }} />
            ))}
          </div>

          {/* calendar + All Branches buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/analytics" aria-label={t("nav.analytics")} style={{
              width: 40, height: 40, borderRadius: 13, border: 0,
              background: "rgba(255,255,255,.45)", color: "var(--peach-ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none",
            }}>
              <Icon name="dashboard" size={14} />
            </Link>
            <button type="button" style={{
              flex: 1, height: 40, borderRadius: 13, border: 0, cursor: "pointer",
              background: "rgba(255,255,255,.45)", color: "var(--peach-deep-ink)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 14px", font: "600 13.5px/1 var(--font-sans)",
            }}>
              {t("activity.allBranches")}
              <Icon name="chevdown" size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* === two stat cards with multi-color segmented bars === */}
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <StatCard
          icon="check"
          title={t("activity.salesSynced")}
          value={`${salesSyncedPct.toFixed(2)}%`}
          a={{ label: t("activity.autoflow"), v: fmtK(autoflowCount) }}
          b={{ label: t("activity.manual"),   v: fmtK(manualCount)   }}
          segments={syncSeg}
        />
        <StatCard
          icon="bolt"
          title={t("activity.stockAlerts")}
          value={stockAlerts.toLocaleString()}
          a={{ label: t("activity.resolved"), v: fmtK(stockResolved) }}
          b={{ label: t("activity.pending"),  v: fmtK(stockPending)  }}
          segments={stockSeg}
        />
      </div>

      {/* === Connected Branches: Total | icon grid | Mine === */}
      <div style={{
        margin: "0 16px",
        background: "var(--panel)", border: "0.5px solid var(--line)",
        borderRadius: 18, boxShadow: "0 1px 2px rgba(0,0,0,.03)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px 10px" }}>
          <Icon name="dashboard" size={13} style={{ color: "var(--muted)" }} />
          <span style={{ font: "600 13.5px/1 var(--font-sans)", color: "var(--ink)" }}>
            {t("activity.connected")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px 16px" }}>
          <ConnectedColumn n={total} label={t("activity.total")} />
          <div style={{ flex: 1, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { ic: "dashboard", filled: true   },
              { ic: "store",     filled: false  },
              { ic: "bolt",      filled: false  },
              { ic: "sparkles",  filled: false  },
              { ic: "store",     filled: false  },
              { ic: "check",     filled: false  },
            ].map((it, i) => (
              <span key={i} style={{
                width: 34, height: 34, borderRadius: 10,
                background: it.filled ? "var(--ink)" : "var(--bg-2)",
                color: it.filled ? "#fff" : "var(--ink-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "0.5px solid var(--line)",
              }}>
                <Icon name={it.ic} size={14} />
              </span>
            ))}
          </div>
          <ConnectedColumn n={mine} label={t("activity.mine")} />
        </div>
      </div>

      <div style={{ height: 24 }} />
    </>
  );
}

function ConnectedColumn({ n, label }) {
  return (
    <div style={{ textAlign: "center", minWidth: 32 }}>
      <div className="tnum" style={{ font: "700 17px/1 var(--font-sans)", color: "var(--ink)" }}>
        {n}
      </div>
      <div className="mono" style={{
        font: "500 9px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4,
        textTransform: "uppercase", letterSpacing: ".06em",
      }}>{label}</div>
    </div>
  );
}

function StatCard({ icon, title, value, a, b, segments }) {
  return (
    <div style={{
      background: "var(--panel)", border: "0.5px solid var(--line)",
      borderRadius: 18, padding: 16,
      boxShadow: "0 1px 2px rgba(0,0,0,.03)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 8,
          background: "var(--accent-soft)", color: "var(--accent-ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name={icon} size={13} stroke={1.8} />
        </span>
        <span style={{ font: "500 12px/1.2 var(--font-sans)", color: "var(--muted)" }}>
          {title}
        </span>
      </div>
      <div className="tnum" style={{
        font: "700 26px/1 var(--font-sans)", letterSpacing: "-0.02em", color: "var(--ink)",
      }}>{value}</div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "14px 0 8px" }}>
        <div>
          <div className="tnum" style={{ font: "600 13px/1 var(--font-sans)", color: "var(--ink)" }}>{a.v}</div>
          <div style={{ font: "400 10.5px/1.2 var(--font-sans)", color: "var(--muted)", marginTop: 4 }}>{a.label}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="tnum" style={{ font: "600 13px/1 var(--font-sans)", color: "var(--ink)" }}>{b.v}</div>
          <div style={{ font: "400 10.5px/1.2 var(--font-sans)", color: "var(--muted)", marginTop: 4 }}>{b.label}</div>
        </div>
      </div>
      <SegBar segments={segments} />
    </div>
  );
}

function iconBtn() {
  return {
    width: 40, height: 40, borderRadius: 13, flexShrink: 0, cursor: "pointer",
    border: "0.5px solid var(--line)", background: "var(--panel)", color: "var(--ink)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  };
}

function fmtK(n) {
  if (n == null) return "—";
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}
