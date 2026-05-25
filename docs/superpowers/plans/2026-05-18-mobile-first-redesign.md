# Mobile-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sidebar layout with the iOS-style mobile-first design (bottom tab bar, large titles, grouped cards, bottom sheets) at all widths, reusing the existing cream/brown light+dark tokens and all backend logic.

**Architecture:** A centered phone-width column (`MobileShell`) with a fixed bottom `TabBar` replaces `AppShell`/`Sidebar`. Shared iOS atoms live in `components/mobile-ui.jsx`. Each screen is restyled by porting its visual structure from the design reference and wiring the existing real data + handlers. Presentation-only — no API/RLS/auth changes.

**Tech Stack:** Next.js 14 App Router (JS), React client components, existing Supabase data + i18n + chat-agent loop.

Spec: `docs/superpowers/specs/2026-05-18-mobile-first-redesign-design.md`
Visual reference (exact JSX to port from): `docs/superpowers/design-ref/mobile-screens.jsx` and `docs/superpowers/design-ref/screenshots/`.

This is a **visual rebuild** — no new unit tests (the existing Vitest suite for markdown/stream/tools/loop must stay green). Verification is `npm run build` + manual. Dev server may run on :3000 — do NOT run `npm run dev`; `npm run build` is fine.

---

## Token mapping (use in EVERY ported screen)

The reference uses an `M.*` proxy. When porting, replace each `M.<key>` with the CSS variable below (e.g. `background: M.bg` → `background: "var(--bg)"`). Fonts: `M.font` → `var(--font-sans)`, `M.mono` → `var(--font-mono)`.

| `M.` key | CSS var | `M.` key | CSS var |
|---|---|---|---|
| bg | `var(--bg)` | line | `var(--line)` |
| bg2 | `var(--bg-2)` | line2 | `var(--line-2)` |
| panel | `var(--panel)` | accent | `var(--accent)` |
| ink | `var(--ink)` | accentSoft | `var(--accent-soft)` |
| ink2 | `var(--ink-2)` | accentInk | `var(--accent-ink)` |
| muted | `var(--muted)` | cream | `var(--brand-cream)` |
| muted2 | `var(--muted-2)` | cream2 | `var(--brand-cream-2)` |

Special: `M.brownDark` → `"#1c1308"`; `M.toggleOff` → `var(--line)`; `M.tabBg`/`M.composerBg`/`M.scrim` → see Task 1 (defined as CSS vars). `M.isDark` → read `document.documentElement.getAttribute("data-theme") === "dark"` only if strictly needed; prefer pure CSS-var styling that works in both themes.

---

## File Structure

**Created:**
- `components/mobile-ui.jsx` — shared atoms: `NavBar`, `GroupCard`, `SectionHeader`, `Sheet`, `MToggle`, `SafeArea`, `roundBtn()` helper
- `components/tab-bar.jsx` — bottom tab bar (Chat/Dashboard/Admin/Settings)
- `components/mobile-shell.jsx` — centered phone-width column + tab bar; replaces `AppShell`
- `components/chat-home.jsx` — Chat home (pinned + recent + quick start)
- `app/(app)/settings/page.jsx` + `components/settings-screen.jsx` — Settings tab

**Modified:**
- `app/globals.css` — mobile shell + safe-area + sheet helper classes/vars
- `app/(app)/layout.jsx` — use `MobileShell` + `TabBar`; drop `Sidebar`
- `app/(app)/chat/page.jsx` — branch on `searchParams.c`: list vs conversation
- `components/chat-screen.jsx` — restyle conversation + composer; skill picker → sheet
- `components/dashboard-screen.jsx` — restyle; date-range button → sheet
- `components/admin-screen.jsx`, `components/access-screen.jsx`, `components/apikeys-screen.jsx` — restyle
- `app/page.jsx` / `components/login-screen.jsx` — restyle login

**Retired (after Task 2):** `components/shell.jsx` (Sidebar/AppShell) — its `RecentItem` logic moves into `chat-home.jsx`.

---

## PHASE 1 — Shell, tab bar, atoms, Settings

### Task 1: globals.css mobile additions

**Files:** Modify `app/globals.css`

- [ ] **Step 1:** Append to `app/globals.css`:

```css
/* ---------- mobile-first shell ---------- */
:root {
  --tab-bg: rgba(250, 247, 241, 0.88);
  --composer-bg: rgba(250, 247, 241, 0.92);
  --sheet-scrim: rgba(0, 0, 0, 0.4);
  --safe-bottom: 20px;
}
:root[data-theme="dark"] {
  --tab-bg: rgba(20, 16, 11, 0.85);
  --composer-bg: rgba(20, 16, 11, 0.92);
  --sheet-scrim: rgba(0, 0, 0, 0.6);
}
.m-shell {
  width: 100%; max-width: 480px; margin: 0 auto;
  height: 100vh; position: relative;
  background: var(--bg); color: var(--ink);
  display: flex; flex-direction: column; overflow: hidden;
  border-left: 0.5px solid var(--line); border-right: 0.5px solid var(--line);
}
.m-shell-bg { min-height: 100vh; background: var(--bg-2); }
.m-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
.m-tabbar {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 30;
  padding-bottom: var(--safe-bottom);
  background: var(--tab-bg); backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 0.5px solid var(--line);
}
.m-sheet-scrim { position: absolute; inset: 0; z-index: 40; background: var(--sheet-scrim); backdrop-filter: blur(2px); }
.m-sheet {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 50;
  background: var(--bg); border-radius: 24px 24px 0 0;
  padding-bottom: calc(var(--safe-bottom) + 4px);
  box-shadow: 0 -20px 60px rgba(0,0,0,.18);
  animation: sheet-up 240ms cubic-bezier(.4,.0,.2,1);
}
@keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
```

- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Commit:
```bash
git add app/globals.css
git commit -m "feat: mobile shell css (column, tab bar, sheet)"
```

### Task 2: Mobile UI atoms

**Files:** Create `components/mobile-ui.jsx`

- [ ] **Step 1:** Create `components/mobile-ui.jsx`. Port the visual structure of `MNavBar`, `SectionHeader`, `MToggle`, and the bottom-sheet wrapper from `docs/superpowers/design-ref/mobile-screens.jsx` (lines 164-232 for SafeBody/NavBar, 384-392 SectionHeader, 1007-1022 MToggle, 633-645 sheet header), applying the token mapping. Export:

```jsx
"use client";
import React from "react";
import { Icon } from "./ui";

export const SAFE_TOP = 8;

export function NavBar({ title, sub, leading, trailing }) {
  return (
    <div style={{ padding: "8px 20px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 32 }}>
        {leading || <span style={{ width: 32 }} />}
        {trailing || <span style={{ width: 32 }} />}
      </div>
      <div style={{ marginTop: 6 }}>
        <h1 style={{ font: "700 30px/1.15 var(--font-sans)", letterSpacing: "-0.02em", margin: 0, color: "var(--ink)" }}>{title}</h1>
        {sub && <div style={{ font: "400 13px/1.3 var(--font-sans)", color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

export function SectionHeader({ children }) {
  return (
    <div style={{
      padding: "18px 20px 8px", display: "flex", alignItems: "center", gap: 5,
      font: "500 11px/1 var(--font-mono)", color: "var(--muted)",
      letterSpacing: ".08em", textTransform: "uppercase",
    }}>{children}</div>
  );
}

export function GroupCard({ children, style }) {
  return (
    <div style={{
      margin: "0 16px", background: "var(--panel)", borderRadius: 14,
      border: "0.5px solid var(--line)", overflow: "hidden", ...style,
    }}>{children}</div>
  );
}

export function MToggle({ on, onChange }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={on} style={{
      appearance: "none", border: 0, padding: 2, cursor: "pointer",
      width: 44, height: 26, borderRadius: 999,
      background: on ? "var(--accent)" : "var(--line)",
      display: "inline-flex", alignItems: "center", flexShrink: 0,
      transition: "background 120ms ease",
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 999, background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,.25)",
        marginLeft: on ? 18 : 0, transition: "margin-left 120ms ease",
      }} />
    </button>
  );
}

export function roundBtn() {
  return {
    width: 32, height: 32, borderRadius: 999, border: "0.5px solid var(--line)",
    background: "var(--panel)", color: "var(--ink)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
}

export function Sheet({ title, onClose, footer, children }) {
  return (
    <div className="m-sheet-scrim" onClick={onClose}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--line)" }} />
        </div>
        <div style={{ padding: "12px 20px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {typeof footer === "object" && footer?.left ? footer.left : <span style={{ width: 48 }} />}
          <div style={{ font: "600 17px/1.2 var(--font-sans)", color: "var(--ink)" }}>{title}</div>
          <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: "var(--accent-ink)", font: "600 14px/1 var(--font-sans)", cursor: "pointer" }}>
            {footer?.right || "Done"}
          </button>
        </div>
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Commit:
```bash
git add components/mobile-ui.jsx
git commit -m "feat: mobile UI atoms (NavBar, GroupCard, Sheet, Toggle)"
```

### Task 3: Bottom tab bar

**Files:** Create `components/tab-bar.jsx`

- [ ] **Step 1:** Create `components/tab-bar.jsx`:

```jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";
import { useLang } from "./lang-context";

export function TabBar({ role }) {
  const pathname = usePathname();
  const { t } = useLang();
  const tabs = [
    { id: "chat", href: "/chat", icon: "chat", label: t("nav.chat") },
    { id: "dashboard", href: "/dashboard", icon: "dashboard", label: t("nav.dashboard") },
    ...(role === "admin" ? [{ id: "admin", href: "/admin", icon: "shield", label: t("nav.admin") }] : []),
    { id: "settings", href: "/settings", icon: "cog", label: t("nav.settings") },
  ];
  return (
    <div className="m-tabbar">
      <div style={{ display: "flex", padding: "8px 8px 4px" }}>
        {tabs.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link key={tab.id} href={tab.href} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "6px 0", textDecoration: "none",
              color: active ? "var(--accent-ink)" : "var(--muted)",
            }}>
              <Icon name={tab.icon} size={22} stroke={1.5} />
              <span style={{ font: `${active ? 600 : 500} 10.5px/1 var(--font-sans)` }}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** Add the i18n key. In `lib/i18n.js`, after the `"nav.access"` line add:
```js
  "nav.settings":            { en: "Settings",            th: "ตั้งค่า" },
```

- [ ] **Step 3:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 4:** Commit:
```bash
git add components/tab-bar.jsx lib/i18n.js
git commit -m "feat: bottom tab bar"
```

### Task 4: Mobile shell + retire sidebar in app layout

**Files:** Create `components/mobile-shell.jsx`; Modify `app/(app)/layout.jsx`

- [ ] **Step 1:** Create `components/mobile-shell.jsx`:

```jsx
"use client";
import { TabBar } from "./tab-bar";

export function MobileShell({ role, children }) {
  return (
    <div className="m-shell-bg">
      <div className="m-shell">
        <div className="m-scroll" style={{ paddingBottom: 84 }}>{children}</div>
        <TabBar role={role} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** Rewrite `app/(app)/layout.jsx` to use it. Replace the `AppShell`/`Sidebar` import + return with:

```jsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileShell } from "@/components/mobile-shell";

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles").select("id, email, full_name, role, status").eq("id", user.id).single();
  if (!profile) redirect("/");
  if (profile.status === "pending") redirect("/pending");
  if (profile.status === "disabled") redirect("/?err=disabled");

  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", profile.id);

  return <MobileShell role={profile.role}>{children}</MobileShell>;
}
```

(The recents query is removed from the layout — Chat home fetches its own list in Phase 2.)

- [ ] **Step 3:** Run `npm run build` — expect `✓ Compiled successfully`. (Screens still render with their current desktop styling inside the column for now; that's fine — later phases restyle them.)
- [ ] **Step 4:** Commit:
```bash
git add components/mobile-shell.jsx "app/(app)/layout.jsx"
git commit -m "feat: mobile shell replaces sidebar in app layout"
```

### Task 5: Settings screen + route

**Files:** Create `app/(app)/settings/page.jsx`, `components/settings-screen.jsx`

- [ ] **Step 1:** Create `app/(app)/settings/page.jsx`:

```jsx
import { createClient } from "@/lib/supabase/server";
import { SettingsScreen } from "@/components/settings-screen";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles").select("id, email, full_name, role").eq("id", user.id).single();
  return <SettingsScreen profile={profile} />;
}
```

- [ ] **Step 2:** Create `components/settings-screen.jsx`. Use `NavBar`, `GroupCard`, `SectionHeader` from `mobile-ui`. Sections: Account (avatar + name + role), Workspace (link to API Keys `/apikeys`; if admin, Branch Access `/access`), Apps (map `EXTERNAL_APPS` from `@/lib/apps` to external `<a target="_blank">` rows), Appearance (theme toggle via existing pattern — set `document.documentElement.dataset.theme` and persist a `theme` cookie; language toggle via `useLang().setLang`), and a Sign out button calling `POST /api/auth/logout` then `router.push("/")`. Each row: icon + label + chevron, using `Icon` from `./ui`. Full code:

```jsx
"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, Icon, RoleBadge } from "./ui";
import { NavBar, GroupCard, SectionHeader, MToggle } from "./mobile-ui";
import { useLang } from "./lang-context";
import { EXTERNAL_APPS } from "@/lib/apps";

function Row({ icon, label, href, external, right, onClick }) {
  const inner = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", cursor: "pointer" }}>
      <Icon name={icon} size={16} stroke={1.6} style={{ color: "var(--muted)" }} />
      <span style={{ flex: 1, font: "400 15px/1 var(--font-sans)", color: "var(--ink)" }}>{label}</span>
      {right}
      {(href || external) && <Icon name={external ? "ext" : "chevright"} size={13} style={{ color: "var(--muted-2)" }} />}
    </div>
  );
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", borderBottom: "0.5px solid var(--line-2)" }}>{inner}</a>;
  if (href) return <Link href={href} style={{ textDecoration: "none", display: "block", borderBottom: "0.5px solid var(--line-2)" }}>{inner}</Link>;
  return <div onClick={onClick} style={{ borderBottom: "0.5px solid var(--line-2)" }}>{inner}</div>;
}

export function SettingsScreen({ profile }) {
  const router = useRouter();
  const { t, lang, setLang } = useLang();
  const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `theme=${next}; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`;
    router.refresh();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/"); router.refresh();
  }

  return (
    <>
      <NavBar title={t("nav.settings")} />
      <SectionHeader>{t("settings.account")}</SectionHeader>
      <GroupCard>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
          <Avatar name={profile.full_name || profile.email} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "600 15px/1.2 var(--font-sans)" }}>{profile.full_name || profile.email}</div>
            <div className="mono" style={{ font: "400 11.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4 }}>{profile.email}</div>
          </div>
          <RoleBadge role={profile.role} />
        </div>
      </GroupCard>

      <SectionHeader>{t("settings.workspace")}</SectionHeader>
      <GroupCard>
        <Row icon="key" label={t("nav.apikeys")} href="/apikeys" />
        {profile.role === "admin" && <Row icon="store" label={t("nav.access")} href="/access" />}
      </GroupCard>

      <SectionHeader>{t("apps.group")}</SectionHeader>
      <GroupCard>
        {EXTERNAL_APPS.map((app) => (
          <Row key={app.id} icon={app.icon} label={t(app.labelKey)} href={app.url} external />
        ))}
      </GroupCard>

      <SectionHeader>{t("settings.appearance")}</SectionHeader>
      <GroupCard>
        <Row icon="sparkles" label={t("settings.darkMode")} right={<MToggle on={isDark} onChange={toggleTheme} />} />
        <Row icon="globe" label={t("settings.language")} right={
          <button type="button" onClick={() => setLang(lang === "th" ? "en" : "th")}
            className="mono" style={{ border: 0, background: "var(--bg-2)", color: "var(--ink-2)", padding: "4px 10px", borderRadius: 6, font: "500 11px/1 var(--font-mono)", cursor: "pointer" }}>
            {lang === "th" ? "ไทย" : "EN"}
          </button>
        } />
      </GroupCard>

      <div style={{ padding: "20px 16px 8px" }}>
        <button type="button" onClick={logout} style={{
          width: "100%", height: 46, borderRadius: 12, border: "0.5px solid var(--line)",
          background: "var(--panel)", color: "oklch(0.55 0.18 25)", font: "600 14px/1 var(--font-sans)", cursor: "pointer",
        }}>{t("nav.signout")}</button>
      </div>
    </>
  );
}
```

- [ ] **Step 3:** Add i18n keys. In `lib/i18n.js` after `"nav.settings"` add:
```js
  "settings.account":        { en: "Account",             th: "บัญชี" },
  "settings.workspace":      { en: "Workspace",           th: "พื้นที่ทำงาน" },
  "settings.appearance":     { en: "Appearance",          th: "การแสดงผล" },
  "settings.darkMode":       { en: "Dark mode",           th: "โหมดมืด" },
  "settings.language":       { en: "Language",            th: "ภาษา" },
```

- [ ] **Step 4:** Persist the theme. In `app/layout.jsx`, the root layout already reads the `lang` cookie; make it read a `theme` cookie too so the Settings toggle survives reloads. Change the `<html>` line to use it:
```jsx
  const theme = c.get("theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang={lang} data-theme={theme} data-density="regular">
```
(`c` is the already-awaited `cookies()` store in that file.)

- [ ] **Step 5:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 6:** Commit:
```bash
git add "app/(app)/settings/page.jsx" components/settings-screen.jsx lib/i18n.js app/layout.jsx
git commit -m "feat: settings screen + persistent theme cookie"
```

**End of Phase 1 — app navigates via bottom tabs; Settings works; sidebar gone.**

---

## PHASE 2 — Login + Chat

### Task 6: Login restyle

**Files:** Modify `components/login-screen.jsx`

- [ ] **Step 1:** Restyle the signed-out state to match `MLogin` (reference lines 237-277): full-bleed `#1c1308` hero, bear chip + "BEARHOUSE" eyebrow, headline `ai-store` / `assistant.` (accent `#e2a55a`), then bottom action stack — "Continue with Google" (cream button → existing `signInWithGoogle`), "Sign in with email" (outline → reveals the existing email/password form or routes to it), "Request access" (→ existing register mode). Keep ALL existing Supabase handlers (`signInWithGoogle`, `submitLogin`, `submitRegister`, the `?code` redirect, the hash-token effect). Center the column at `max-width: 480px` so it also looks right on desktop. Preserve the `SetupNotice` env-missing branch and the `PendingPanel`.
- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Commit:
```bash
git add components/login-screen.jsx
git commit -m "feat: mobile login restyle"
```

### Task 7: Chat home (list)

**Files:** Create `components/chat-home.jsx`; Modify `app/(app)/chat/page.jsx`

- [ ] **Step 1:** In `app/(app)/chat/page.jsx`, branch on `searchParams.c`. When absent, fetch the chat list and render `ChatHome`; when present (including `"new"`), keep the existing conversation path (`ChatScreen`). Add to the page:
```jsx
  const params = await searchParams;
  if (!params?.c) {
    const { data: chats } = await supabase
      .from("chats").select("id, title, skill_id, model_id, branch_scope, pinned, updated_at")
      .order("pinned", { ascending: false }).order("updated_at", { ascending: false }).limit(40);
    return <ChatHome profile={profile} chats={chats || []} skills={skills || []} authorizedCount={authorizedIds.length} />;
  }
```
(Import `ChatHome`. Keep the existing conversation branch below for when `c` is present; `?c=new` yields an empty `initialMessages`.)

- [ ] **Step 2:** Create `components/chat-home.jsx`. Port `MChatList` + `ChatRow` + `SkillChip` (reference lines 282-474) with token mapping. Wire real data: `chats` prop (each row links to `/chat?c=<id>`), pinned split by `chat.pinned`, the pin toggle calls `PATCH /api/chats/[id] {pinned}` then `router.refresh()` (reuse the logic from the retired `RecentItem`). The `+` button links to `/chat?c=new`. Quick-start prompts link to `/chat?c=new` (static for now). Use `NavBar`, `SectionHeader`, `GroupCard` from `mobile-ui`.
- [ ] **Step 3:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 4:** Manual: `/chat` shows the list; tapping a row opens `/chat?c=<id>`; the `+` opens a new chat. Commit:
```bash
git add components/chat-home.jsx "app/(app)/chat/page.jsx"
git commit -m "feat: mobile chat home (pinned + recent + quick start)"
```

### Task 8: Conversation + composer restyle

**Files:** Modify `components/chat-screen.jsx`

- [ ] **Step 1:** Restyle the conversation view to match `MChatConversation` (reference lines 487-607): compact top bar (back button → `/chat`, centered title + branch chip, search round button), message bubbles (user = `var(--ink)` bubble; assistant = header + body), tool card, mini tables, and the sticky composer with attach/skill/model pills + round send button (reference lines 572-604). **Preserve all existing logic**: the SSE `send()` streaming loop, `ThinkingBox` + global `showThinking` toggle, tool-call/tool-result rendering, `parseMarkdown`, `MessageBlock`, scope pill, file drop, `chatId`/`initialMessages` hydration. Only the presentation (container styles, bubble shapes, composer chrome) changes. Keep the back button as a `<Link href="/chat">`.
- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Commit:
```bash
git add components/chat-screen.jsx
git commit -m "feat: mobile conversation + composer restyle"
```

### Task 9: Skill / model picker → bottom sheet

**Files:** Modify `components/chat-screen.jsx`

- [ ] **Step 1:** Replace the skill picker and model picker popovers with bottom `Sheet`s (reference `MChatPicker` lines 620-692). The skill pill in the composer opens a `Sheet` titled "Skill" listing `skills` (active highlighted, tools chips, "Only skills you've been granted appear here" note). The model pill opens a `Sheet` titled "Model" listing `MODELS`. Selecting sets the existing `skillId`/`modelId` state and closes the sheet. Use the `Sheet` atom from `mobile-ui`.
- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Commit:
```bash
git add components/chat-screen.jsx
git commit -m "feat: skill/model picker as bottom sheets"
```

**End of Phase 2 — login, chat home, conversation, and pickers are mobile-first.**

---

## PHASE 3 — Dashboard + date picker

### Task 10: Dashboard restyle

**Files:** Modify `components/dashboard-screen.jsx`

- [ ] **Step 1:** Restyle to match `MDashboard` (reference lines 697-838): `NavBar` large title + scope sub; a date-range button row (opens the sheet from Task 11) + download round button; scope banner; 2×2 KPI cards with sparklines (wire the real `kpis`/`totals` already computed in the component); revenue chart card (reuse the existing SVG, restyled); top-branches `GroupCard` list (wire the real `stats`). Keep the real `bearhouse_branch_kpis` data and the `from`/`to` props. Use `NavBar`, `GroupCard`, `SectionHeader`, `roundBtn`.
- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Commit:
```bash
git add components/dashboard-screen.jsx
git commit -m "feat: mobile dashboard restyle"
```

### Task 11: Date-range picker bottom sheet

**Files:** Modify `components/dashboard-screen.jsx`

- [ ] **Step 1:** Add a date-range `Sheet` (reference `MDatePicker` lines 1123-1267): From/To chips, preset chips (Today, Yesterday, Last 7/14/30 days, This week, This month, Quarter to date), and a month calendar with range highlight. Wire it to the existing `from`/`to` state and the `/dashboard?from&to` navigation: presets compute dates and call the existing `applyRange(from, to)`; tapping calendar days sets the range; "Apply" navigates. Replace the current `<input type="date">` pair's role with this sheet (keep the inputs as a fallback inside the sheet if simpler). Use the `Sheet` atom.
- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Commit:
```bash
git add components/dashboard-screen.jsx
git commit -m "feat: date-range picker bottom sheet"
```

**End of Phase 3 — dashboard + date picker are mobile-first.**

---

## PHASE 4 — Admin, Access, API Keys

### Task 12: Admin restyle

**Files:** Modify `components/admin-screen.jsx`

- [ ] **Step 1:** Restyle to match `MAdmin` (reference lines 843-930): `NavBar` "Admin" + pending count + admin pill; a segmented control (Approvals/Users/Skills/Audit/Quotas) styled as the reference's pill segmented; approval cards with avatar, pending pill, requested scope, note, and Approve/Deny buttons. **Keep all existing tab logic + the role dropdown (RoleSelect) + approve/deny/role API calls.** Use `NavBar`, `GroupCard`. The existing tables get wrapped in `GroupCard`s; keep horizontal scroll for wide tables.
- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Commit:
```bash
git add components/admin-screen.jsx
git commit -m "feat: mobile admin restyle"
```

### Task 13: Branch access restyle

**Files:** Modify `components/access-screen.jsx`

- [ ] **Step 1:** Restyle to match `MAccess` (reference lines 935-1022): a compact nav with back + "Branch access" + Save; a user summary card (avatar, role pill, granted/total count); region-grouped toggle list using `MToggle`; "Default deny" note. **Keep the existing user selection, the scope Set state, toggle/grant/revoke logic, and the `POST /api/admin/access` apply call.** On mobile the three-pane desktop layout collapses to: a user selector (the existing mobile tab list or a compact picker) → the selected user's region-grouped toggle list. Use `NavBar`/`GroupCard`/`MToggle`/`SectionHeader`.
- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Commit:
```bash
git add components/access-screen.jsx
git commit -m "feat: mobile branch access restyle"
```

### Task 14: API Keys restyle

**Files:** Modify `components/apikeys-screen.jsx`

- [ ] **Step 1:** Restyle to match `MApiKeys` (reference lines 1027-1118): `NavBar` "API Keys" + sub; summary `GroupCard` (monthly spend + gateway credits with progress bar); providers `GroupCard` list (icon, name, active pill, masked key/last4, spend/limit, chevron → opens the existing key modal); "Add provider" dashed button; encryption notice. **Keep the existing BYO key save/delete (`/api/apikeys`) and the `KeyEditModal`** (can stay a modal or become a `Sheet` — modal is fine). Use `NavBar`/`GroupCard`/`SectionHeader`.
- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Manual sweep across all screens at 390px and 1280px widths; toggle theme + language. Commit:
```bash
git add components/apikeys-screen.jsx
git commit -m "feat: mobile api keys restyle"
```

**End of Phase 4 — full mobile-first redesign complete.**

---

## Verification (whole feature)

- [ ] `npm run build` — compiles clean
- [ ] `npx vitest run` — existing suite (markdown/stream/tools/loop) still green
- [ ] Bottom tabs navigate Chat/Dashboard/Admin/Settings; Admin tab hidden for non-admins
- [ ] Chat home → conversation → streaming reply works; thinking toggle + pin/rename still work
- [ ] Dashboard shows real KPIs; date sheet changes the range
- [ ] Admin approve/deny + role dropdown work; Access toggles + Apply work; API keys save works
- [ ] Theme + language toggles (in Settings) flip the whole app
- [ ] Looks right in a centered column at 390px and 1280px
