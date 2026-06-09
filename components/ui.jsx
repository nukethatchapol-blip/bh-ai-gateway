"use client";

import React from "react";

const ICONS = {
  search:    "M11 11 14 14 M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  plus:      "M8 3v10 M3 8h10",
  close:     "M4 4l8 8 M12 4l-8 8",
  check:     "M3 8.5 6.5 12 13 4.5",
  chevdown:  "M4 6l4 4 4-4",
  chevright: "M6 4l4 4-4 4",
  chevleft:  "M10 4 6 8l4 4",
  chevup:    "M4 10l4-4 4 4",
  send:      "M2.5 8 14 3 9 14l-2-5-4.5-1z",
  paperclip: "M11.5 7.5 7 12a3 3 0 1 1-4.2-4.2L8 2.6a2 2 0 1 1 2.8 2.8L5.6 10.6a1 1 0 1 1-1.4-1.4L9 4.4",
  sparkles:  "M8 2v3 M8 11v3 M2 8h3 M11 8h3 M4 4l2 2 M12 12l-2-2 M4 12l2-2 M12 4l-2 2",
  user:      "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2.5 14a5.5 5.5 0 0 1 11 0",
  users:     "M5.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M1.5 14a4 4 0 0 1 8 0 M11 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M10 11h.5a3.5 3.5 0 0 1 3.5 3.5",
  shield:    "M8 1.5 2.5 4v4.5C2.5 12 5 13.8 8 14.5c3-.7 5.5-2.5 5.5-6V4L8 1.5z",
  store:     "M2 6h12 M2.5 6 4 2.5h8L13.5 6 M3 6v8h10V6 M6.5 14v-4h3v4",
  chat:      "M2.5 7.5a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H5.5L2.5 14V7.5z",
  dashboard: "M3 3h4v6H3z M9 3h4v3H9z M3 11h4v2H3z M9 8h4v5H9z",
  key:       "M10.5 3a3 3 0 1 1-2.7 4.3L3 12v2h2l.5-.5V12H7v-1.5L8.5 9 M11 5.5h.01",
  cog:       "M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M8 1v1.5 M8 13.5V15 M1 8h1.5 M13.5 8H15 M3 3l1 1 M12 12l1 1 M3 13l1-1 M12 4l1-1",
  filter:    "M2 3.5h12 M4 7.5h8 M6 11.5h4",
  download:  "M8 2v8 M4.5 7 8 10.5 11.5 7 M3 13.5h10",
  upload:    "M8 14V6 M4.5 9 8 5.5 11.5 9 M3 2.5h10",
  trash:     "M3 4.5h10 M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5 M4.5 4.5 5 13a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8.5",
  edit:      "M11 2.5 13.5 5 5.5 13H3v-2.5l8-8z",
  eye:       "M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  eyeoff:    "M3 3l10 10 M6 6a2 2 0 0 0 2.8 2.8 M9.5 4a6.5 6.5 0 0 1 5 4s-1 2-3 3.5 M1.5 8s2.5-5 6.5-5",
  globe:     "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M1.5 8h13 M8 1.5c2 2 2 11 0 13 M8 1.5c-2 2-2 11 0 13",
  bolt:      "M9 2 3 9h4l-1 5 6-7H8l1-5z",
  doc:       "M3.5 1.5h6L12.5 4.5V14a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5z M9.5 1.5V4.5h3",
  copy:      "M5.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z M3.5 10.5h-1a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v1",
  arrow_up:   "M8 13V3 M3.5 7.5 8 3l4.5 4.5",
  arrow_down: "M8 3v10 M3.5 8.5 8 13l4.5-4.5",
  menu:      "M2 4h12 M2 8h12 M2 12h12",
  side_collapse: "M9 4 5 8l4 4",
  side_expand:   "M5 4l4 4-4 4",
  ext: "M6.5 2.5h-4v11h11v-4 M9 2.5h4.5V7 M8 8 13 3",
  google: "M8 6.7V9.2h3.5c-.15.9-.6 1.65-1.3 2.15v1.8h2.1C13.55 12 14.3 10.4 14.3 8.4c0-.55-.05-1.1-.15-1.6z M8 14.5c1.75 0 3.2-.6 4.3-1.55l-2.1-1.65c-.6.4-1.35.65-2.2.65-1.7 0-3.1-1.15-3.6-2.7H2.25v1.7A6.5 6.5 0 0 0 8 14.5z M4.4 9.2c-.15-.4-.2-.85-.2-1.3s.05-.9.2-1.3v-1.7H2.25C1.85 5.7 1.6 6.85 1.6 8s.25 2.3.65 3.1L4.4 9.2z M8 4.7c1 0 1.9.35 2.6 1l1.95-1.95C11.2 2.6 9.75 2 8 2A6.5 6.5 0 0 0 2.25 5.6L4.4 7.3c.5-1.55 1.9-2.6 3.6-2.6z",
  pin: "M5 2.5h6 M6.5 2.5 5.5 8 M9.5 2.5 10.5 8 M3.5 8h9 M8 8v6",
  clock: "M8 1.6a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8z M8 4.6V8l2.6 1.6",
  ticket: "M8.6 1.5H3A1.5 1.5 0 0 0 1.5 3v5.6a1 1 0 0 0 .3.7l6.4 6.4a1 1 0 0 0 1.4 0l5.6-5.6a1 1 0 0 0 0-1.4L9.3 1.8a1 1 0 0 0-.7-.3z M5.2 5.2h.01",
  flag: "M3.5 14.5V2 M3.5 2.8c2.7-1.4 5.4 1.4 8.1 0v5.4c-2.7 1.4-5.4-1.4-8.1 0z",
  home: "M2.5 7.5 8 2.5l5.5 5 M3.5 7v6.5h9V7 M6.5 13.5v-3h3v3",
};

export function Icon({ name, size = 16, stroke = 1.5, fill = "none", style, ...rest }) {
  const d = ICONS[name];
  if (!d) return <span style={{ display: "inline-block", width: size, height: size, ...style }} {...rest} />;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={fill} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0, ...style }} {...rest}>
      <path d={d} />
    </svg>
  );
}

const AVATAR_HUES = [12, 35, 68, 110, 155, 195, 225, 265, 305, 340];
export function Avatar({ name = "?", size = 28, ring = false }) {
  const initials = (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0] || "")
    .join("")
    .toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = AVATAR_HUES[h % AVATAR_HUES.length];
  return (
    <div
      className="tnum"
      style={{
        width: size, height: size, borderRadius: 999, flexShrink: 0,
        background: `oklch(0.92 0.06 ${hue})`, color: `oklch(0.32 0.1 ${hue})`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        font: `600 ${Math.round(size * 0.4)}px/1 var(--font-sans)`,
        boxShadow: ring ? "0 0 0 2px var(--panel), 0 0 0 3.5px var(--accent)" : "none",
      }}
    >
      {initials || "?"}
    </div>
  );
}

export function Sparkline({ data = [], w = 80, h = 22, color = "currentColor", fill = true }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const dy = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / dy) * (h - 4) - 2]);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function BarMini({ data = [], w = 220, h = 56, color = "currentColor" }) {
  if (!data.length) return null;
  const max = Math.max(...data) || 1;
  const bw = w / data.length;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {data.map((v, i) => {
        const bh = (v / max) * (h - 6);
        return <rect key={i} x={i * bw + bw * 0.18} y={h - bh} width={bw * 0.64} height={bh} fill={color} opacity={0.75} rx="1.5" />;
      })}
    </svg>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div style={{
      display: "inline-flex", padding: 2, gap: 2, background: "var(--bg-2)",
      borderRadius: 8, border: "0.5px solid var(--line)", height: 30,
    }}>
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const l = typeof opt === "string" ? opt : opt.label;
        const active = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} className="mono" type="button"
            style={{
              appearance: "none", border: 0, height: 26, padding: "0 10px",
              borderRadius: 6, font: "500 11px/1 var(--font-mono)", letterSpacing: ".02em",
              background: active ? "var(--panel)" : "transparent",
              color: active ? "var(--ink)" : "var(--muted)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              cursor: "pointer", textTransform: "uppercase",
            }}>{l}</button>
        );
      })}
    </div>
  );
}

export function Switch({ value, onChange, size = 18 }) {
  return (
    <button onClick={() => onChange(!value)} aria-pressed={value} type="button"
      style={{
        appearance: "none", border: 0, padding: 0, cursor: "pointer",
        width: size * 1.9, height: size, borderRadius: 999,
        background: value ? "var(--accent)" : "var(--line)",
        position: "relative", transition: "background 120ms ease",
      }}>
      <span style={{
        position: "absolute", top: 2, left: value ? size * 0.9 + 0 : 2,
        width: size - 4, height: size - 4, borderRadius: 999, background: "#fff",
        transition: "left 140ms cubic-bezier(.5,.1,.3,1)",
        boxShadow: "0 1px 2px rgba(0,0,0,.2)",
      }} />
    </button>
  );
}

export function Tabs({ value, onChange, tabs }) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: "0.5px solid var(--line)" }}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} type="button"
            style={{
              appearance: "none", border: 0, background: "transparent",
              padding: "10px 12px", cursor: "pointer",
              font: `${active ? 600 : 500} 13px/1 var(--font-sans)`,
              color: active ? "var(--ink)" : "var(--muted)",
              borderBottom: `2px solid ${active ? "var(--ink)" : "transparent"}`,
              marginBottom: -1,
            }}>
            {t.label}
            {t.count != null && (
              <span className="tnum" style={{
                marginLeft: 6, fontSize: 11, color: "var(--muted)",
                padding: "1px 5px", borderRadius: 4, background: "var(--bg-2)",
                border: "0.5px solid var(--line)",
              }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyHint({ icon = "sparkles", title, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      gap: 10, padding: "48px 24px", color: "var(--muted)", textAlign: "center" }}>
      <Icon name={icon} size={22} stroke={1.25} style={{ color: "var(--muted-2)" }} />
      <div style={{ font: "500 14px/1.3 var(--font-sans)", color: "var(--ink-2)" }}>{title}</div>
      {hint && <div style={{ font: "400 12.5px/1.5 var(--font-sans)", maxWidth: 320 }}>{hint}</div>}
      {children}
    </div>
  );
}

export function BearLogo({ size = 28, tone = "cream", radius = 8 }) {
  const isCream = tone === "cream";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: isCream ? "var(--logo-bg)" : "transparent",
      overflow: "hidden",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bearhouse-logo.png"
        alt="BEARHOUSE"
        width={Math.round(size * 1.05)}
        height={Math.round(size * 1.05)}
        style={{ display: "block", filter: isCream ? "none" : "brightness(1.15) saturate(0.9)" }}
      />
    </span>
  );
}

export function Field({ label, right, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", justifyContent: "space-between", font: "500 12px/1 var(--font-sans)", color: "var(--ink-2)" }}>
        <span>{label}</span>
        {right}
      </span>
      {children}
      {hint && <span className="muted" style={{ font: "400 11.5px/1.4 var(--font-sans)" }}>{hint}</span>}
    </label>
  );
}

export function Modal({ children, onClose, title, width = 480 }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width, maxWidth: "100%", background: "var(--panel)",
        border: "0.5px solid var(--line)", borderRadius: 14, boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 48px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
          <div style={{ font: "600 14px/1 var(--font-sans)" }}>{title}</div>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose} type="button"><Icon name="close" size={12} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function RoleBadge({ role }) {
  const map = {
    admin:   { bg: "oklch(0.92 0.06 280)", fg: "oklch(0.36 0.16 285)" },
    manager: { bg: "var(--accent-soft)",  fg: "var(--accent-ink)"    },
    staff:   { bg: "var(--bg-2)",         fg: "var(--ink-2)"         },
  };
  const m = map[role] || map.staff;
  return <span className="badge" style={{ background: m.bg, color: m.fg, borderColor: "transparent" }}>{role}</span>;
}

// ─────────────────────────────────────────────────────────────
// New design primitives (Phase F) — used by Activity/Analytics
// ─────────────────────────────────────────────────────────────

// LogoMark — peach-gradient pill containing the BEARHOUSE bear inverted to
// white. Replaces the cream-square BearLogo on surfaces that adopted the new
// peach palette. Aspect ratio ~1.15:1 (a soft horizontal pill, not a square).
export function LogoMark({ size = 40 }) {
  return (
    <span style={{
      width: size * 1.15, height: size, borderRadius: size * 0.45, flexShrink: 0,
      background: "var(--peach-grad)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 10px -3px rgba(238,154,100,.5)",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bearhouse-bear.png"
        alt=""
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        style={{ display: "block", filter: "brightness(0) invert(1)", opacity: 0.95 }}
      />
    </span>
  );
}

// Ring — circular progress arc on a track. Value/total controls the arc,
// `label` (defaults to value) sits in the centre with optional `sub` line.
export function Ring({ value, total, size = 72, stroke = 7, color = "var(--accent)", label, sub }) {
  const pct = Math.max(0, Math.min(1, value / Math.max(1, total)));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--ring-track, var(--line))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ font: "700 16px/1 var(--font-sans)", color: "var(--ink)" }}>
          {label ?? value}
        </span>
        {sub && (
          <span className="mono" style={{ font: "500 9px/1 var(--font-mono)", color: "var(--muted)", marginTop: 2 }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// SegBar — segmented progress bar with multi-color cells. Each segment has a
// `pct` weight (flex-grow) and a `color`. Reads as: orange = autoflow share,
// green = resolved share, grey = manual/pending share, etc.
export function SegBar({ segments = [], height = 6, gap = 3 }) {
  return (
    <div style={{ display: "flex", gap, height, alignItems: "stretch" }}>
      {segments.map((s, i) => (
        <div key={i} style={{
          flexGrow: s.pct || 1, borderRadius: 3,
          background: s.color || "var(--line)", minWidth: 3,
        }} />
      ))}
    </div>
  );
}

// DenseBars — dense vertical-bar chart with optional smooth line overlay
// across the tops. Used on the Analytics screen's Performance Insights card.
// Data array is values 0..1; if omitted, generates a deterministic preview.
export function DenseBars({ data, w = 320, h = 120, hotFrom = 0.45, hotTo = 0.72 }) {
  const bars = data || (() => {
    // Deterministic LCG so SSR + CSR match without RNG.
    const n = 54;
    let s = 7;
    return Array.from({ length: n }, () => {
      s = (s * 9301 + 49297) % 233280;
      return 0.25 + (s / 233280) * 0.7;
    });
  })();
  const n = bars.length;
  const line = bars.map((v, i) => [(i / Math.max(1, n - 1)) * w, h - v * h * 0.82 - 6]);
  const linePath = line.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const bw = w / n;
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible", maxWidth: "100%" }}>
      {bars.map((v, i) => {
        const bh = v * h * 0.82;
        const hot = i > n * hotFrom && i < n * hotTo;
        return (
          <rect key={i}
            x={i * bw + bw * 0.2} y={h - bh - 4}
            width={bw * 0.55} height={bh} rx={1}
            fill={hot ? "var(--accent)" : "var(--muted-2)"}
            opacity={hot ? 0.92 : 0.5}
          />
        );
      })}
      <path d={linePath} fill="none" stroke="var(--ink)" strokeWidth="1.25"
        strokeLinejoin="round" opacity={0.65} />
    </svg>
  );
}

export function prettySize(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}
