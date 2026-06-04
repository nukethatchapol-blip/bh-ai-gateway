"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui";
import { useLang } from "./lang-context";

// "What changed this month" — AI-flavored insight panel on the dashboard.
// Fetches the per-user insight list from /api/insights/monthly. Each card
// expands to show detail + action buttons. "Ask in chat" prefills /chat
// with a question rooted in the insight so the user can dig further.
export function StrategyPanel({ from, to }) {
  const router = useRouter();
  const { t } = useLang();
  const [items, setItems] = useState(null); // null = loading, [] = empty
  const [open, setOpen]   = useState(0);    // index of expanded card (0 = first by default)
  const [err, setErr]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ from, to }).toString();
    fetch(`/api/insights/monthly?${qs}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((j) => { if (!cancelled) setItems(j.items || []); })
      .catch((e) => { if (!cancelled) { setErr(e.message); setItems([]); } });
    return () => { cancelled = true; };
  }, [from, to]);

  if (items === null) return <StrategyPanelSkeleton />;
  if (items.length === 0) return null;

  return (
    <div style={{ margin: "0 16px 14px" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 2px 10px" }}>
        <span style={{
          width: 24, height: 24, borderRadius: 8, flexShrink: 0,
          background: "var(--peach-grad)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="sparkles" size={13} />
        </span>
        <span style={{ font: "600 14px/1 var(--font-sans)", color: "var(--ink)" }}>
          {t("dash.insightsTitle")}
        </span>
        <span className="mono" style={{
          marginLeft: "auto", font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)",
        }}>{items.length} insights</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it, i) => (
          <InsightCard
            key={i}
            item={it}
            isOpen={open === i}
            onToggle={() => setOpen(open === i ? -1 : i)}
            onAskInChat={() => askInChat(router, it)}
          />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ item, isOpen, onToggle, onAskInChat }) {
  const isAlert = item.kind === "alert";
  const tint    = isAlert ? "var(--accent)"     : "var(--green-ok)";
  const soft    = isAlert ? "var(--accent-soft)" : "rgba(58,155,118,.15)";
  const ink     = isAlert ? "var(--accent-ink)"  : "var(--green-ok)";
  const label   = isAlert ? "ALERT" : "STRATEGY";
  const ic      = isAlert ? "bolt" : "sparkles";

  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      border: `0.5px solid ${isOpen ? tint : "var(--line)"}`,
      background: "var(--panel)",
      boxShadow: isOpen ? `0 6px 18px -10px ${tint}` : "0 1px 2px rgba(0,0,0,.03)",
      transition: "border-color 140ms ease",
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%", appearance: "none", border: 0, background: "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 11,
          padding: "12px 13px", textAlign: "left",
        }}
      >
        <span style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          background: soft, color: ink,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name={ic} size={15} stroke={1.7} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mono" style={{
              font: "600 10px/1 var(--font-mono)", letterSpacing: ".06em",
              textTransform: "uppercase", color: ink,
            }}>{label}</span>
            <span className="mono" style={{
              font: "500 10px/1 var(--font-mono)", color: "var(--muted)",
            }}>{item.branch}</span>
          </div>
          <div style={{
            font: "600 14px/1.3 var(--font-sans)", color: "var(--ink)", marginTop: 4,
            overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: isOpen ? "normal" : "nowrap",
          }}>{item.title}</div>
        </div>
        <span style={{
          font: "700 13px/1 var(--font-sans)",
          color: item.metricNeg ? "#d8593f" : ink,
          flexShrink: 0,
        }}>{item.metric}</span>
        <span style={{
          display: "inline-flex", flexShrink: 0, color: "var(--muted)",
          transform: isOpen ? "rotate(180deg)" : "none",
          transition: "transform 160ms ease",
        }}>
          <Icon name="chevdown" size={13} stroke={1.8} />
        </span>
      </button>

      {isOpen && (
        <div style={{ padding: "0 13px 13px 54px" }}>
          <p style={{
            font: "400 13px/1.55 var(--font-sans)", color: "var(--ink-2)",
            margin: "0 0 12px",
          }}>{item.detail}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onAskInChat}
              style={{
                appearance: "none", border: 0, cursor: "pointer",
                height: 36, borderRadius: 11, padding: "0 14px",
                background: tint, color: "#fff",
                display: "inline-flex", alignItems: "center", gap: 7,
                font: "600 12.5px/1 var(--font-sans)",
              }}
            >
              <Icon name="sparkles" size={12} /> {item.action || "Take action"}
            </button>
            <button
              type="button"
              onClick={onAskInChat}
              style={{
                appearance: "none", cursor: "pointer",
                height: 36, borderRadius: 11, padding: "0 14px",
                background: "transparent", border: "0.5px solid var(--line)",
                color: "var(--ink-2)", font: "500 12.5px/1 var(--font-sans)",
              }}
            >Ask in chat</button>
          </div>
        </div>
      )}
    </div>
  );
}

function askInChat(router, item) {
  // Send the user to a new chat with a prefilled query that captures the
  // insight context. We can't directly populate the chat composer from a
  // route param yet, so we use a `q` param the chat page can pick up later.
  const q = `${item.title} (branch ${item.branch}) — why?\n\n${item.detail}`;
  router.push(`/chat?c=new&q=${encodeURIComponent(q.slice(0, 400))}`);
}

function StrategyPanelSkeleton() {
  return (
    <div style={{ margin: "0 16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 2px 10px" }}>
        <div style={{
          width: 24, height: 24, borderRadius: 8,
          background: "var(--bg-2)",
        }} />
        <div style={{ width: 160, height: 12, background: "var(--bg-2)", borderRadius: 4 }} />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          marginBottom: 8, padding: 12, borderRadius: 14,
          background: "var(--panel)", border: "0.5px solid var(--line)",
          display: "flex", alignItems: "center", gap: 11,
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--bg-2)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: 70, height: 9, background: "var(--bg-2)", borderRadius: 3, marginBottom: 7 }} />
            <div style={{ width: "85%", height: 12, background: "var(--bg-2)", borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
