"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Sparkline, Avatar } from "./ui";
import { NavBar, SectionHeader, GroupCard, roundBtn, Sheet } from "./mobile-ui";
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

  const topBranches = useMemo(() => [...stats].sort((a, b) => b.sales - a.sales).slice(0, 8), [stats]);

  const kpiCards = [
    {
      label: t("dash.kpi.revenue"),
      value: `฿${(totals.sales / 1000).toFixed(0)}K`,
      delta: `${totals.growth >= 0 ? "+" : ""}${totals.growth.toFixed(1)}%`,
      neg: totals.growth < 0,
      data: spark(0),
    },
    {
      label: t("dash.kpi.customers"),
      value: totals.customers.toLocaleString(),
      delta: "+6.2%",
      neg: false,
      data: spark(1),
    },
    {
      label: t("dash.kpi.avgticket"),
      value: `฿${totals.aov.toFixed(0)}`,
      delta: "+3.1%",
      neg: false,
      data: spark(2),
    },
    {
      label: t("dash.kpi.inventory"),
      value: "92.4%",
      delta: "-1.8%",
      neg: true,
      data: spark(3),
    },
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

      {/* KPI cards grid */}
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {kpiCards.map((k, i) => (
          <Kpi key={i} label={k.label} value={k.value} delta={k.delta} deltaNeg={k.neg} sparkData={k.data} />
        ))}
      </div>

      {/* revenue chart card */}
      <GroupCard style={{ margin: "12px 16px 0", padding: 16, borderRadius: 14 }}>
        <RevenueChart range={rangeLabel} branches={stats} growth={totals.growth} />
      </GroupCard>

      {/* top branches */}
      <SectionHeader>{t("dash.leaderboard")}</SectionHeader>
      <GroupCard>
        {topBranches.length === 0 && (
          <div style={{ padding: "16px 14px", font: "400 13px/1.4 var(--font-sans)", color: "var(--muted)" }}>
            {t("dash.leaderboard.sub", { n: 0 })}
          </div>
        )}
        {topBranches.map((b, i) => (
          <div key={b.id} style={{
            display: "flex", alignItems: "center", padding: "12px 14px", gap: 4,
            borderBottom: i < topBranches.length - 1 ? "0.5px solid var(--line-2)" : "none",
          }}>
            <span style={{ width: 24, font: "500 12px/1 var(--font-mono)", color: "var(--muted)" }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "500 13.5px/1.2 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
              <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3 }}>
                {b.id}{b.region ? ` · ${b.region}` : ""}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="tnum" style={{ font: "600 13px/1 var(--font-mono)" }}>฿{(b.sales / 1000).toFixed(0)}K</div>
              <div className="mono tnum" style={{
                font: "500 11px/1 var(--font-mono)", marginTop: 4,
                color: b.growth >= 0 ? "var(--accent-ink)" : "oklch(0.55 0.18 25)",
              }}>
                {b.growth >= 0 ? "+" : ""}{b.growth.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </GroupCard>

      <div style={{ height: 16 }} />

      {/* Task 11: date-range bottom sheet mounts here */}
      {dateSheet && (
        <DateRangeSheet
          from={fromVal}
          to={toVal}
          lang={lang}
          onClose={() => setDateSheet(false)}
          onApply={(f, tt) => { setFromVal(f); setToVal(tt); setDateSheet(false); applyRange(f, tt); }}
        />
      )}
    </>
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

function RevenueChart({ range, branches, growth }) {
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

  const ptsMain = data.map((v, i) => [(i / (data.length - 1)) * 320, 100 - (v / max) * 90]);
  const pathMain = ptsMain.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaMain = `${pathMain} L320,110 L0,110 Z`;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ font: "600 15px/1.2 var(--font-sans)" }}>{t("dash.revenue")}</div>
          <div style={{ font: "400 11.5px/1 var(--font-sans)", color: "var(--muted)", marginTop: 4 }}>
            {t("dash.revenue.sub", { n: branches.length, s: branches.length === 1 ? "" : "es", range })}
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
// Date-range bottom sheet — Task 10 places a minimal native-input
// fallback here; Task 11 replaces it with presets + a month calendar.
// ─────────────────────────────────────────────────────────────
function DateRangeSheet({ from, to, lang, onClose, onApply }) {
  const { t } = useLang();
  const [f, setF] = useState(from);
  const [tt, setTt] = useState(to);

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
      <div style={{ display: "flex", gap: 8, padding: "12px 16px 8px" }}>
        <label style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: "var(--panel)", border: "1px solid var(--line)" }}>
          <div style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>{t("common.from")}</div>
          <input type="date" value={f} max={tt} onChange={(e) => setF(e.target.value)} className="mono"
            style={{ appearance: "none", border: 0, background: "transparent", marginTop: 6, font: "600 14.5px/1 var(--font-sans)", color: "var(--ink)", outline: "none", width: "100%" }} />
        </label>
        <label style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: "var(--panel)", border: "1px solid var(--accent)" }}>
          <div style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>{t("common.to")}</div>
          <input type="date" value={tt} min={f} onChange={(e) => setTt(e.target.value)} className="mono"
            style={{ appearance: "none", border: 0, background: "transparent", marginTop: 6, font: "600 14.5px/1 var(--font-sans)", color: "var(--ink)", outline: "none", width: "100%" }} />
        </label>
      </div>

      <div style={{ padding: "8px 16px 16px" }}>
        <button type="button" onClick={() => onApply(f, tt)} style={{
          width: "100%", height: 46, borderRadius: 12, border: 0,
          background: "var(--accent)", color: "#fff", font: "600 14px/1 var(--font-sans)", cursor: "pointer",
        }}>{t("dash.apply")}</button>
      </div>
    </Sheet>
  );
}
