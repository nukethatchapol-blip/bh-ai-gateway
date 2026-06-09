"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, Avatar, LogoMark } from "./ui";
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
export function AssistantScreen({ profile, from, to, topDeviations = [], ranges = {} }) {
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
              <div style={{
                font: "400 14.5px/1.55 var(--font-sans)", color: "var(--ink-2)", marginBottom: 12,
              }}>
                {topDeviations.length
                  ? t("assistant.replyHasData")
                  : t("assistant.replyNoData")}
              </div>

              {/* dot list — top deviations (real numbers) */}
              {topDeviations.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  {topDeviations.map((d, i) => {
                    const dim = i > 0; // first row brighter, rest dimmed (design spec)
                    const sign = d.delta >= 0 ? "+" : "−";
                    return (
                      <div key={d.branchRef} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: 999,
                          background: dim ? "var(--muted-2)" : "var(--accent)",
                          flexShrink: 0,
                        }} />
                        <span style={{
                          flex: 1, font: "400 14px/1 var(--font-sans)", color: "var(--ink-2)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {d.branchName}
                        </span>
                        <span className="tnum" style={{
                          font: "600 14px/1 var(--font-sans)", color: "var(--ink)",
                        }}>
                          {sign}฿{Math.abs(Math.round(d.delta / 1000))}K
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* tri-color range bar */}
              {topDeviations.length > 0 && (
                <div style={{ display: "flex", gap: 4, height: 8, marginBottom: 8 }}>
                  <div style={{ flexGrow: Math.max(1, ranges.positive || 0), background: "var(--green-ok)", borderRadius: 4 }} />
                  <div style={{ flexGrow: Math.max(1, ranges.negative || 0), background: "var(--peach-b)",  borderRadius: 4 }} />
                  <div style={{ flexGrow: Math.max(1, ranges.neutral  || 0), background: "var(--ring-track)", borderRadius: 4 }} />
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
