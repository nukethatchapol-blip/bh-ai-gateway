"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./ui";
import { NavBar, SectionHeader, GroupCard } from "./mobile-ui";
import { useLang } from "./lang-context";

// Skill → hue (for the tinted icon + tag pill). Maps by name fragment so it
// works against the DB's free-text skill names without a coupling.
function skillHue(name = "") {
  const s = name.toLowerCase();
  if (s.includes("strateg")) return 25;       // red-orange
  if (s.includes("analyst") || s.includes("analy") || s.includes("data")) return 60; // amber/brown
  if (s.includes("market"))  return 280;      // violet
  if (s.includes("brand"))   return 200;      // teal
  // Default: warm brown
  return 60;
}
function tint(hue, isDark, mode) {
  // mode = "icon-bg" | "icon-fg" | "tag-bg" | "tag-fg"
  if (isDark) {
    if (mode === "icon-bg" || mode === "tag-bg") return `oklch(0.4 0.08 ${hue} / 0.3)`;
    return `oklch(0.82 0.12 ${hue})`;
  }
  if (mode === "icon-bg" || mode === "tag-bg") return `oklch(0.93 0.05 ${hue})`;
  return `oklch(0.42 0.13 ${hue})`;
}
function shortSkillLabel(name = "") {
  // Compact label for the row's skill tag (the design uses single-word tags).
  const s = name.toLowerCase();
  if (s.includes("strateg")) return "Strategy";
  if (s.includes("analyst") || s.includes("data")) return "Analyst";
  if (s.includes("market")) return "Marketing";
  if (s.includes("brand")) return "Brand";
  // Fallback: first word, max 12 chars
  const first = name.split(/\s+/)[0] || name;
  return first.length > 12 ? first.slice(0, 12) + "…" : first;
}

export function ChatHome({ profile, chats = [], skills = [], authorizedCount = 0 }) {
  const { t } = useLang();
  const [activeSkill, setActiveSkill] = useState("all");

  const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";

  const pinnedChats = chats.filter((c) => c.pinned === true);
  const recentChats = chats.filter((c) => !c.pinned);
  const matchesSkill = (c) => activeSkill === "all" || c.skill_id === activeSkill;
  const pinnedShown = pinnedChats.filter(matchesSkill);
  const recentShown = recentChats.filter(matchesSkill);

  return (
    <>
      <NavBar
        title={t("nav.chat")}
        sub={`${authorizedCount} ${authorizedCount === 1 ? "branch" : "branches"} in scope`}
        // Trailing now shows the scope pill instead of a "+" — new chat is the FAB.
        trailing={
          <span className="mono" style={{
            display: "inline-flex", alignItems: "center", gap: 5, height: 26, padding: "0 10px",
            borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-ink)",
            font: "600 11px/1 var(--font-mono)",
          }}>
            <Icon name="store" size={11} stroke={1.6} />
            {authorizedCount}
          </span>
        }
      />

      {/* visual search (not wired) */}
      <div style={{ padding: "4px 16px 12px", flexShrink: 0 }}>
        <div style={{
          height: 38, borderRadius: 11, background: "var(--bg-2)", display: "flex",
          alignItems: "center", padding: "0 12px", gap: 8,
        }}>
          <Icon name="search" size={15} stroke={1.5} style={{ color: "var(--muted)" }} />
          <span style={{ color: "var(--muted)", font: "400 15px/1 var(--font-sans)" }}>{t("recents.search")}</span>
        </div>
      </div>

      {/* skill chips */}
      <div style={{ padding: "0 16px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        <SkillChip active={activeSkill === "all"} onClick={() => setActiveSkill("all")}>All</SkillChip>
        {skills.map((s) => (
          <SkillChip key={s.id} active={activeSkill === s.id} onClick={() => setActiveSkill(s.id)}>{s.name}</SkillChip>
        ))}
      </div>

      {pinnedShown.length > 0 && (
        <>
          <SectionHeader>
            <Icon name="pin" size={11} fill="currentColor" stroke={0} style={{ color: "var(--accent)" }} />
            <span>{t("recents.pinned")} · {pinnedShown.length}</span>
          </SectionHeader>
          <GroupCard>
            {pinnedShown.map((c, i) => (
              <ChatRow key={c.id} chat={c} skills={skills} isDark={isDark} last={i === pinnedShown.length - 1} />
            ))}
          </GroupCard>
        </>
      )}

      {recentShown.length > 0 && (
        <>
          <SectionHeader>
            <span>{t("nav.recents")} · {recentShown.length}</span>
          </SectionHeader>
          <GroupCard>
            {recentShown.map((c, i) => (
              <ChatRow key={c.id} chat={c} skills={skills} isDark={isDark} last={i === recentShown.length - 1} />
            ))}
          </GroupCard>
        </>
      )}

      <div style={{ height: 16 }} />

      {/* Floating action button — new chat. Anchors to .m-shell (the nearest
          positioned ancestor inside the column), so it stays bottom-right
          regardless of scroll. */}
      <Link
        href="/chat?c=new"
        aria-label={t("recents.newChat")}
        title={t("recents.newChat")}
        style={{
          position: "absolute",
          right: 18,
          bottom: "calc(var(--tabbar-h) + 18px)",
          zIndex: 25,
          width: 56, height: 56, borderRadius: 18,
          background: "var(--accent)", color: "#fff", textDecoration: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 10px 26px -6px rgba(169,107,42,.6), 0 2px 6px rgba(0,0,0,.15)",
        }}
      >
        <Icon name="plus" size={24} stroke={2.2} />
      </Link>
    </>
  );
}

function ChatRow({ chat, skills, isDark, last }) {
  const router = useRouter();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const skill = skills.find((s) => s.id === chat.skill_id);
  const skillName = skill?.name || "";
  const hue = skillHue(skillName);
  const title = chat.title || t("recents.newChat");

  async function togglePin(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const r = await fetch(`/api/chats/${chat.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: !chat.pinned }),
    });
    setBusy(false);
    if (r.ok) router.refresh();
  }
  async function deleteChat(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!confirm(t("recents.deleteConfirm"))) return;
    setBusy(true);
    const r = await fetch(`/api/chats/${chat.id}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) router.refresh();
  }

  return (
    <div style={{ position: "relative", borderBottom: last ? "none" : "0.5px solid var(--line-2)" }}>
      <Link href={`/chat?c=${chat.id}`} style={{
        background: "var(--panel)", textDecoration: "none",
        display: "flex", gap: 12, padding: "13px 14px", alignItems: "center",
      }}>
        {/* skill-tinted icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: tint(hue, isDark, "icon-bg"),
          color: tint(hue, isDark, "icon-fg"),
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="sparkles" size={17} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            font: "600 14.5px/1.3 var(--font-sans)", color: "var(--ink)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{title}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 5, alignItems: "center" }}>
            {skill && (
              <span style={{
                display: "inline-flex", alignItems: "center", height: 18, padding: "0 7px", borderRadius: 6,
                font: "600 10.5px/1 var(--font-sans)",
                background: tint(hue, isDark, "tag-bg"),
                color: tint(hue, isDark, "tag-fg"),
              }}>{shortSkillLabel(skillName)}</span>
            )}
            {chat.branch_scope && (
              <span className="mono" style={{ font: "500 11px/1 var(--font-mono)", color: "var(--muted)" }}>
                {chat.branch_scope === "ALL" ? "All scope" : chat.branch_scope}
              </span>
            )}
            {chat.pinned && (
              <span style={{ color: "var(--accent)", flexShrink: 0, display: "inline-flex", marginLeft: 2 }}>
                <Icon name="pin" size={10} fill="currentColor" stroke={0} />
              </span>
            )}
          </div>
        </div>

        {/* right column: time + actions */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <span style={{ font: "400 11px/1 var(--font-sans)", color: "var(--muted)" }}>{relTime(chat.updated_at)}</span>
          <div style={{ display: "flex", gap: 2 }}>
            <button
              type="button"
              onClick={deleteChat}
              disabled={busy}
              aria-label={t("recents.delete")}
              title={t("recents.delete")}
              style={{
                width: 26, height: 26, borderRadius: 999, border: 0,
                background: "transparent", cursor: "pointer",
                color: "var(--muted-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            ><Icon name="trash" size={12} stroke={1.5} /></button>
            <button
              type="button"
              onClick={togglePin}
              disabled={busy}
              aria-label={chat.pinned ? t("recents.unpin") : t("recents.pin")}
              title={chat.pinned ? t("recents.unpin") : t("recents.pin")}
              style={{
                width: 26, height: 26, borderRadius: 999, border: 0,
                background: "transparent", cursor: "pointer",
                color: chat.pinned ? "var(--accent)" : "var(--muted-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            ><Icon name="pin" size={12} fill={chat.pinned ? "currentColor" : "none"} stroke={1.5} /></button>
          </div>
        </div>
      </Link>
    </div>
  );
}

function SkillChip({ children, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      appearance: "none", display: "inline-flex", alignItems: "center", height: 28, padding: "0 12px",
      borderRadius: 999, font: "500 12.5px/1 var(--font-sans)", cursor: "pointer",
      background: active ? "var(--ink)" : "transparent",
      color: active ? "var(--bg)" : "var(--ink-2)",
      border: active ? "0.5px solid transparent" : "0.5px solid var(--line)",
    }}>{children}</button>
  );
}

function relTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
