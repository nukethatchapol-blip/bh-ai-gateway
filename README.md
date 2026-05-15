# BEARHOUSE — AI Gateway

A unified gateway to frontier AI models for the BEARHOUSE bubble-tea chain (≈70 branches), grounded in branch data with row-level access that mirrors each user's store scope.

Built from the [Claude Design](https://claude.ai/design) handoff bundle — visuals match the prototype 1:1, ported to a real Next.js + Supabase app.

## Features

| # | Requirement | Where |
|---|-------------|-------|
| 1 | Login (Google + email/password registration) | [app/page.jsx](app/page.jsx), [components/login-screen.jsx](components/login-screen.jsx) |
| 2 | Admin console — approve / deny pending registrations | [app/(app)/admin/page.jsx](app/(app)/admin/page.jsx), [/api/admin/approve](app/api/admin/approve/route.js) |
| 3 | Chat with drag-drop files, model + skill selectors | [components/chat-screen.jsx](components/chat-screen.jsx), [/api/chat](app/api/chat/route.js) |
| 4 | BYO API key per user (encrypted at rest) | [components/apikeys-screen.jsx](components/apikeys-screen.jsx), [/api/apikeys](app/api/apikeys/route.js), [lib/crypto.js](lib/crypto.js) |
| 5 | Branch ACL — system config + RLS enforcement | [components/access-screen.jsx](components/access-screen.jsx), [/api/admin/access](app/api/admin/access/route.js), [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) |
| 6 | Dashboard scoped by authorized branches | [components/dashboard-screen.jsx](components/dashboard-screen.jsx) |

## Stack

- **Next.js 14** App Router (JS, server components for data + auth-gated layouts)
- **Supabase** for Auth (Google OAuth + email/password), Postgres, and **RLS** — the same policies enforce branch scope on chat queries, dashboards, and the dataset
- **AES-256-GCM** to encrypt user-supplied provider API keys at rest
- **OpenAI** + **Anthropic** wired in `lib/ai/route.js`; add more providers in the same shape
- Vanilla CSS with design tokens (light + dark, three densities) — no Tailwind

## Quick start

```bash
# 1. Install
npm install

# 2. Create Supabase project
#    https://supabase.com/dashboard → New project
#    Settings → API: copy URL + anon key + service_role key
#    Authentication → Providers → Google: enable, set redirect URI to
#      http://localhost:3000/auth/callback
#      (and your prod URL when you deploy)

# 3. Environment
cp .env.example .env
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#         SUPABASE_SERVICE_ROLE_KEY, and API_KEY_ENC_SECRET
# Generate API_KEY_ENC_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 4. Apply schema (uses Supabase CLI)
#    https://supabase.com/docs/guides/cli
supabase link --project-ref <your-ref>
supabase db push                # applies supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/seed.sql   # or run via the dashboard SQL editor

# 5. Seed the first admin (run in Supabase SQL editor after you sign up once)
#    update public.profiles set role='admin', status='active'
#      where email='you@bearhouse.co.th';

# 6. Run
npm run dev
```

## How branch ACL works (the important part)

1. `public.profiles` carries `role` and `status`. `pending` users get redirected to `/pending` until an admin approves.
2. `public.branch_access (user_id, branch_id)` holds the matrix. Admins implicitly see all branches.
3. `public.authorized_branches()` returns the set for `auth.uid()`. All branch-data tables (`sales`, `inventory`) have an RLS `SELECT` policy `branch_id in (select public.authorized_branches())` — so Supabase enforces scope **at the database**, not just in app code.
4. The chat route (`/api/chat`) double-checks: it rejects (a) a `branchScope` outside the user's set, and (b) messages mentioning unauthorized branch IDs (`BKK-###` etc). Both produce a "Blocked by row-level policy" reply.
5. The Access screen lets an admin grant/revoke the matrix; changes apply immediately via `branch_access` upserts.

## How BYO keys work

1. User submits their provider key in API Keys. POST `/api/apikeys` encrypts with AES-256-GCM and stores ciphertext only.
2. On chat: the gateway resolves the active key — user's BYO if present, otherwise the team-pool env var.
3. The plaintext key never leaves the server. Audit log records the request but not the key.
4. Encryption key (`API_KEY_ENC_SECRET`) is a 32-byte random value in env; rotating it requires re-saving keys.

## File map

```
app/
├── page.jsx                       # login (public)
├── pending/                       # waiting-for-approval (auth required)
├── auth/callback/                 # OAuth code exchange
├── (app)/                         # auth-gated layout (sidebar wrapper)
│   ├── chat/
│   ├── dashboard/
│   ├── apikeys/
│   ├── admin/                     # admin only
│   └── access/                    # admin only
└── api/
    ├── chat/                      # ACL-enforced chat proxy
    ├── auth/logout/
    ├── apikeys/                   # POST + DELETE
    └── admin/
        ├── approve/               # approve/deny new users
        └── access/                # bulk update branch_access

components/                        # all screens + shared UI
lib/
├── supabase/{client,server,middleware}.js
├── ai/route.js                    # model routing — OpenAI + Anthropic wired
├── crypto.js                      # AES-256-GCM for BYO keys
└── models.js                      # catalog of selectable models

supabase/
├── migrations/0001_init.sql       # schema + RLS + triggers
└── seed.sql                       # 20 branches + 2 skills
```

## Design system

Ported verbatim from the Claude Design bundle (`ai-gateway/project/index.html`):

- **Type:** Geist (sans) + Geist Mono — hairline 0.5px borders, tabular numerals
- **Palette:** warm cream `#faf7f1` + brown `#a96b2a` accent, light & dark
- **Density:** compact / regular / comfortable via `data-density` on `<html>`
- **Tokens:** see `app/globals.css` — all components reference CSS vars, no hard-coded colors

## What you'll want to do next

- Wire the remaining providers in `lib/ai/route.js` (Google, Mistral, Groq, OpenRouter)
- Add streaming responses (the SDK calls are non-streaming for now to keep the proxy simple)
- Pipe real branch data into `public.sales` / `public.inventory` — the dashboard currently renders deterministic synthetic numbers when those tables are empty
- Send approval-decision emails (Supabase has `auth.admin.inviteUserByEmail` for unified onboarding)
- Add skill management UI (the read-only viewer is wired; toggle the textarea to editable + add a `PATCH /api/admin/skills`)

## License

Internal — BEARHOUSE Co., Ltd.
