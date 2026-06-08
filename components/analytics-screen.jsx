"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon, Avatar, Ring, DenseBars } from "./ui";
import { roundBtn } from "./mobile-ui";
import { useLang } from "./lang-context";

// Analytics Dashboard — Phase H.
// Implements the "Branch Performance Insights" card + "Top performers" rows
// from the new design. Numbers are derived server-side and passed in;
// the screen is purely presentational.
export function AnalyticsScreen({
  profile, efficiencyPct = 0, metrics = {}, bars, topPerformers = [], range,
}) {
  const { t } = useLang();
  const [scope, setScope] = useState("util"); // util | closures — local toggle

  return (
    <>
      {/* top bar */}
      <div style={{ padding: "8px 16px 6px", display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/dashboard" aria-label="Back" style={iconBtn()}>
          <Icon name="chevleft" size={14} stroke={2} />
        </Link>
        <div style={{ flex: 1, font: "600 17px/1.2 var(--font-sans)", color: "var(--ink)", textAlign: "center" }}>
          {t("analytics.title")}
        </div>
        <button type="button" aria-label="Filter" style={iconBtn()}>
          <Icon name="filter" size={14} />
        </button>
      </div>

      <div style={{ padding: "8px 16px 24px" }}>
        {/* === Branch Performance Insights card === */}
        <div style={cardStyle()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 16px" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              font: "600 14px/1 var(--font-sans)", color: "var(--ink)",
            }}>
              <Icon name="sparkles" size={14} style={{ color: "var(--accent)" }} />
              {t("analytics.insightsTitle")}
            </span>
            <span aria-hidden style={{ color: "var(--muted)" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 11L11 5" /><path d="M6 5h5v5" />
              </svg>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "0 18px" }}>
            <div>
              <div style={{ font: "400 12px/1.3 var(--font-sans)", color: "var(--muted)" }}>
                {t("analytics.efficiencyLabel")}
              </div>
              <div className="tnum" style={{
                font: "700 34px/1 var(--font-sans)", letterSpacing: "-0.02em",
                color: "var(--ink)", marginTop: 8,
              }}>{efficiencyPct.toFixed(1)}%</div>
            </div>
            <div style={{
              display: "flex", gap: 4, padding: 3,
              background: "var(--bg-2)", borderRadius: 10,
            }}>
              {[
                { id: "util",     label: t("analytics.tab.utilization") },
                { id: "closures", label: t("analytics.tab.closures") },
              ].map((tab) => {
                const active = scope === tab.id;
                return (
                  <button key={tab.id} type="button" onClick={() => setScope(tab.id)} style={{
                    appearance: "none", border: 0, cursor: "pointer",
                    padding: "6px 10px", borderRadius: 7,
                    font: `${active ? 600 : 500} 11px/1 var(--font-sans)`,
                    background: active ? "var(--panel)" : "transparent",
                    color: active ? "var(--ink)" : "var(--muted)",
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,.05)" : "none",
                  }}>{tab.label}</button>
                );
              })}
            </div>
          </div>

          {/* metric row */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 18px 18px" }}>
            <MetricCell v={`${(metrics.sellThrough ?? 0).toFixed(0)}%`} l={t("analytics.metric.sellThrough")} />
            <MetricCell v={`${(metrics.stockHealth ?? 0).toFixed(0)}%`} l={t("analytics.metric.stockHealth")} />
            <MetricCell v={`${(metrics.promoMix   ?? 0).toFixed(0)}%`}  l={t("analytics.metric.promoMix")} />
            <MetricCell v={`${(metrics.waste      ?? 0).toFixed(0)}%`}  l={t("analytics.metric.waste")} />
          </div>

          {/* dense bar chart */}
          <div style={{ padding: "0 18px 18px" }}>
            <div style={{ width: "100%" }}>
              <DenseBars data={bars || undefined} w={300} h={110} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span className="mono" style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)" }}>
                {labelMonth(range?.from)}
              </span>
              <span className="mono" style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)" }}>
                {labelMonth(range?.to)}
              </span>
            </div>
          </div>
        </div>

        {/* === Top performer rows with rings === */}
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {topPerformers.length === 0 && (
            <div style={{
              ...cardStyle(), padding: 24, textAlign: "center",
              color: "var(--muted)", font: "400 13px/1.4 var(--font-sans)",
            }}>{t("analytics.noTopPerformers")}</div>
          )}
          {topPerformers.map((b, i) => (
            <TopRow key={b.branchRef} branch={b} index={i} />
          ))}
        </div>
      </div>
    </>
  );
}

function MetricCell({ v, l }) {
  return (
    <div>
      <div className="tnum" style={{ font: "700 16px/1 var(--font-sans)", color: "var(--ink)" }}>{v}</div>
      <div style={{ font: "400 10px/1.2 var(--font-sans)", color: "var(--muted)", marginTop: 5 }}>{l}</div>
    </div>
  );
}

function TopRow({ branch, index }) {
  const { t } = useLang();
  // Ring rendered as bills handled — display label is the bill count.
  const ringV = branch.bills;
  const ringT = Math.max(ringV, Math.ceil(branch.bills * 1.25));
  return (
    <div style={{ ...cardStyle(), padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
      <Avatar name={branch.branchName} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          font: "600 14.5px/1.2 var(--font-sans)", color: "var(--ink)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{branch.branchName}</div>
        <div className="mono" style={{
          font: "400 11px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4,
        }}>{branch.branchRef}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          <div>
            <div className="tnum" style={{ font: "600 13px/1 var(--font-sans)", color: "var(--ink)" }}>
              {ringV.toLocaleString()}
            </div>
            <div style={{ font: "400 10px/1.2 var(--font-sans)", color: "var(--muted)", marginTop: 4 }}>
              {t("analytics.row.bills")}
            </div>
          </div>
          <div>
            <div className="tnum" style={{ font: "600 13px/1 var(--font-sans)", color: "var(--ink)" }}>
              ฿{(branch.revenue / 1000).toFixed(0)}K
            </div>
            <div style={{ font: "400 10px/1.2 var(--font-sans)", color: "var(--muted)", marginTop: 4 }}>
              {t("analytics.row.revenue")}
            </div>
          </div>
        </div>
      </div>
      <Ring
        value={ringV}
        total={ringT}
        size={64}
        stroke={6}
        color={index === 0 ? "var(--peach-b)" : "var(--green-ok)"}
        label={ringV >= 1000 ? `${(ringV / 1000).toFixed(1)}k` : String(ringV)}
        sub={`${Math.round(branch.share * 100)}%`}
      />
    </div>
  );
}

function cardStyle() {
  return {
    background: "var(--panel)",
    border: "0.5px solid var(--line)",
    borderRadius: 18,
    boxShadow: "0 1px 2px rgba(0,0,0,.03)",
  };
}

function iconBtn() {
  return {
    width: 40, height: 40, borderRadius: 13, flexShrink: 0, cursor: "pointer",
    border: "0.5px solid var(--line)", background: "var(--panel)", color: "var(--ink)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    textDecoration: "none",
  };
}

function labelMonth(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short" });
}
