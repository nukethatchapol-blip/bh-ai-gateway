"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./ui";
import { NavBar, SectionHeader, GroupCard, roundBtn } from "./mobile-ui";
import { useLang } from "./lang-context";

export function ChatHome({ profile, chats = [], skills = [], authorizedCount = 0 }) {
  const { t } = useLang();
  const [activeSkill, setActiveSkill] = useState("all");

  const pinnedChats = chats.filter((c) => c.pinned === true);
  const recentChats = chats.filter((c) => !c.pinned);

  // Optional client-side skill filter over the visible groups.
  const matchesSkill = (c) => activeSkill === "all" || c.skill_id === activeSkill;
  const pinnedShown = pinnedChats.filter(matchesSkill);
  const recentShown = recentChats.filter(matchesSkill);

  const quickStarts = [t("recents.q1"), t("recents.q2"), t("recents.q3")];

  return (
    <>
      <NavBar
        title={t("nav.chat")}
        sub={`${authorizedCount} ${authorizedCount === 1 ? "branch" : "branches"} in scope`}
        trailing={
          <Link href="/chat?c=new" aria-label={t("recents.newChat")} style={{ ...roundBtn(), textDecoration: "none" }}>
            <Icon name="plus" size={18} stroke={1.8} />
          </Link>
        }
      />

      {/* search (visual) */}
      <div style={{ padding: "4px 16px 12px", flexShrink: 0 }}>
        <div style={{
          height: 36, borderRadius: 10, background: "var(--bg-2)", display: "flex",
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

      {/* PINNED */}
      {pinnedShown.length > 0 && (
        <>
          <SectionHeader>
            <Icon name="pin" size={11} fill="currentColor" stroke={0} style={{ color: "var(--accent)" }} />
            <span>{t("recents.pinned")} · {pinnedShown.length}</span>
          </SectionHeader>
          <GroupCard>
            {pinnedShown.map((c, i) => (
              <ChatRow key={c.id} chat={c} skills={skills} last={i === pinnedShown.length - 1} />
            ))}
          </GroupCard>
        </>
      )}

      {/* RECENT */}
      {recentShown.length > 0 && (
        <>
          <SectionHeader>
            <span>{t("nav.recents")} · {recentShown.length}</span>
          </SectionHeader>
          <GroupCard>
            {recentShown.map((c, i) => (
              <ChatRow key={c.id} chat={c} skills={skills} last={i === recentShown.length - 1} />
            ))}
          </GroupCard>
        </>
      )}

      {/* QUICK START */}
      <SectionHeader>{t("recents.quickStart")}</SectionHeader>
      <GroupCard style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent-ink)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="sparkles" size={14} />
          </div>
          <div style={{ font: "600 14px/1 var(--font-sans)", color: "var(--ink)" }}>{t("recents.askAnalyst")}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {quickStarts.map((q, i) => (
            <Link key={i} href="/chat?c=new" style={{
              display: "block", textDecoration: "none",
              border: "0.5px solid var(--line)", background: "var(--bg-2)",
              borderRadius: 10, padding: "10px 12px", textAlign: "left",
              font: "400 13.5px/1.35 var(--font-sans)", color: "var(--ink-2)",
            }}>{q}</Link>
          ))}
        </div>
      </GroupCard>

      <div style={{ height: 16 }} />
    </>
  );
}

function ChatRow({ chat, skills, last }) {
  const router = useRouter();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const skill = skills.find((s) => s.id === chat.skill_id);
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

  return (
    <div style={{ position: "relative", borderBottom: last ? "none" : "0.5px solid var(--line-2)" }}>
      <Link href={`/chat?c=${chat.id}`} style={{
        position: "relative", background: "var(--panel)", textDecoration: "none",
        display: "flex", gap: 12, padding: "12px 16px", alignItems: "center",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: "var(--accent-soft)", color: "var(--accent-ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="sparkles" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }}>
              {chat.pinned && (
                <span style={{ color: "var(--accent)", flexShrink: 0, display: "inline-flex" }}>
                  <Icon name="pin" size={11} fill="currentColor" stroke={0} />
                </span>
              )}
              <div style={{
                font: "600 14.5px/1.25 var(--font-sans)", color: "var(--ink)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{title}</div>
            </div>
            <div style={{ font: "400 11.5px/1 var(--font-sans)", color: "var(--muted)", flexShrink: 0 }}>{relTime(chat.updated_at)}</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 5, alignItems: "center", flexWrap: "wrap" }}>
            {skill && <span style={{ font: "400 12.5px/1 var(--font-sans)", color: "var(--muted)" }}>{skill.name}</span>}
            {skill && chat.branch_scope && <span style={{ color: "var(--muted-2)" }}>·</span>}
            {chat.branch_scope && (
              <span className="mono" style={{ font: "500 11.5px/1 var(--font-mono)", color: "var(--muted)" }}>
                {chat.branch_scope === "ALL" ? "All scope" : chat.branch_scope}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={togglePin}
          disabled={busy}
          aria-label={chat.pinned ? t("recents.unpin") : t("recents.pin")}
          title={chat.pinned ? t("recents.unpin") : t("recents.pin")}
          style={{
            width: 30, height: 30, borderRadius: 999, border: 0, flexShrink: 0,
            background: "transparent", cursor: "pointer",
            color: chat.pinned ? "var(--accent)" : "var(--muted-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="pin" size={14} fill={chat.pinned ? "currentColor" : "none"} stroke={1.5} />
        </button>
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

// Compact relative-time hint ("now", "3h", "2d", or a short date).
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
