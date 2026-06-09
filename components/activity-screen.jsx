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
  periodRev = 0, periodPct = null,
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
        <Link href="/assistant" aria-label={t("assistant.title")} style={iconBtn()}>
          <Icon name="sparkles" size={14} />
        </Link>
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

          {/* Single CTA — "View all branches" replaces dot carousel + calendar */}
          <Link href="/dashboard" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", height: 42, borderRadius: 13, padding: "0 16px",
            background: "rgba(255,255,255,.55)", color: "var(--peach-deep-ink)",
            font: "600 13.5px/1 var(--font-sans)", textDecoration: "none",
          }}>
            {t("activity.viewAllBranches")}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 11L11 5" /><path d="M6 5h5v5" />
            </svg>
          </Link>
        </div>
      </div>

      {/* === Two simple, concrete metric cards (Phase R) === */}
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <OverviewStat
          icon="store"
          tint="var(--accent)" soft="var(--accent-soft)"
          label={t("activity.todaySales")}
          value={fmtK(periodRev, "฿")}
          delta={periodPct == null ? null : `${periodPct >= 0 ? "+" : ""}${periodPct.toFixed(1)}%`}
          up={periodPct == null ? true : periodPct >= 0}
        />
        <OverviewStat
          icon="bolt"
          tint="#d8593f" soft="rgba(216,89,63,.1)"
          label={t("activity.stockAlerts")}
          value={stockAlerts.toLocaleString()}
          deltaText={stockAlerts > 0 ? t("activity.needRestock") : t("activity.allClear")}
        />
      </div>

      {/* === My branches — single-row pill (Phase R) === */}
      <Link href="/access" style={{
        margin: "0 16px",
        background: "var(--panel)", border: "0.5px solid var(--line)",
        borderRadius: 18, boxShadow: "0 1px 2px rgba(0,0,0,.03)",
        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
        textDecoration: "none", color: "inherit",
      }}>
        <span style={{
          width: 42, height: 42, borderRadius: 13, flexShrink: 0,
          background: "var(--accent-soft)", color: "var(--accent-ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="dashboard" size={19} stroke={1.6} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "600 14px/1.2 var(--font-sans)", color: "var(--ink)" }}>
            {t("activity.myBranches")}
          </div>
          <div style={{ font: "400 12px/1.3 var(--font-sans)", color: "var(--muted)", marginTop: 3 }}>
            {t("activity.myBranches.sub", { n: connected })}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div className="tnum" style={{ font: "700 18px/1 var(--font-sans)", color: "var(--ink)" }}>
            {connected}
            <span className="mono" style={{ font: "500 12px/1 var(--font-mono)", color: "var(--muted-2)" }}> / {total}</span>
          </div>
        </div>
        <Icon name="chevright" size={15} stroke={1.7} style={{ color: "var(--muted-2)" }} />
      </Link>

      {/* === Workspace apps launcher (Phase O) === */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "20px 18px 12px",
      }}>
        <span style={{ font: "600 14px/1 var(--font-sans)", color: "var(--ink)" }}>
          {t("activity.workspaceApps")}
        </span>
        <span style={{
          marginLeft: "auto",
          font: "500 11px/1 var(--font-sans)", color: "var(--accent-ink)",
        }}>{t("activity.viewAll")}</span>
      </div>
      <div style={{
        padding: "0 16px",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10,
      }}>
        {[
          {
            ic: "clock", label: t("apps.shift").split(/\s+/)[0],
            sub: t("apps.shift").split(/\s+/).slice(1).join(" ") || "Management",
            tint: "var(--accent)", soft: "var(--accent-soft)",
            badge: "2 open",
            href: process.env.NEXT_PUBLIC_APP_SHIFT_URL || "#",
          },
          {
            ic: "ticket", label: "BD",
            sub: "Ticket",
            tint: "#3b82c4", soft: "rgba(59,130,196,.1)",
            badge: "5",
            href: process.env.NEXT_PUBLIC_APP_BDTICKET_URL || "#",
          },
          {
            ic: "flag", label: t("apps.complain").split(/\s+/)[0],
            sub: t("apps.complain").split(/\s+/).slice(1).join(" ") || "Case",
            tint: "#d8593f", soft: "rgba(216,89,63,.1)",
            badge: "1 new",
            href: process.env.NEXT_PUBLIC_APP_COMPLAIN_URL || "#",
          },
        ].map((app) => (
          <AppLauncherTile key={app.label} app={app} />
        ))}
      </div>

      <div style={{ height: 24 }} />
    </>
  );
}

// One launcher tile — icon top-left, arrow-NE top-right, badge under arrow,
// label + sub bottom. Renders as an <a> when href is non-empty so taps
// actually navigate to the linked app.
function AppLauncherTile({ app }) {
  const linked = app.href && app.href !== "#";
  const Inner = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <span style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: app.soft, color: app.tint,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name={app.ic} size={18} stroke={1.7} />
        </span>
        <span aria-hidden style={{ display: "inline-flex", color: "var(--muted-2)", transform: "translateY(2px)" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 11L11 5" /><path d="M6 5h5v5" />
          </svg>
        </span>
      </div>
      <div>
        <div style={{ font: "600 13px/1.2 var(--font-sans)", color: "var(--ink)" }}>{app.label}</div>
        <div style={{ font: "400 11px/1.2 var(--font-sans)", color: "var(--muted)", marginTop: 2 }}>{app.sub}</div>
      </div>
      {app.badge && (
        <span style={{
          position: "absolute", top: 11, right: 34,
          font: "600 9px/1 var(--font-mono)", color: app.tint,
          background: app.soft, borderRadius: 999, padding: "3px 6px",
        }}>{app.badge}</span>
      )}
    </>
  );
  const style = {
    appearance: "none", cursor: linked ? "pointer" : "default", textAlign: "left",
    textDecoration: "none",
    background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 16,
    padding: "13px 12px", position: "relative",
    boxShadow: "0 1px 2px rgba(0,0,0,.03)",
    display: "flex", flexDirection: "column", gap: 10,
    color: "inherit",
    opacity: linked ? 1 : 0.95,
  };
  return linked ? (
    <a href={app.href} target="_blank" rel="noopener noreferrer" style={style}>{Inner}</a>
  ) : (
    <button type="button" style={style}>{Inner}</button>
  );
}

// One-number overview stat (Phase R) — icon + big value + label + tiny delta.
// Replaces the old StatCard with its abstract multi-color segmented bar.
function OverviewStat({ icon, tint, soft, label, value, delta, deltaText, up }) {
  return (
    <div style={{
      background: "var(--panel)", border: "0.5px solid var(--line)",
      borderRadius: 18, padding: 16,
      boxShadow: "0 1px 2px rgba(0,0,0,.03)",
    }}>
      <span style={{
        width: 32, height: 32, borderRadius: 10,
        background: soft, color: tint,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name={icon} size={16} stroke={1.7} />
      </span>
      <div className="tnum" style={{
        font: "700 26px/1 var(--font-sans)", letterSpacing: "-0.02em",
        color: "var(--ink)", marginTop: 14,
      }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9 }}>
        <span style={{ font: "500 12px/1.2 var(--font-sans)", color: "var(--muted)" }}>{label}</span>
        {delta && (
          <span className="tnum" style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3,
            font: "600 11px/1 var(--font-mono)",
            color: up ? "var(--green-ok)" : "#d8593f",
          }}>
            <span aria-hidden style={{ display: "inline-flex" }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {up
                  ? <path d="M3 11l4-4 3 3 4-5" />
                  : <path d="M3 5l4 4 3-3 4 5" />}
              </svg>
            </span>
            {delta.replace(/^[+-]/, "")}
          </span>
        )}
        {deltaText && !delta && (
          <span style={{
            marginLeft: "auto",
            font: "600 11px/1 var(--font-sans)", color: "#d8593f",
          }}>{deltaText}</span>
        )}
      </div>
    </div>
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

function fmtK(n, prefix = "") {
  if (n == null) return "—";
  if (n >= 1e6)   return `${prefix}${(n / 1e6).toFixed(2)}M`;
  if (n >= 1000)  return `${prefix}${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `${prefix}${Math.round(n)}`;
}
