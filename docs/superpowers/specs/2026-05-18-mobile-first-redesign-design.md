# Mobile-First Redesign — Design Spec

_Date: 2026-05-18 · Project: BEARHOUSE AI Gateway_

## Goal

Adopt the iOS-style mobile design (from the Claude Design handoff,
`mobile.html` / `src/mobile-screens.jsx`) as **the** layout at all widths.
Bottom-tab navigation replaces the sidebar; every screen is rebuilt as
large-title + grouped-card iOS conventions in the existing cream/brown
light+dark palette. The whole app renders in a centered phone-width column.

This is a **presentation-layer rebuild** — no backend, API, RLS, data, or
auth logic changes.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Scope vs. desktop | **Mobile-first everywhere** — one layout at all widths; the sidebar is retired |
| Source of truth | The mobile mockup screens in the design bundle |
| Tokens | Reuse existing `globals.css` cream/brown light+dark CSS vars (the mockup palette mirrors them) |
| Delivery | Phased (4 batches) |

## Current state (what changes / what stays)

**Retired:**
- `components/shell.jsx` `Sidebar` + `AppShell` (sidebar nav). Its parts
  redistribute: nav → bottom tab bar; recents → Chat home; theme/lang +
  app launcher → Settings screen.

**Reused unchanged (backend + logic):**
- All `app/api/**` routes; Supabase RLS; the agentic chat loop
  (`lib/ai/**`); pin/rename/delete; i18n (`lib/i18n.js` + `lang-context`);
  the external-app registry (`lib/apps.js`); models (`lib/models.js`).
- The server pages keep fetching the same data; only the rendered
  components change.

**Theme:** `data-theme` on `<html>` already drives light/dark via CSS vars.
The mobile palette maps onto the existing vars (`--bg`, `--bg-2`, `--panel`,
`--ink`, `--ink-2`, `--muted`, `--muted-2`, `--line`, `--line-2`, `--accent`,
`--accent-soft`, `--accent-ink`). No new token system.

## Architecture

### Shell — `components/mobile-shell.jsx` (new)
- `MobileShell`: centers a **max-width 480px column** on the cream backdrop
  (`--bg-2` gutters on desktop), full-height, with the fixed bottom tab bar.
- Replaces `AppShell`/`Sidebar` in `app/(app)/layout.jsx`.
- Wraps the existing `SidebarProvider`? No — the drawer is gone. Keep
  `LangProvider` (already at root). Add nothing else.

### Bottom tab bar — `components/tab-bar.jsx` (new)
- Tabs (client component, active from `usePathname`):
  - **Chat** → `/chat` (icon `chat`)
  - **Dashboard** → `/dashboard` (icon `dashboard`)
  - **Admin** → `/admin` (icon `shield`) — rendered only when `role === "admin"`
  - **Settings** → `/settings` (icon `cog`)
- Fixed bottom, blur background, hairline top border, 34px safe-area pad.
- Branch Access and API Keys are reached from Settings/Admin, not tabs.

### Shared mobile atoms — `components/mobile-ui.jsx` (new)
- `NavBar` (large title + optional sub + leading/trailing actions)
- `GroupCard` (rounded 14px panel, hairline border)
- `SectionHeader` (uppercase mono label)
- `Sheet` (bottom sheet: scrim, rounded top, grab handle, title row)
- `Toggle` (iOS switch — reuse/restyle existing `Switch`)
- `Segmented` (reuse existing `ui.jsx` Segmented, restyled)
- These read the existing CSS vars; no hard-coded colors.

### Routing changes
- **`/chat`** stays the chat route; the **query param decides the view**
  (no new dynamic route — reuses the existing page + `?c=` loader):
  - `/chat` (no param) → **Chat home** (pinned + recent list + quick start).
  - `/chat?c=<id>` → **Conversation** for that chat (existing loader).
  - `/chat?c=new` → a fresh **Conversation** (empty thread + composer).
  - The chat page server component branches on `searchParams.c`: absent →
    fetch the chat list and render Chat home; present → fetch messages (as
    today) and render the conversation.
- **`/settings`** (new route + screen): API Keys link, the 3 app-launcher
  links, theme toggle, language toggle, sign out.
- `/dashboard`, `/admin`, `/access`, `/apikeys` keep their routes; screens
  restyled. `/apikeys` and `/access` are reached via Settings/Admin links.

## Screen specs

1. **Login** (`app/page.jsx` + `components/login-screen.jsx`)
   - Full-bleed dark hero (`--brand-brown-deep`), bear chip + "BEARHOUSE",
     headline "ai-store assistant.", "Continue with Google", "Sign in with
     email", "Request access". Keeps all Supabase auth handlers.

2. **Chat home** (`/chat`, new `components/mobile/chat-home.jsx`)
   - Large title "Chats" + scope sub; avatar leading; `+` new-chat trailing
     (→ `/chat?c=new`).
   - Search field (static), skill filter chips, **Pinned** group, **Recent**
     group (rows link to `/chat?c=<id>`), Quick-start prompts.
   - Pin toggle per row → existing `PATCH /api/chats/[id] {pinned}`.

3. **Conversation** (`/chat?c=<id>` or `?c=new`, restyle `chat-screen.jsx`)
   - Compact back-nav + title + branch chip; user/assistant bubbles; tool
     card; mini tables; sticky composer with attach/skill/model pills + send.
   - **Preserves** streaming SSE, thinking box + global toggle, tool events,
     markdown rendering, scope enforcement.

4. **Skill / model picker** — bottom `Sheet` over the conversation.

5. **Dashboard** (`dashboard-screen.jsx` restyle)
   - Large title + scope sub; date-range button (opens sheet); scope banner;
     2×2 KPI cards w/ sparklines; revenue chart card; top-branches list.
   - Keeps the real `bearhouse_branch_kpis` RPC + date `searchParams`.

6. **Date-range picker** — bottom `Sheet`: From/To chips, preset chips,
   month calendar with range highlight. Applies via the existing
   `/dashboard?from&to` navigation.

7. **Admin** (`admin-screen.jsx` restyle) — large title, segmented
   (Approvals/Users/Skills/Audit), approval cards w/ Approve/Deny. Keeps the
   role dropdown + approve/deny API calls.

8. **Branch access** (`access-screen.jsx` restyle) — summary card +
   region-grouped toggle list + "Apply changes". Keeps the access API.

9. **API Keys** (`apikeys-screen.jsx` restyle) — spend/credits summary,
   provider list, add provider. Keeps BYO key save/delete API.

10. **Settings** (`/settings`, new) — grouped links: API Keys, (admin)
    Branch Access, the 3 external apps (shift/bd/complain), theme toggle,
    language toggle, account row + Sign out.

## Data flow

Unchanged. Server components fetch as today; the new/restyled client
components render the same props. Navigation between tabs is Next routing.
Chat home → `/chat/[id]` is a normal link; the conversation streams via the
existing `/api/chat` SSE.

## Error handling

- All existing error paths (auth gate, RLS, chat errors, blocked scope,
  token cap) are preserved — they live in the API/route layer, untouched.
- New routes (`/chat/[id]`, `/settings`) reuse the `(app)` layout's auth
  gate (redirect to `/` if not signed in, `/pending` if pending).
- A missing/invalid `/chat/[id]` → render an empty conversation (new chat).

## Testing

- `npm run build` clean after each phase.
- Existing Vitest suite (markdown, stream, tools, loop) stays green — the
  rebuild doesn't touch those modules.
- Manual per screen: renders in the phone column at mobile + desktop widths;
  bottom tabs navigate; theme + language toggles still flip everything;
  chat streams; dashboard shows real KPIs; pin/rename/delete still work.

## Phasing

1. **Shell** — `mobile-shell.jsx`, `tab-bar.jsx`, `mobile-ui.jsx`, retire
   sidebar in `(app)/layout.jsx`, add `/settings` screen. App still works.
2. **Login + Chat** — login restyle, Chat home (`/chat`), conversation
   (`/chat/[id]`), skill sheet.
3. **Dashboard** — dashboard restyle + date-range sheet.
4. **Admin + Access + API Keys** — restyle the three.

Each phase leaves the app building and usable.

## Out of scope

- Backend/API/RLS/auth changes.
- New data or analytics.
- Swipe gestures (the mockup's swipe-to-pin is shown as a static peek; pin
  stays a tap action).
- A native app / Capacitor wrapper — this is the responsive web app.
- The pending security-hardening sub-project (separate, still queued).
