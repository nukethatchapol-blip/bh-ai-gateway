"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Sparkline } from "./ui";
import { PageHeader } from "./shell";
import { useLang } from "./lang-context";

function spark(seed, n = 24) {
  const out = [];
  let v = 50, s = seed * 17 + 3;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    v = Math.max(20, Math.min(100, v + (s / 233280 - 0.45) * 16));
    out.push(v);
  }
  return out;
}

function synthBranchStats(b) {
  let h = 0;
  for (let i = 0; i < b.id.length; i++) h = (h * 31 + b.id.charCodeAt(i)) >>> 0;
  const r = h % 100;
  return { sales: 80000 + r * 2400, customers: 300 + r * 8, growth: (r % 30) - 10 };
}

function fmtRange(from, to, lang) {
  // human-friendly compact range, locale-aware
  const f = new Date(from), t = new Date(to);
  const opts = { day: "numeric", month: "short" };
  const fL = f.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", opts);
  const tL = t.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", opts);
  return `${fL} – ${tL}`;
}

export function DashboardScreen({ profile, branches, authorizedIds, kpis = [], from, to }) {
  const router = useRouter();
  const { t, lang } = useLang();
  const [scope, setScope] = useState("ALL");
  const [fromVal, setFromVal] = useState(from);
  const [toVal,   setToVal]   = useState(to);

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

  const stats = useMemo(() => visible.map((b) => {
    const real = kpiByRef[b.id];
    if (real) {
      return { ...b, sales: Number(real.net_revenue || 0), customers: Number(real.bills || 0), growth: 0 };
    }
    return { ...b, ...synthBranchStats(b) };
  }), [visible, kpiByRef]);

  const totals = useMemo(() => {
    const sales = stats.reduce((a, b) => a + b.sales, 0);
    const customers = stats.reduce((a, b) => a + b.customers, 0);
    const growth = stats.length ? stats.reduce((a, b) => a + b.growth, 0) / stats.length : 0;
    const aov = customers ? sales / customers : 0;
    return { sales, customers, growth, aov };
  }, [stats]);

  const rangeLabel = fmtRange(fromVal, toVal, lang);

  return (
    <div className="pageframe">
      <PageHeader
        title={t("dash.title")}
        crumb={`/ ${t("dash.crumb")} · ${t("dash.branchesVisible", { n: visible.length, total: branches.length })}`}
      >
        <DateRange
          label={t("dash.range.label")}
          from={fromVal} to={toVal}
          onChange={(f, tt) => { setFromVal(f); setToVal(tt); applyRange(f, tt); }}
        />
        <button className="btn btn-sm" type="button">
          <Icon name="download" size={13} /> {t("common.export")}
        </button>
      </PageHeader>

      <div className="page-body scroll-y">
        <div className="dash-wrap" style={{ padding: "20px 28px 40px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 1400, margin: "0 auto" }}>
          {visible.length < branches.length && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, background: "var(--accent-soft)",
              color: "var(--accent-ink)", display: "flex", alignItems: "center", gap: 10,
              font: "400 12.5px/1.4 var(--font-sans)",
            }}>
              <Icon name="shield" size={14} />
              <span>{t("dash.scopeBanner", { n: visible.length, total: branches.length })}</span>
            </div>
          )}

          <div className="dash-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <Kpi label={t("dash.kpi.revenue")}    value={`฿${(totals.sales / 1000).toFixed(0)}K`}
              delta={`${totals.growth >= 0 ? "+" : ""}${totals.growth.toFixed(1)}%`}
              deltaNeg={totals.growth < 0}
              sub={`${t("dash.kpi.vsPrior")} · ${rangeLabel}`} sparkData={spark(0)} />
            <Kpi label={t("dash.kpi.customers")}  value={totals.customers.toLocaleString()}
              delta="+6.2%" sub={t("dash.kpi.customers.sub")} sparkData={spark(1)} />
            <Kpi label={t("dash.kpi.avgticket")}  value={`฿${totals.aov.toFixed(0)}`}
              delta="+3.1%" sub={t("dash.kpi.aov.sub")} sparkData={spark(2)} />
            <Kpi label={t("dash.kpi.inventory")}  value="92.4%"
              delta="-1.8%" deltaNeg sub={t("dash.kpi.inv.sub")} sparkData={spark(3)} />
          </div>

          <div className="dash-row-main" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
            <RevenueChart range={rangeLabel} branches={stats} />
            <TopProducts count={stats.length} />
          </div>

          <div className="dash-row-secondary" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <BranchLeaderboard branches={stats} />
            <InventoryAlerts branches={stats} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DateRange({ label, from, to, onChange }) {
  const { t } = useLang();
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "2px 4px 2px 10px", height: 30, borderRadius: 8,
      border: "0.5px solid var(--line)", background: "var(--bg-2)",
      font: "500 11px/1 var(--font-mono)", color: "var(--muted)",
      letterSpacing: ".04em", textTransform: "uppercase",
    }} aria-label={label}>
      <Icon name="filter" size={11} />
      <input
        type="date"
        value={from}
        max={to}
        onChange={(e) => onChange(e.target.value, to)}
        className="mono"
        style={{
          appearance: "none", border: 0, background: "transparent",
          font: "500 11px/1 var(--font-mono)", color: "var(--ink-2)",
          letterSpacing: ".04em", outline: "none", width: 122, padding: 2,
        }}
      />
      <span style={{ color: "var(--muted-2)" }}>—</span>
      <input
        type="date"
        value={to}
        min={from}
        onChange={(e) => onChange(from, e.target.value)}
        className="mono"
        style={{
          appearance: "none", border: 0, background: "transparent",
          font: "500 11px/1 var(--font-mono)", color: "var(--ink-2)",
          letterSpacing: ".04em", outline: "none", width: 122, padding: 2,
        }}
      />
    </div>
  );
}

function Kpi({ label, value, delta, deltaNeg, sub, sparkData }) {
  const color = deltaNeg ? "oklch(0.55 0.18 25)" : "var(--accent)";
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="eyebrow">{label}</span>
        <span className="mono tnum" style={{
          font: "500 11px/1 var(--font-mono)", color,
          padding: "2px 6px", borderRadius: 4,
          background: deltaNeg ? "oklch(0.95 0.04 25 / 0.5)" : "var(--accent-soft)",
        }}>{delta}</span>
      </div>
      <div className="tnum" style={{ font: "500 28px/1.05 var(--font-sans)", letterSpacing: "-0.01em", marginTop: 10 }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <span className="muted" style={{ font: "400 12px/1 var(--font-sans)" }}>{sub}</span>
        <span style={{ color }}><Sparkline data={sparkData} w={88} h={22} /></span>
      </div>
    </div>
  );
}

function RevenueChart({ range, branches }) {
  const { t } = useLang();
  const days = 30;
  const data = useMemo(() => {
    let s = 19;
    return Array.from({ length: days }, () => {
      s = (s * 9301 + 49297) % 233280;
      const base = branches.reduce((a, b) => a + b.sales, 0) / 30 || 1000;
      return Math.max(base * 0.6, base + (s / 233280 - 0.5) * base * 0.45);
    });
  }, [branches, days]);
  const max = Math.max(...data, 1);

  const ptsMain = data.map((v, i) => [(i / (data.length - 1)) * 600, 200 - (v / max) * 180 - 10]);
  const pathMain = ptsMain.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const areaMain = `${pathMain} L600,200 L0,200 Z`;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 className="h-2">{t("dash.revenue")}</h3>
          <p className="muted" style={{ font: "400 12.5px/1.4 var(--font-sans)", margin: "4px 0 0" }}>
            {t("dash.revenue.sub", { n: branches.length, s: branches.length === 1 ? "" : "es", range })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <Legend swatch="var(--accent)" label={t("dash.thisPeriod")} />
          <Legend swatch="var(--line)" label={t("dash.priorPeriod")} />
        </div>
      </div>
      <div style={{ position: "relative", marginTop: 18 }}>
        <svg viewBox="0 0 600 200" style={{ width: "100%", height: 220, overflow: "visible" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
            <line key={i} x1="0" x2="600" y1={200 - g * 180 - 10} y2={200 - g * 180 - 10}
              stroke="var(--line-2)" strokeWidth="1" strokeDasharray={g === 0 ? "" : "2 4"} />
          ))}
          <defs>
            <linearGradient id="rev-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaMain} fill="url(#rev-grad)" />
          <path d={pathMain} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {ptsMain.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="var(--panel)" stroke="var(--accent)" strokeWidth="1.5" />
          ))}
        </svg>
      </div>
    </div>
  );
}

function Legend({ swatch, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "400 12px/1 var(--font-sans)", color: "var(--muted)" }}>
      <span style={{ width: 10, height: 2, background: swatch, display: "inline-block", borderRadius: 1 }} />
      {label}
    </span>
  );
}

function TopProducts({ count }) {
  const { t } = useLang();
  const products = [
    { key: "brownSugar",  units: 18204, rev: 1024500, delta: 12.4 },
    { key: "matcha",      units: 12480, rev: 798720,  delta: 18.1 },
    { key: "thaiTea",     units: 9601,  rev: 624065,  delta: 4.2 },
    { key: "oolong",      units: 7842,  rev: 549940,  delta: -2.8 },
    { key: "lychee",      units: 6428,  rev: 414005,  delta: 9.6 },
    { key: "strawberry",  units: 5980,  rev: 386700,  delta: 6.4 },
  ];
  const maxRev = Math.max(...products.map((p) => p.rev));
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h3 className="h-2">{t("dash.topProducts")}</h3>
          <p className="muted" style={{ font: "400 12.5px/1.4 var(--font-sans)", margin: "4px 0 0" }}>
            {t("dash.topProducts.sub", { n: count, s: count === 1 ? "" : "es" })}
          </p>
        </div>
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {products.map((p, i) => (
          <div key={p.key}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ font: "500 13px/1 var(--font-sans)" }}>{t(`product.${p.key}`)}</span>
              <span className="tnum" style={{ font: "500 13px/1 var(--font-sans)" }}>฿{p.rev.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 6, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${(p.rev / maxRev) * 100}%`, height: "100%", background: i === 0 ? "var(--accent)" : "var(--ink-2)", borderRadius: 3 }} />
              </div>
              <span className="mono tnum" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted)", width: 56, textAlign: "right" }}>{p.units.toLocaleString()}u</span>
              <span className="mono tnum" style={{ font: "500 11px/1 var(--font-mono)", color: p.delta >= 0 ? "var(--accent)" : "oklch(0.55 0.18 25)", width: 48, textAlign: "right" }}>
                {p.delta >= 0 ? "+" : ""}{p.delta}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchLeaderboard({ branches }) {
  const { t } = useLang();
  const sorted = [...branches].sort((a, b) => b.sales - a.sales).slice(0, 8);
  return (
    <div className="card">
      <div style={{ padding: "20px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h3 className="h-2">{t("dash.leaderboard")}</h3>
          <p className="muted" style={{ font: "400 12.5px/1.4 var(--font-sans)", margin: "4px 0 0" }}>
            {t("dash.leaderboard.sub", { n: Math.min(8, branches.length) })}
          </p>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", font: "400 13px/1.4 var(--font-sans)" }}>
        <thead>
          <tr>
            {["#", t("dash.col.branch"), t("dash.col.revenue"), "Δ", t("dash.col.trend")].map((h, i) => (
              <th key={i} style={{
                textAlign: i >= 2 ? "right" : "left", padding: "8px 16px",
                font: "500 10.5px/1 var(--font-mono)", letterSpacing: ".06em", textTransform: "uppercase",
                color: "var(--muted)", borderBottom: "0.5px solid var(--line)", borderTop: "0.5px solid var(--line)",
                background: "var(--panel-2)",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="tnum">
          {sorted.map((b, i) => (
            <tr key={b.id} style={{ borderBottom: i < sorted.length - 1 ? "0.5px solid var(--line-2)" : "none" }}>
              <td style={{ padding: "10px 16px", color: "var(--muted)", font: "500 12px/1 var(--font-mono)", width: 36 }}>{i + 1}</td>
              <td style={{ padding: "10px 16px" }}>
                <div style={{ font: "500 13px/1.2 var(--font-sans)" }}>{b.name}</div>
                <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 2 }}>{b.id} · {b.region}</div>
              </td>
              <td style={{ padding: "10px 16px", textAlign: "right", font: "500 13px/1 var(--font-sans)" }}>฿{(b.sales / 1000).toFixed(0)}K</td>
              <td style={{ padding: "10px 16px", textAlign: "right", font: "500 12px/1 var(--font-mono)",
                color: b.growth >= 0 ? "var(--accent)" : "oklch(0.55 0.18 25)" }}>
                {b.growth >= 0 ? "+" : ""}{b.growth.toFixed(1)}%
              </td>
              <td style={{ padding: "8px 16px", textAlign: "right" }}>
                <span style={{ color: b.growth >= 0 ? "var(--accent)" : "oklch(0.55 0.18 25)", display: "inline-block" }}>
                  <Sparkline data={spark(i * 113 + 7)} w={72} h={20} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryAlerts({ branches }) {
  const { t } = useLang();
  const items = [
    { key: "tapioca",     level: 12,  threshold: 25,  severity: "high" },
    { key: "matchaPowder",level: 8,   threshold: 20,  severity: "high" },
    { key: "brownSyrup",  level: 18,  threshold: 30,  severity: "med" },
    { key: "cupLids",     level: 240, threshold: 400, severity: "med" },
    { key: "earlGrey",    level: 6,   threshold: 12,  severity: "high" },
    { key: "yakult",      level: 24,  threshold: 36,  severity: "low" },
  ]
    .slice(0, Math.max(1, Math.min(6, branches.length)))
    .map((a, i) => ({ ...a, branch: branches[i % Math.max(1, branches.length)] }))
    .filter((a) => a.branch);

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h3 className="h-2">{t("dash.invalerts")}</h3>
          <p className="muted" style={{ font: "400 12.5px/1.4 var(--font-sans)", margin: "4px 0 0" }}>{t("dash.invalerts.sub")}</p>
        </div>
        <span className="badge badge-warn"><span className="dot" /> {t("dash.critical", { n: items.filter((a) => a.severity === "high").length })}</span>
      </div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column" }}>
        {items.map((a, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
            borderBottom: i < items.length - 1 ? "0.5px solid var(--line-2)" : "none",
          }}>
            <span style={{
              width: 6, height: 36, borderRadius: 3, flexShrink: 0,
              background: a.severity === "high" ? "oklch(0.62 0.2 25)" : a.severity === "med" ? "oklch(0.72 0.16 70)" : "var(--accent)",
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "500 13px/1.2 var(--font-sans)" }}>{t(`inv.${a.key}`)}</div>
              <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3 }}>
                {a.branch.name} · {a.branch.id}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="tnum" style={{ font: "500 13px/1 var(--font-sans)" }}>
                {a.level}<span className="muted" style={{ fontWeight: 400 }}> / {a.threshold}</span>
              </div>
              <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3 }}>
                {t("dash.parOf", { p: Math.round((a.level / a.threshold) * 100) })}
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" type="button" style={{ marginLeft: 6 }}>{t("dash.reorder")}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
