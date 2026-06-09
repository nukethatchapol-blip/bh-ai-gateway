"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, Avatar, LogoMark, Sparkline } from "./ui";
import { useLang } from "./lang-context";

// Smart AI Assistant — Phase N.
// Mirrors the design's "02 · Smart AI Assistant" frame element-by-element:
//   • Top bar: back button + centered title + avatar trailing
//   • Rounded-top chat card with "✨ Smart AI Assistant" header + collapse
//   • User message: avatar + name above, text, file chip with ID, timestamp
//   • AI message: LogoMark + "Nova AI" header, intro line, dot list of
//     revenue deviations, tri-color range bar, timestamp
//   • Quick action pills row: Files / Images / Voice Chat
//   • Composer: input + plus button + dark send
// Numbers come from real KPI deltas computed in the server page.
export function AssistantScreen({ profile, from, to, topDeviations = [], ranges = {}, hero = null }) {
  const { t } = useLang();
  const router = useRouter();

  const dateLabel = labelTime(); // 11:32-style stamp for the messages
  const fileId = "#" + String(Date.parse(from || "") || 62354976).slice(-8);
  const fileName = `revenue_${from}_${to}.xlsx`;

  return (
    <div style={{
      // Make this screen fill the visible area inside MobileShell minus the
      // tab bar height — without this the card collapses to its content
      // height and leaves a white gap below.
      minHeight: "calc(100dvh - var(--tabbar-h) - 16px)",
      display: "flex", flexDirection: "column",
      // Peach-stack-1 outer so the white card sits visually elevated, like
      // the design's "card-on-tinted-tray" pattern.
      background: "var(--peach-stack-1)",
    }}>
      {/* === top bar === */}
      <div style={{ padding: "8px 16px 10px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <Link href="/activity" aria-label="Back" style={iconBtn()}>
          <Icon name="chevleft" size={14} stroke={2} />
        </Link>
        <div style={{ flex: 1, textAlign: "center", font: "600 17px/1.2 var(--font-sans)", color: "var(--ink)" }}>
          {t("assistant.title")}
        </div>
        <Avatar name={profile?.full_name || profile?.email || "?"} size={40} />
      </div>

      {/* === chat card (rounded top, fills below) === */}
      <div style={{
        flex: 1, minHeight: 0, margin: "0 12px",
        background: "var(--panel)",
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        border: "0.5px solid var(--peach-stack-2)", borderBottom: 0,
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 -2px 12px -4px rgba(238,154,100,.25)",
      }}>
        {/* card header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderBottom: "0.5px solid var(--line-2)",
          flexShrink: 0,
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            font: "600 14px/1 var(--font-sans)", color: "var(--ink)",
          }}>
            <Icon name="sparkles" size={15} style={{ color: "var(--accent)" }} />
            {t("assistant.title")}
          </span>
          <Link href="/chat" aria-label={t("assistant.expandToChat")} style={{
            color: "var(--muted)", display: "flex",
          }}>
            <Icon name="ext" size={14} />
          </Link>
        </div>

        {/* scrollable conversation */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {/* === user message === */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
              <Avatar name={profile?.full_name || profile?.email || "?"} size={28} />
              <span style={{ font: "600 13.5px/1 var(--font-sans)", color: "var(--ink)" }}>
                {profile?.full_name || profile?.email || "You"}
              </span>
            </div>
            <div style={{
              font: "400 14.5px/1.55 var(--font-sans)", color: "var(--ink-2)",
              marginLeft: 37,
            }}>
              {t("assistant.userPrompt")}
            </div>

            {/* file attachment chip */}
            <div style={{
              marginLeft: 37, marginTop: 10,
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 12,
              background: "var(--bg-2)", border: "0.5px solid var(--line)",
              maxWidth: "fit-content",
            }}>
              <span style={{
                width: 30, height: 30, borderRadius: 8,
                background: "var(--panel)", border: "0.5px solid var(--line)",
                color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="doc" size={15} />
              </span>
              <div>
                <div style={{ font: "600 12px/1 var(--font-sans)", color: "var(--ink)" }}>
                  {fileName}
                </div>
                <div className="mono" style={{
                  font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4,
                }}>
                  ID: {fileId}
                </div>
              </div>
            </div>

            <div className="mono" style={{
              marginLeft: 37, marginTop: 6,
              font: "400 10.5px/1 var(--font-mono)", color: "var(--muted-2)",
            }}>{dateLabel}</div>
          </div>

          {/* === AI message === */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <LogoMark size={28} />
              <span style={{ font: "600 13.5px/1 var(--font-sans)", color: "var(--ink)" }}>
                {t("assistant.brand")}
              </span>
            </div>

            <div style={{ marginLeft: 37 }}>
              {hero ? (
                <ExecAnswer
                  hero={hero}
                  drivers={topDeviations.slice(1, 4).concat(topDeviations.length === 1 ? [topDeviations[0]] : []).slice(0, 3)}
                  ranges={ranges}
                  t={t}
                />
              ) : (
                <div style={{
                  font: "400 14.5px/1.55 var(--font-sans)", color: "var(--ink-2)", marginBottom: 12,
                }}>
                  {t("assistant.replyNoData")}
                </div>
              )}

              <div className="mono" style={{
                font: "400 10.5px/1 var(--font-mono)", color: "var(--muted-2)",
              }}>{dateLabel}</div>
            </div>
          </div>
        </div>

        {/* === quick action pills === */}
        <div style={{ display: "flex", gap: 8, padding: "10px 16px 0", flexWrap: "wrap" }}>
          {[
            { i: "doc",      l: t("assistant.pill.files") },
            { i: "sparkles", l: t("assistant.pill.images") },
            { i: "bolt",     l: t("assistant.pill.voice") },
          ].map((p) => (
            <span key={p.l} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              height: 34, padding: "0 14px", borderRadius: 999,
              border: "0.5px solid var(--line)", background: "var(--panel)",
              font: "500 12.5px/1 var(--font-sans)", color: "var(--ink-2)",
            }}>
              <Icon name={p.i} size={13} style={{ color: "var(--muted)" }} />
              {p.l}
            </span>
          ))}
        </div>

        {/* === composer === */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = String(fd.get("q") || "").trim();
            if (!q) return;
            router.push(`/chat?c=new&q=${encodeURIComponent(q.slice(0, 400))}`);
          }}
          style={{
            padding: "12px 16px",
            paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              name="q"
              placeholder={t("assistant.composerPlaceholder")}
              style={{
                flex: 1, height: 46, borderRadius: 16,
                background: "var(--bg-2)", border: "0.5px solid var(--line)",
                padding: "0 16px", outline: 0,
                font: "400 14px/1 var(--font-sans)", color: "var(--ink)",
              }}
            />
            <button type="button" aria-label="Attach" style={{
              width: 46, height: 46, borderRadius: 14,
              border: "0.5px solid var(--line)", background: "var(--panel)",
              color: "var(--ink)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <Icon name="plus" size={17} stroke={1.8} />
            </button>
            <button type="submit" aria-label="Send" style={{
              width: 46, height: 46, borderRadius: 14, border: 0,
              background: "var(--ink)", color: "var(--bg)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <Icon name="send" size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Executive Summary card — Phase P.
// Replaces the plain "Nova AI" body when the assistant has real KPI data.
// Pattern from design: peach-tinted header strip, hero metric with green/red
// delta + sparkline, "Bottom line" tinted box with peach left border,
// "What moved it" driver list, "Recommended next step" footer.
function ExecAnswer({ hero, drivers = [], ranges = {}, t }) {
  const metric = formatRevK(hero.curRev);
  const unit = "K";
  const delta = `${hero.up ? "+" : ""}${hero.pct.toFixed(1)}%`;
  const sub = `${hero.branchName} · ${hero.bills.toLocaleString()} ${t("dash.bills")}`;
  // Deterministic spark (small wave biased by direction)
  const spark = makeSpark(hero.up);
  const bottomLine = hero.up
    ? t("assistant.bottomLine.up", { name: hero.branchName, pct: Math.abs(hero.pct).toFixed(1) })
    : t("assistant.bottomLine.down", { name: hero.branchName, pct: Math.abs(hero.pct).toFixed(1) });
  const recommendation = hero.up
    ? t("assistant.recommendation.up", { name: hero.branchName })
    : t("assistant.recommendation.down", { name: hero.branchName });

  return (
    <div style={{
      borderRadius: 18, overflow: "hidden", margin: "0 0 14px",
      border: "0.5px solid var(--line)", background: "var(--panel)",
      boxShadow: "0 4px 18px -10px rgba(0,0,0,.14)",
    }}>
      {/* header strip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "11px 16px",
        borderBottom: "0.5px solid var(--line-2)",
        background: "var(--peach-stack-1)",
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: 7, flexShrink: 0,
          background: "var(--peach-grad)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="sparkles" size={12} />
        </span>
        <span className="mono" style={{
          font: "600 11px/1 var(--font-mono)", letterSpacing: ".08em",
          textTransform: "uppercase", color: "var(--accent-ink)",
        }}>{t("assistant.execHeader")}</span>
        <span className="mono" style={{
          marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
          font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)",
        }}>
          <Icon name="store" size={10} stroke={1.6} /> {hero.branchRef}
        </span>
      </div>

      {/* hero metric */}
      <div style={{
        padding: "18px 16px 16px",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="tnum" style={{
              font: "700 38px/0.95 var(--font-sans)", letterSpacing: "-0.03em", color: "var(--ink)",
            }}>{metric}</span>
            <span style={{ font: "500 14px/1 var(--font-sans)", color: "var(--muted)" }}>{unit}</span>
          </div>
          <div style={{
            font: "400 12.5px/1.3 var(--font-sans)", color: "var(--muted)", marginTop: 7,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200,
          }}>{sub}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <span className="tnum" style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            height: 26, padding: "0 9px", borderRadius: 999,
            font: "700 13px/1 var(--font-sans)",
            background: hero.up ? "rgba(58,155,118,.13)" : "rgba(216,89,63,.12)",
            color: hero.up ? "var(--green-ok)" : "#d8593f",
          }}>
            <span aria-hidden style={{ display: "inline-flex" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {hero.up
                  ? <><path d="M3 11l4-4 3 3 4-5" /><path d="M11 5h3v3" /></>
                  : <><path d="M3 5l4 4 3-3 4 5" /><path d="M11 11h3v-3" /></>}
              </svg>
            </span>
            {delta}
          </span>
          <span style={{ color: hero.up ? "var(--green-ok)" : "#d8593f" }}>
            <Sparkline data={spark} w={88} h={26} color="currentColor" />
          </span>
        </div>
      </div>

      {/* bottom line */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{
          padding: "12px 14px", borderRadius: 12,
          background: "var(--accent-soft)", borderLeft: "2.5px solid var(--accent)",
        }}>
          <div className="mono" style={{
            font: "600 10px/1 var(--font-mono)", letterSpacing: ".08em",
            textTransform: "uppercase", color: "var(--accent-ink)", marginBottom: 6,
          }}>{t("assistant.bottomLineLabel")}</div>
          <div style={{ font: "400 14px/1.55 var(--font-sans)", color: "var(--ink)" }}>{bottomLine}</div>
        </div>
      </div>

      {/* what moved it */}
      {drivers.length > 0 && (
        <div style={{ padding: "0 16px 8px" }}>
          <div className="mono" style={{
            font: "600 10px/1 var(--font-mono)", letterSpacing: ".08em",
            textTransform: "uppercase", color: "var(--muted)", marginBottom: 4,
          }}>{t("assistant.driversLabel")}</div>
          {drivers.map((d, i) => {
            const up = d.pct >= 0;
            const isLast = i === drivers.length - 1;
            return (
              <div key={d.branchRef + i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                borderBottom: !isLast ? "0.5px solid var(--line-2)" : "none",
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: up ? "rgba(58,155,118,.13)" : "rgba(216,89,63,.1)",
                  color: up ? "var(--green-ok)" : "#d8593f",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={up ? "arrow_up" : "arrow_down"} size={12} stroke={1.8} />
                </span>
                <span style={{
                  flex: 1, font: "400 13.5px/1.3 var(--font-sans)", color: "var(--ink-2)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{d.branchName}</span>
                <span className="tnum" style={{
                  font: "600 13px/1 var(--font-mono)",
                  color: up ? "var(--green-ok)" : "#d8593f",
                }}>
                  {up ? "+" : ""}{d.pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* recommendation */}
      {recommendation && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10, padding: "13px 16px",
          margin: "8px 0 0", borderTop: "0.5px solid var(--line-2)",
          background: "var(--peach-stack-1)",
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 1,
            background: "var(--accent)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="sparkles" size={14} stroke={1.6} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="mono" style={{
              font: "600 10px/1 var(--font-mono)", letterSpacing: ".08em",
              textTransform: "uppercase", color: "var(--accent-ink)", marginBottom: 5,
            }}>{t("assistant.recLabel")}</div>
            <div style={{ font: "500 13.5px/1.5 var(--font-sans)", color: "var(--ink)" }}>{recommendation}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRevK(n) {
  if (!n) return "0";
  const k = n / 1000;
  if (k >= 1000) return (k / 1000).toFixed(1) + "M";
  return k.toFixed(k < 10 ? 1 : 0);
}

function makeSpark(up) {
  // Tiny deterministic series — ramp up or down toward the latest value.
  const base = [3, 4, 3, 5, 4, 5, 6, 5, 7];
  return up ? base : base.slice().reverse();
}

function iconBtn() {
  return {
    width: 40, height: 40, borderRadius: 13, flexShrink: 0, cursor: "pointer",
    border: "0.5px solid var(--line)", background: "var(--panel)", color: "var(--ink)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    textDecoration: "none",
  };
}

function labelTime() {
  // Stable HH:MM label for SSR (uses fixed minute offset to avoid hydration mismatch).
  // The design shows 11:32/11:33 — we'll do the same to keep the visual stable.
  return "11:32";
}
