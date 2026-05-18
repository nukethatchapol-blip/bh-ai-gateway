# Sidebar App Launcher — Design Spec

_Date: 2026-05-18 · Project: BEARHOUSE AI Gateway_

## Goal

Add a sidebar "Apps" group with three buttons that redirect to external
BEARHOUSE applications, and a light polish of the sidebar — without
departing from the existing cream/brown BEARHOUSE design language.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Redesign scope | Add buttons + polish pass — keep the BEARHOUSE design, no overhaul |
| Placement | New "Apps" group in the sidebar (no launcher-grid page) |
| URLs | All three default to `https://www.google.co.th` (mockup), env-var configurable |
| Link target | New tab (`target="_blank"`) — external apps, gateway session preserved |

## Current state

- `components/shell.jsx` — the `Sidebar` client component. A `NAV` array
  renders the internal routes (Chat, Dashboard, API Keys, Admin, Access)
  under a "Workspace" eyebrow, followed by "Recents", then the footer.
- Nav labels are i18n via `useLang()` → `t(item.labelKey)`.
- `components/ui.jsx` — `ICONS` map + `Icon` component (stroke-based, 16px viewbox).
- `lib/i18n.js` — flat `STRINGS` dictionary, EN + TH.
- Design tokens in `app/globals.css` (cream/brown, Geist) — unchanged by this work.

## Architecture

A small, self-contained addition. No new routes, no backend, no database.

### 1. App registry — `lib/apps.js` (new)

Exports the external-app list. Each URL reads from a `NEXT_PUBLIC_*` env var
with the mockup URL as the fallback:

```js
export const EXTERNAL_APPS = [
  { id: "shift",     labelKey: "apps.shift",     icon: "clock",
    url: process.env.NEXT_PUBLIC_APP_SHIFT_URL    || "https://www.google.co.th" },
  { id: "bdticket",  labelKey: "apps.bdticket",  icon: "ticket",
    url: process.env.NEXT_PUBLIC_APP_BDTICKET_URL || "https://www.google.co.th" },
  { id: "complain",  labelKey: "apps.complain",  icon: "flag",
    url: process.env.NEXT_PUBLIC_APP_COMPLAIN_URL || "https://www.google.co.th" },
];
```

`NEXT_PUBLIC_*` so the values are available in the client `Sidebar` component.

### 2. Sidebar "Apps" group — `components/shell.jsx` (modified)

Rendered between the Workspace nav group and the Recents block:
- Group eyebrow: `t("apps.group")`
- One row per `EXTERNAL_APPS` entry, each an external anchor:
  `<a href={app.url} target="_blank" rel="noopener noreferrer">`
- Row layout mirrors the existing nav rows (icon · label) for visual
  consistency, **plus** a trailing muted external-link arrow (the existing
  `ext` icon) — the affordance distinguishing external apps from internal nav.
- Collapsed sidebar: icon-only, identical behaviour to the `NAV` rows.
- Hover treatment: same `var(--hover)` background as nav rows.
- Clicking does **not** close the mobile drawer via router events (it's an
  external nav) — but the drawer's `close()` is still called so the UI tidies
  up after the new tab opens.

### 3. Icons — `components/ui.jsx` (modified)

Three new entries in `ICONS`, stroke-based, 16px viewbox, matching the set:
- `clock` — shift management
- `ticket` — bd ticket
- `flag` — complain case

### 4. i18n — `lib/i18n.js` (modified)

New keys, EN + TH:
- `apps.group` — "Apps" / "แอป"
- `apps.shift` — "Shift Management" / "จัดการกะ"
- `apps.bdticket` — "BD Ticket" / "ใบงาน BD"
- `apps.complain` — "Complain Case" / "เคสร้องเรียน"

### 5. Env — `.env.example` (modified)

Document the three optional vars:
```
NEXT_PUBLIC_APP_SHIFT_URL=
NEXT_PUBLIC_APP_BDTICKET_URL=
NEXT_PUBLIC_APP_COMPLAIN_URL=
```

## Polish pass

Scoped to the sidebar where the new group lands:
- The Apps group uses the same eyebrow + row rhythm as the Workspace group,
  so the sidebar reads as two clean sections (internal nav · external apps)
  then Recents.
- Consistent vertical spacing between the three groups.
- No changes to design tokens, palette, type, or any other screen.

## Error handling

- Missing env var → falls back to `https://www.google.co.th` (the mockup).
  No error state; an external link always has a destination.
- `rel="noopener noreferrer"` on every external anchor — prevents the opened
  tab from accessing `window.opener`.

## Testing

- **Build:** `npm run build` compiles clean.
- **Manual:** the three rows appear under an "Apps" eyebrow; each opens
  `https://www.google.co.th` in a new tab; collapsed sidebar shows icons
  only; the language toggle switches the labels (EN ↔ TH).
- No unit tests — there is no logic beyond static rendering and env-var
  fallback.

## Out of scope

- A launcher-grid page or dashboard tiles.
- Per-app role/permission gating.
- Deep-linking with query params or SSO hand-off to the external apps.
- Any change to design tokens or screens other than the sidebar.
