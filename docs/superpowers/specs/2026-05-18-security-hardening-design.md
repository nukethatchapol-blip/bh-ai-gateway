# Security Hardening — Design Spec

_Date: 2026-05-18 · Sub-project A of post-review remediation_

## Goal

Close two security-critical findings from the review:

1. The legacy service-role JWT was briefly exposed in a public Vercel bundle
   (`app/page-67eac4276901b722.js`). Latest deploy is clean, but the key
   was public for some window and must be rotated.
2. Supabase Auth's Site URL + Redirect URL allow-list has never been
   configured — root cause of the magic-link failures and the deployed
   Vercel login error that recurred through this session.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Access mode | Hybrid — I do via the Supabase Management API what I can; user clicks dashboard for the rest |
| Rotation method | "Roll JWT secret" — regenerates anon + service-role; accepts that all current sessions invalidate |
| Vercel env update | User clicks, **or** provides a Vercel token and I update via API |
| Encryption-secret rotation | **No** — keep `API_KEY_ENC_SECRET` unchanged so stored BYO API keys still decrypt |

## Current state

- Supabase project: `gqotqcdfxrjcwbhcowmx`
- Site URL / Redirect URLs: never explicitly configured.
- Legacy service-role key: was visible in older Vercel build; latest chunk
  (`app/page-ceabde66bd9d233a.js`) is clean.
- `.env` (local) and `import.env` (gitignored) carry the current keys.
- Vercel env vars: hold the (now-leaked) keys; need updating with new ones.

## Architecture

Three independently-verifiable units.

### Unit 1 — Key rotation

**User:**
1. Supabase Dashboard → Settings → API → JWT Settings → **Roll JWT secret**.
2. Copy the **new anon** key and **new service-role** key. Paste them here.

**Me, given the new keys:**
3. Update `.env`: replace `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY`. Keep `API_KEY_ENC_SECRET` unchanged.
4. Update `import.env` to match (gitignored — verified by `git check-ignore`).
5. Restart the dev server so the new anon key is inlined.

**User (or me with a Vercel token):**
6. Vercel → Settings → Environment Variables: update
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
7. Trigger a redeploy so the new anon key is baked in to the client bundle.

### Unit 2 — Auth URL allow-list

**User:**
1. supabase.com/dashboard/account/tokens → Generate new token.
2. Paste it here.

**Me, with the token:**
3. `PATCH https://api.supabase.com/v1/projects/gqotqcdfxrjcwbhcowmx/config/auth`,
   Authorization: Bearer <token>, body:
   ```json
   {
     "site_url": "https://bh-ai-gateway.vercel.app",
     "uri_allow_list": "http://localhost:3000/**,https://bh-ai-gateway.vercel.app/**"
   }
   ```
4. `GET` the same endpoint to confirm the values stuck.

### Unit 3 — Verification

- Generate a fresh magic link via the Supabase admin API (with the **new
  service-role key**) → navigate the preview to it → confirm the session
  establishes and the app lands on `/chat`. This proves the allow-list works.
- Curl the deployed bundle (post-redeploy) → grep for the **old** service-role
  signature `zeLAzB4` → must be absent.
- Curl the deployed bundle → grep for the **new** anon-key signature →
  present (confirms the redeploy picked up the new value).

## Data flow

```
Supabase Dashboard ──roll──> new anon + new service-role
                                       │
user pastes keys ──────────────────────┤
                                       ├──> .env (local)
                                       ├──> import.env (gitignored)
                                       └──> Vercel env (user or my API)

Supabase Account ──gen──> access token
       │
user pastes token ──> me ──PATCH──> Supabase Management API ──> project auth config
```

## Error handling

| Failure | Recovery |
|---|---|
| User regenerates and misses copying new keys | Roll again; dashboard re-shows them. No data lost. |
| Old browsers cached old anon key in their JS bundle | Hard refresh after Vercel redeploys. Only one active user, low impact. |
| Management API `PATCH` returns 401 | Token wrong/expired — re-issue, retry. |
| Management API `PATCH` returns 403 | Token scoped wrong — fall back to Supabase dashboard for the two fields. |
| Magic link still fails after allow-list update | `GET` config to verify it really saved; check for trailing slash mismatches. |

## Out of scope

- Migration to the new `sb_publishable_/sb_secret_` key system (separate decision).
- Rotation of GitHub PATs you pasted earlier (user-side action).
- Vercel deployment process changes.
- The other three remediation sub-projects (invite flow, i18n, RLS).
