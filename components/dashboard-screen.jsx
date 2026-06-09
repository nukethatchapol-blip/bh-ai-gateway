"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Sparkline, Avatar } from "./ui";
import { NavBar, SectionHeader, GroupCard, roundBtn, Sheet } from "./mobile-ui";
import { useLang } from "./lang-context";
import { StrategyPanel } from "./strategy-panel";

function sumDaily(rows) {
  let rev = 0, bills = 0, member = 0;
  for (const r of rows || []) {
    rev += Number(r.net_revenue || 0);
    bills += Number(r.bills || 0);
    member += Number(r.member_bills || 0);
  }
  return { rev, bills, member, aov: bills ? rev / bills : 0, memberPct: bills ? (member / bills) * 100 : 0 };
}
function pctDelta(cur, prev) {
  if (!prev) return null; // no prior baseline → caller shows "new"
  return ((cur - prev) / prev) * 100;
}
function fmtDelta(d, t) {
  if (d === null || !isFinite(d)) return { text: t("dash.deltaNew"), neg: false };
  return { text: `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`, neg: d < 0 };
}

function fmtRange(from, to, lang) {
  // human-friendly compact range, locale-aware
  const f = new Date(from), t = new Date(to);
  const opts = { day: "numeric", month: "short" };
  const fL = f.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", opts);
  const tL = t.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", opts);
  return `${fL} – ${tL}`;
}

export function DashboardScreen({ profile, branches, authorizedIds, kpis = [], kpisPrior = [], daily = [], dailyPrior = [], promotions = [], products = [], invWatch = [], from, to }) {
  const router = useRouter();
  const { t, lang } = useLang();
  const [scope, setScope] = useState("ALL");
  const [dateSheet, setDateSheet] = useState(false);

  function applyRange(nextFrom, nextTo) {
    const qs = new URLSearchParams({ from: nextFrom, to: nextTo }).toString();
    router.push(`/dashboard?${qs}`);
    router.refresh();
  }

  const kpiByRef = useMemo(() => {
    const m = {};
    kpis.forEach((k) => { m[k.branch_ref] = k; });
    return m;
  }, [kpis]);

  const visible = useMemo(() => {
    const auth = branches.filter((b) => authorizedIds.includes(b.id));
    return scope === "ALL" ? auth : auth.filter((b) => b.id === scope);
  }, [branches, authorizedIds, scope]);

  const kpiPriorByRef = useMemo(() => {
    const m = {};
    kpisPrior.forEach((k) => { m[k.branch_ref] = k; });
    return m;
  }, [kpisPrior]);

  const stats = useMemo(() => visible.map((b) => {
    const real = kpiByRef[b.id];
    const sales = Number(real?.net_revenue || 0);
    const priorSales = Number(kpiPriorByRef[b.id]?.net_revenue || 0);
    return {
      ...b,
      sales,
      customers: Number(real?.bills || 0),
      // null = no prior baseline → render as "new", not as +0.0%.
      growth: pctDelta(sales, priorSales),
    };
  }), [visible, kpiByRef, kpiPriorByRef]);

  // Fallback totals from per-branch kpis (in case the daily RPC is not yet
  // deployed). Without this, Revenue/Bills/AOV/Member% would show ฿0 while
  // the leaderboard underneath shows real per-branch numbers — confusing.
  const kpiTotals = useMemo(() => kpis.reduce(
    (a, k) => ({ rev: a.rev + Number(k.net_revenue || 0), bills: a.bills + Number(k.bills || 0) }),
    { rev: 0, bills: 0 }
  ), [kpis]);
  const kpiPriorTotals = useMemo(() => kpisPrior.reduce(
    (a, k) => ({ rev: a.rev + Number(k.net_revenue || 0), bills: a.bills + Number(k.bills || 0) }),
    { rev: 0, bills: 0 }
  ), [kpisPrior]);
  const fromKpiTotals = (t) => ({
    rev: t.rev, bills: t.bills, member: 0,
    aov: t.bills ? t.rev / t.bills : 0,
    memberPct: 0,
  });
  const cur  = useMemo(() => daily.length      ? sumDaily(daily)      : fromKpiTotals(kpiTotals),      [daily, kpiTotals]);
  const prev = useMemo(() => dailyPrior.length ? sumDaily(dailyPrior) : fromKpiTotals(kpiPriorTotals), [dailyPrior, kpiPriorTotals]);

  // Daily arrays for the chart + sparklines (chronological).
  const series = useMemo(() => {
    const rows = [...(daily || [])].sort((a, b) => String(a.day).localeCompare(String(b.day)));
    return {
      revenue: rows.map((r) => Number(r.net_revenue || 0)),
      bills:   rows.map((r) => Number(r.bills || 0)),
      aov:     rows.map((r) => (Number(r.bills) ? Number(r.net_revenue) / Number(r.bills) : 0)),
      member:  rows.map((r) => (Number(r.bills) ? (Number(r.member_bills) / Number(r.bills)) * 100 : 0)),
    };
  }, [daily]);

  const totals = { sales: cur.rev, customers: cur.bills, aov: cur.aov, memberPct: cur.memberPct };

  const rangeLabel = fmtRange(from, to, lang);

  const topBranches = useMemo(() => [...stats].sort((a, b) => b.sales - a.sales).slice(0, 8), [stats]);

  const dRevenue = fmtDelta(pctDelta(cur.rev, prev.rev), t);
  const dBills   = fmtDelta(pctDelta(cur.bills, prev.bills), t);
  const dAov     = fmtDelta(pctDelta(cur.aov, prev.aov), t);
  // Member % is itself a percentage — compare in percentage POINTS, not
  // relative % (a 30→35% jump is +5 pp, not +16.7%).
  const dMemberPP = cur.memberPct - prev.memberPct;
  const dMember = (prev.bills === 0)
    ? { text: t("dash.deltaNew"), neg: false }
    : { text: `${dMemberPP >= 0 ? "+" : ""}${dMemberPP.toFixed(1)} pp`, neg: dMemberPP < 0 };

  const kpiCards = [
    { label: t("dash.kpi.revenue"),  value: `฿${(totals.sales / 1000).toFixed(0)}K`, delta: dRevenue.text, neg: dRevenue.neg, data: series.revenue },
    { label: t("dash.kpi.customers"), value: totals.customers.toLocaleString(),       delta: dBills.text,   neg: dBills.neg,   data: series.bills },
    { label: t("dash.kpi.avgticket"), value: `฿${totals.aov.toFixed(0)}`,             delta: dAov.text,     neg: dAov.neg,     data: series.aov },
    { label: t("dash.kpi.members"),   value: `${totals.memberPct.toFixed(1)}%`,       delta: dMember.text,  neg: dMember.neg,  data: series.member },
  ];

  return (
    <>
      <NavBar
        title={t("dash.title")}
        sub={t("dash.branchesVisible", { n: visible.length, total: branches.length })}
        leading={<Avatar name={profile?.full_name || profile?.email || "?"} size={32} />}
        trailing={
          <button type="button" style={roundBtn()} aria-label={t("common.filter")}>
            <Icon name="filter" size={14} />
          </button>
        }
      />

      {/* date range button + secondary action */}
      <div style={{ padding: "4px 16px 10px", display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setDateSheet(true)}
          aria-label={t("dash.range.label")}
          style={{
            flex: 1, height: 38, borderRadius: 10, border: "0.5px solid var(--line)",
            background: "var(--panel)", color: "var(--ink)", font: "500 13.5px/1 var(--font-sans)",
            display: "flex", alignItems: "center", gap: 8, padding: "0 12px", cursor: "pointer",
          }}
        >
          <Icon name="dashboard" size={13} stroke={1.6} style={{ color: "var(--muted)" }} />
          <span>{rangeLabel}</span>
          <span style={{ flex: 1 }} />
          <Icon name="chevdown" size={12} stroke={1.6} style={{ color: "var(--muted)" }} />
        </button>
        <button type="button" style={roundBtn()} aria-label={t("common.export")}>
          <Icon name="download" size={13} />
        </button>
      </div>

      {/* scope banner */}
      {visible.length < branches.length && (
        <div style={{
          margin: "0 16px 12px", padding: "10px 12px", borderRadius: 10,
          background: "var(--accent-soft)", color: "var(--accent-ink)",
          display: "flex", alignItems: "center", gap: 8,
          font: "400 12px/1.4 var(--font-sans)",
        }}>
          <Icon name="shield" size={13} />
          <span>{t("dash.scopeBanner", { n: visible.length, total: branches.length })}</span>
        </div>
      )}

      {/* === HERO Revenue — the one number that matters (Phase Q) === */}
      <HeroRevenueCard
        revenue={totals.sales}
        delta={dRevenue}
        prevRev={prev.rev}
        sparkData={series.revenue}
      />

      {/* === 3-stat strip — Customers / Avg ticket / Members === */}
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <StatChip label={t("dash.kpi.customers")} value={totals.customers.toLocaleString()} delta={dBills} />
        <StatChip label={t("dash.kpi.avgticket")} value={`฿${totals.aov.toFixed(0)}`}        delta={dAov} />
        <StatChip label={t("dash.kpi.members")}   value={`${totals.memberPct.toFixed(1)}%`}    delta={dMember} />
      </div>

      {/* "What changed this month" — AI-flavored insights from /api/insights/monthly */}
      <div style={{ marginTop: 14 }}>
        <StrategyPanel from={from} to={to} />
      </div>

      {/* === Branch sales · ALL branches in scope (Phase Q) === */}
      <BranchSalesCard branches={stats} t={t} />

      {/* === Top promotions === */}
      {promotions.length > 0 && (
        <>
          <SectionHeader>{t("dash.topPromotions")}</SectionHeader>
          <GroupCard>
            {promotions.map((p, i) => (
              <div key={p.promotion_name + i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                borderBottom: i < promotions.length - 1 ? "0.5px solid var(--line-2)" : "none",
              }}>
                <span style={{ width: 24, font: "500 12px/1 var(--font-mono)", color: "var(--muted)", flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "500 13px/1.3 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.promotion_name}</div>
                  <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4 }}>
                    {Number(p.bills).toLocaleString()} {t("dash.bills")}
                  </div>
                </div>
                <div className="tnum" style={{ font: "600 13px/1 var(--font-mono)", textAlign: "right", flexShrink: 0 }}>
                  ฿{(Number(p.total_value) / 1000).toFixed(0)}K
                </div>
              </div>
            ))}
          </GroupCard>
        </>
      )}

      {/* === Top products === */}
      {products.length > 0 && (
        <>
          <SectionHeader>{t("dash.topProductsReal")}</SectionHeader>
          <GroupCard>
            {products.map((p, i) => (
              <div key={p.menu_name + i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                borderBottom: i < products.length - 1 ? "0.5px solid var(--line-2)" : "none",
              }}>
                <span style={{ width: 24, font: "500 12px/1 var(--font-mono)", color: "var(--muted)", flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "500 13px/1.3 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.menu_name}</div>
                  <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4, display: "flex", gap: 6 }}>
                    {p.category && <span>{p.category}</span>}
                    {p.category && <span style={{ color: "var(--muted-2)" }}>·</span>}
                    <span>{t("dash.units.sold", { n: Number(p.qty).toLocaleString() })}</span>
                  </div>
                </div>
                <div className="tnum" style={{ font: "600 13px/1 var(--font-mono)", textAlign: "right", flexShrink: 0 }}>
                  ฿{(Number(p.net_revenue) / 1000).toFixed(0)}K
                </div>
              </div>
            ))}
          </GroupCard>
        </>
      )}

      {/* === Inventory watch === */}
      {invWatch.length > 0 && (
        <>
          <SectionHeader>{t("dash.inventoryWatch")}</SectionHeader>
          <GroupCard>
            {invWatch.map((it, i) => (
              <div key={it.inventory_name + it.branch_name + i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                borderBottom: i < invWatch.length - 1 ? "0.5px solid var(--line-2)" : "none",
              }}>
                <Icon name="store" size={14} stroke={1.6} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "500 13px/1.3 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.inventory_name}</div>
                  <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.branch_name}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div className="tnum" style={{ font: "600 13px/1 var(--font-mono)", color: "var(--accent-ink)" }}>
                    {Number(it.order_recommend_95).toLocaleString(undefined, { maximumFractionDigits: 0 })} {it.unit}
                  </div>
                  <div className="mono" style={{ font: "400 10px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3 }}>
                    forecast {Number(it.forecast_qty).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            ))}
          </GroupCard>
        </>
      )}

      <div style={{ height: 16 }} />

      {/* Task 11: date-range bottom sheet mounts here */}
      {dateSheet && (
        <DateRangeSheet
          from={from}
          to={to}
          lang={lang}
          onClose={() => setDateSheet(false)}
          onApply={(f, tt) => { setDateSheet(false); applyRange(f, tt); }}
        />
      )}
    </>
  );
}

// === Phase Q components — simpler dashboard ===

// One hero revenue card combining big number + delta chip + sparkline.
// Replaces the old 4-tile KPI grid + separate RevenueChart card.
function HeroRevenueCard({ revenue, delta, prevRev, sparkData }) {
  const { t } = useLang();
  const pts = sparkData?.length ? sparkData : [0, 0];
  const max = Math.max(...pts, 1);
  const xs = pts.map((v, i) => [(i / Math.max(1, pts.length - 1)) * 320, 88 - (v / max) * 78]);
  const path = xs.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = xs[xs.length - 1];
  const isUp = !delta.neg;
  return (
    <div style={{
      margin: "0 16px 12px", padding: "18px 18px 8px", borderRadius: 20,
      background: "var(--panel)", border: "0.5px solid var(--line)",
      boxShadow: "0 4px 20px -12px rgba(0,0,0,.14)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ font: "500 12px/1 var(--font-sans)", color: "var(--muted)" }}>
          {t("dash.revenue")} · {t("dash.preset.7d").toLowerCase()}
        </span>
        {/* 7d / 30d / QTD toggle — visual only, range comes from the bottom sheet */}
        <div style={{ display: "flex", gap: 3, padding: 3, background: "var(--bg-2)", borderRadius: 9 }}>
          {["7d", "30d", "QTD"].map((label, i) => (
            <span key={label} style={{
              padding: "5px 9px", borderRadius: 6,
              font: `${i === 0 ? 600 : 500} 11px/1 var(--font-sans)`,
              background: i === 0 ? "var(--panel)" : "transparent",
              color:      i === 0 ? "var(--ink)"   : "var(--muted)",
              boxShadow:  i === 0 ? "0 1px 2px rgba(0,0,0,.06)" : "none",
            }}>{label}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, margin: "12px 0 2px" }}>
        <span className="tnum" style={{
          font: "700 40px/0.9 var(--font-sans)", letterSpacing: "-0.03em", color: "var(--ink)",
        }}>{formatHeroRev(revenue)}</span>
        <span className="tnum" style={{
          display: "inline-flex", alignItems: "center", gap: 4, height: 24, padding: "0 8px", marginBottom: 4,
          borderRadius: 999, font: "700 13px/1 var(--font-sans)",
          background: isUp ? "rgba(58,155,118,.13)" : "rgba(216,89,63,.12)",
          color:      isUp ? "var(--green-ok)" : "#d8593f",
        }}>
          <span aria-hidden style={{ display: "inline-flex" }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {isUp
                ? <><path d="M3 11l4-4 3 3 4-5" /><path d="M11 5h3v3" /></>
                : <><path d="M3 5l4 4 3-3 4 5" /><path d="M11 11h3v-3" /></>}
            </svg>
          </span>
          {delta.text}
        </span>
      </div>
      <div style={{ font: "400 11.5px/1 var(--font-sans)", color: "var(--muted)" }}>
        {prevRev > 0
          ? `vs ฿${Math.round(prevRev / 1000).toLocaleString()}K prior period`
          : t("dash.kpi.vsPrior")}
      </div>

      <svg viewBox="0 0 320 96" style={{ width: "100%", height: 110, marginTop: 10, overflow: "visible" }}>
        <defs>
          <linearGradient id="hero-rev-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g style={{ color: "var(--accent)" }}>
          <path d={`${path} L320,96 L0,96 Z`} fill="url(#hero-rev-grad)" />
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" />
          {last && (
            <circle cx={last[0]} cy={last[1]} r="3.5"
              fill="var(--panel)" stroke="currentColor" strokeWidth="2" />
          )}
        </g>
      </svg>
    </div>
  );
}

function formatHeroRev(n) {
  if (!n) return "฿0";
  if (n >= 1e6) return `฿${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `฿${Math.round(n / 1000)}K`;
  return `฿${Math.round(n)}`;
}

// Compact stat chip — small label + big number + tiny delta. No sparkline.
function StatChip({ label, value, delta }) {
  const neg = delta?.neg;
  return (
    <div style={{
      background: "var(--panel)", border: "0.5px solid var(--line)",
      borderRadius: 14, padding: "13px 12px",
    }}>
      <div style={{ font: "500 10px/1.2 var(--font-sans)", color: "var(--muted)" }}>{label}</div>
      <div className="tnum" style={{
        font: "700 18px/1 var(--font-sans)", marginTop: 9,
        letterSpacing: "-0.01em", color: "var(--ink)",
      }}>{value}</div>
      <div className="tnum" style={{
        display: "inline-flex", alignItems: "center", gap: 3, marginTop: 8,
        font: "600 10.5px/1 var(--font-mono)",
        color: neg ? "#d8593f" : "var(--green-ok)",
      }}>
        <span aria-hidden style={{ display: "inline-flex" }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {neg ? <path d="M3 5l4 4 3-3 4 5" /> : <path d="M3 11l4-4 3 3 4-5" />}
          </svg>
        </span>
        {delta?.text?.replace(/^[+-]/, "") || "—"}
      </div>
    </div>
  );
}

// Branch sales summary — EVERY branch in scope, ranked by revenue, with
// share-of-total progress bar + revenue + trend. Footer shows the total.
function BranchSalesCard({ branches = [], t }) {
  const filtered = branches.filter((b) => Number(b.sales) > 0);
  const list = (filtered.length ? filtered : branches).slice().sort((a, b) => Number(b.sales) - Number(a.sales));
  const total = list.reduce((sum, b) => sum + Number(b.sales || 0), 0);
  const maxSales = Math.max(1, ...list.map((b) => Number(b.sales || 0)));

  if (list.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        padding: "16px 20px 10px",
        display: "flex", alignItems: "baseline", gap: 8,
      }}>
        <span style={{ font: "600 14px/1 var(--font-sans)", color: "var(--ink)" }}>
          {t("dash.branchSales")}
        </span>
        <span style={{ font: "500 11px/1 var(--font-sans)", color: "var(--muted)" }}>
          {t("dash.branchSales.all", { n: list.length })}
        </span>
        <span style={{ flex: 1 }} />
        <span className="tnum" style={{ font: "700 14px/1 var(--font-sans)", color: "var(--ink)" }}>
          {formatHeroRev(total)}
        </span>
      </div>

      <div style={{
        margin: "0 16px",
        background: "var(--panel)", border: "0.5px solid var(--line)",
        borderRadius: 16, overflow: "hidden",
      }}>
        {list.map((b, i) => {
          const share = total ? Math.round((Number(b.sales) / total) * 100) : 0;
          const growthNum = b.growth;
          const isUp = growthNum === null || growthNum >= 0;
          return (
            <div key={b.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 14px",
              borderBottom: i < list.length - 1 ? "0.5px solid var(--line-2)" : "none",
            }}>
              <span className="mono" style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                background: i === 0 ? "var(--accent)" : "var(--bg-2)",
                color: i === 0 ? "#fff" : "var(--muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                font: "700 11px/1 var(--font-mono)",
              }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                  <span style={{
                    font: "600 13.5px/1.2 var(--font-sans)", color: "var(--ink)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{b.name}</span>
                  <span className="mono" style={{
                    font: "500 10px/1 var(--font-mono)", color: "var(--muted-2)",
                  }}>{share}%</span>
                </div>
                {/* share-of-max bar */}
                <div style={{
                  height: 4, marginTop: 7, borderRadius: 2,
                  background: "var(--bg-2)", overflow: "hidden",
                }}>
                  <div style={{
                    width: `${(Number(b.sales) / maxSales) * 100}%`,
                    height: "100%", borderRadius: 2,
                    background: i === 0 ? "var(--accent)" : "var(--muted-2)",
                  }} />
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="tnum" style={{
                  font: "700 13px/1 var(--font-sans)", color: "var(--ink)",
                }}>{formatHeroRev(Number(b.sales))}</div>
                <div className="tnum" style={{
                  display: "inline-flex", alignItems: "center", gap: 3, marginTop: 5,
                  font: "600 10.5px/1 var(--font-mono)",
                  color: isUp ? "var(--green-ok)" : "#d8593f",
                }}>
                  <span aria-hidden style={{ display: "inline-flex" }}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {isUp ? <path d="M3 11l4-4 3 3 4-5" /> : <path d="M3 5l4 4 3-3 4 5" />}
                    </svg>
                  </span>
                  {growthNum === null ? "new" : `${Math.abs(growthNum).toFixed(1)}%`}
                </div>
              </div>
            </div>
          );
        })}

        {/* total footer */}
        <div style={{
          display: "flex", alignItems: "center", padding: "12px 14px",
          background: "var(--bg-2)",
          borderTop: "0.5px solid var(--line-2)",
        }}>
          <span style={{ width: 22, flexShrink: 0 }} />
          <span style={{ flex: 1, font: "600 12.5px/1 var(--font-sans)", color: "var(--ink-2)" }}>
            {t("dash.branchSales.total", { n: list.length })}
          </span>
          <span className="tnum" style={{ font: "700 14px/1 var(--font-sans)", color: "var(--ink)" }}>
            {formatHeroRev(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, deltaNeg, sparkData }) {
  const color = deltaNeg ? "oklch(0.55 0.18 25)" : "var(--accent)";
  return (
    <div style={{
      background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 14, padding: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)",
          letterSpacing: ".06em", textTransform: "uppercase",
        }}>{label}</span>
        <span className="mono tnum" style={{
          font: "500 10px/1 var(--font-mono)", padding: "2px 5px", borderRadius: 4,
          background: deltaNeg ? "oklch(0.95 0.04 25 / 0.5)" : "var(--accent-soft)",
          color: deltaNeg ? "oklch(0.55 0.18 25)" : "var(--accent-ink)",
        }}>{delta}</span>
      </div>
      <div className="tnum" style={{ font: "600 22px/1 var(--font-sans)", marginTop: 10, letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ marginTop: 8, color }}>
        <Sparkline data={sparkData} w={130} h={20} color="currentColor" />
      </div>
    </div>
  );
}

function RevenueChart({ range, data = [], growth, branchCount }) {
  const { t } = useLang();
  const pts = data.length ? data : [0, 0];
  const max = Math.max(...pts, 1);
  const ptsMain = pts.map((v, i) => [(i / Math.max(1, pts.length - 1)) * 320, 100 - (v / max) * 90]);
  const pathMain = ptsMain.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaMain = `${pathMain} L320,110 L0,110 Z`;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ font: "600 15px/1.2 var(--font-sans)" }}>{t("dash.revenue")}</div>
          <div style={{ font: "400 11.5px/1 var(--font-sans)", color: "var(--muted)", marginTop: 4 }}>
            {t("dash.revenue.sub", { n: branchCount, s: branchCount === 1 ? "" : "es", range })}
          </div>
        </div>
        <div className="mono tnum" style={{ font: "500 11px/1 var(--font-mono)", color: growth >= 0 ? "var(--accent-ink)" : "oklch(0.55 0.18 25)" }}>
          {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
        </div>
      </div>

      <svg viewBox="0 0 320 110" style={{ width: "100%", height: 130, marginTop: 12, overflow: "visible" }}>
        {[0, 0.5, 1].map((g, i) => (
          <line key={i} x1="0" x2="320" y1={100 - g * 90} y2={100 - g * 90}
            stroke="var(--line-2)" strokeWidth="1" strokeDasharray={g === 0 ? "" : "2 4"} />
        ))}
        <defs>
          <linearGradient id="m-rev-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaMain} fill="url(#m-rev-grad)" />
        <path d={pathMain} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Date-range bottom sheet (presets + month calendar)
// ─────────────────────────────────────────────────────────────
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s) {
  const [y, m, d] = (s || "").split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function presetRange(id) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun
  switch (id) {
    case "today":  return [today, today];
    case "yest":   { const y = addDays(today, -1); return [y, y]; }
    case "7d":     return [addDays(today, -6), today];
    case "14d":    return [addDays(today, -13), today];
    case "30d":    return [addDays(today, -29), today];
    case "tw":     { const start = addDays(today, -((dow + 6) % 7)); return [start, today]; } // Monday start
    case "tm":     return [new Date(today.getFullYear(), today.getMonth(), 1), today];
    case "qtd":    { const q = Math.floor(today.getMonth() / 3) * 3; return [new Date(today.getFullYear(), q, 1), today]; }
    default:       return [today, today];
  }
}

function DateRangeSheet({ from, to, lang, onClose, onApply }) {
  const { t } = useLang();
  const [start, setStart] = useState(parseYmd(from));
  const [end,   setEnd]   = useState(parseYmd(to));
  const [view,  setView]  = useState(() => { const d = parseYmd(from); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const presets = [
    { id: "today", label: t("dash.preset.today") },
    { id: "yest",  label: t("dash.preset.yesterday") },
    { id: "7d",    label: t("dash.preset.7d") },
    { id: "14d",   label: t("dash.preset.14d") },
    { id: "30d",   label: t("dash.preset.30d") },
    { id: "tw",    label: t("dash.preset.thisWeek") },
    { id: "tm",    label: t("dash.preset.thisMonth") },
    { id: "qtd",   label: t("dash.preset.qtd") },
  ];

  const startMs = start.getTime();
  const endMs   = end.getTime();
  const lo = Math.min(startMs, endMs);
  const hi = Math.max(startMs, endMs);

  function pickPreset(id) {
    const [f, tt] = presetRange(id);
    setStart(f);
    setEnd(tt);
    setView(new Date(f.getFullYear(), f.getMonth(), 1));
  }

  function pickDay(d) {
    // If a full range is already selected (or the tap is before the start),
    // begin a new range; otherwise extend the current start to the tapped day.
    if (startMs !== endMs || d.getTime() < startMs) {
      setStart(d);
      setEnd(d);
    } else {
      setEnd(d);
    }
  }

  // Build calendar cells for `view` month (Sunday-first grid).
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const todayMs = (() => { const x = new Date(); x.setHours(0, 0, 0, 0); return x.getTime(); })();
  const monthLabel = view.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { month: "long", year: "numeric" });
  const dow = lang === "th" ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] : ["S", "M", "T", "W", "T", "F", "S"];

  const fmtChip = (d) => d.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short", year: "numeric" });
  const daysSelected = Math.round((hi - lo) / 86400000) + 1;

  return (
    <Sheet
      title={t("dash.range.label")}
      onClose={onClose}
      footer={{
        left: (
          <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: "var(--muted)", font: "400 14px/1 var(--font-sans)", cursor: "pointer" }}>
            {t("common.cancel")}
          </button>
        ),
        right: t("dash.done"),
      }}
    >
      {/* from/to chips */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px 8px" }}>
        {[
          { l: t("common.from"), v: fmtChip(new Date(lo)), active: false },
          { l: t("common.to"),   v: fmtChip(new Date(hi)), active: true },
        ].map((c, i) => (
          <div key={i} style={{
            flex: 1, padding: "10px 12px", borderRadius: 12,
            background: "var(--panel)", border: `1px solid ${c.active ? "var(--accent)" : "var(--line)"}`,
          }}>
            <div style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>{c.l}</div>
            <div style={{ font: "600 14.5px/1 var(--font-sans)", color: "var(--ink)", marginTop: 6 }}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* preset chips */}
      <div style={{ display: "flex", gap: 6, padding: "6px 16px 12px", flexWrap: "wrap" }}>
        {presets.map((p) => {
          const [pf, pt] = presetRange(p.id);
          const active = pf.getTime() === lo && pt.getTime() === hi;
          return (
            <button key={p.id} type="button" onClick={() => pickPreset(p.id)} style={{
              padding: "6px 12px", borderRadius: 999, flexShrink: 0, cursor: "pointer",
              font: `${active ? 600 : 500} 12.5px/1 var(--font-sans)`,
              background: active ? "var(--accent)" : "var(--panel)",
              color: active ? "#fff" : "var(--ink-2)",
              border: active ? "0.5px solid transparent" : "0.5px solid var(--line)",
            }}>{p.label}</button>
          );
        })}
      </div>

      {/* calendar */}
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px 10px" }}>
          <button type="button" onClick={() => setView(new Date(year, month - 1, 1))} style={roundBtn()} aria-label="Previous month">
            <Icon name="chevleft" size={13} stroke={2} />
          </button>
          <div style={{ font: "600 15px/1 var(--font-sans)", color: "var(--ink)" }}>{monthLabel}</div>
          <button type="button" onClick={() => setView(new Date(year, month + 1, 1))} style={roundBtn()} aria-label="Next month">
            <Icon name="chevright" size={13} stroke={2} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
          {dow.map((d, i) => (
            <div key={i} style={{
              textAlign: "center", padding: "4px 0",
              font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)",
              textTransform: "uppercase", letterSpacing: ".08em",
            }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={{ aspectRatio: "1" }} />;
            const cur = new Date(year, month, d).getTime();
            const isStart = cur === lo;
            const isEnd = cur === hi;
            const isMid = cur > lo && cur < hi;
            const isToday = cur === todayMs;
            const isFuture = cur > todayMs;
            return (
              <button key={i} type="button" onClick={() => pickDay(new Date(year, month, d))} style={{
                aspectRatio: "1", position: "relative", border: 0, background: "transparent", padding: 0, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {(isMid || isStart || isEnd) && lo !== hi && (
                  <div style={{
                    position: "absolute", top: 4, bottom: 4,
                    left: isStart ? "50%" : 0,
                    right: isEnd ? "50%" : 0,
                    background: "var(--accent-soft)",
                  }} />
                )}
                {(isStart || isEnd) && (
                  <div style={{
                    position: "absolute", top: 4, bottom: 4, left: 4, right: 4,
                    background: "var(--accent)", borderRadius: 10,
                  }} />
                )}
                <span style={{
                  position: "relative", zIndex: 1,
                  font: `${isStart || isEnd || isToday ? 600 : 400} 14px/1 var(--font-sans)`,
                  color: isFuture ? "var(--muted-2)"
                    : (isStart || isEnd) ? "#fff"
                    : isMid ? "var(--accent-ink)"
                    : isToday ? "var(--accent)"
                    : "var(--ink-2)",
                }}>{d}</span>
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop: 8, padding: "8px 0 0", textAlign: "center",
          font: "400 11.5px/1.3 var(--font-mono)", color: "var(--muted)", borderTop: "0.5px solid var(--line)",
        }}>
          {t("dash.daysSelected", { n: daysSelected })} · {fmtRange(ymd(new Date(lo)), ymd(new Date(hi)), lang)}
        </div>
      </div>

      {/* primary apply action — reuses applyRange via onApply */}
      <div style={{ padding: "4px 16px 16px" }}>
        <button type="button" onClick={() => onApply(ymd(new Date(lo)), ymd(new Date(hi)))} style={{
          width: "100%", height: 46, borderRadius: 12, border: 0,
          background: "var(--accent)", color: "#fff", font: "600 14px/1 var(--font-sans)", cursor: "pointer",
        }}>{t("dash.apply")}</button>
      </div>
    </Sheet>
  );
}
