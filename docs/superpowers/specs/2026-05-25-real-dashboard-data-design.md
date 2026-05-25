# Real Dashboard Data + Responsive Polish — Design

**Date:** 2026-05-25
**Status:** Approved (user: "เริ่มได้เลย")

## Goal
Replace every fabricated/synthetic value on the dashboard with real, date-filtered data from the production DB, remove placeholder values that have no real source, and polish the centered mobile column so it looks good on tablet/desktop (without building a separate desktop layout).

## Context
The dashboard's revenue total, bill count, and avg ticket already come from the real, date-scoped `bearhouse_branch_kpis` RPC (verified: different ranges → different totals). But several pieces are fake:
- Revenue line **chart** = random PRNG (not real daily sales), always "30 days".
- KPI **% deltas** ("+6.2%", "+3.1%", "-1.8%") = hardcoded.
- KPI **sparklines** = seeded PRNG.
- **"Inventory 92.4%"** = hardcoded.
- Per-branch **growth %** in the leaderboard = `0`.
- API Keys **"gateway credits $182/250"** = hardcoded placeholder.

### Data feasibility (verified against the live DB)
- `bill_detail_data` (≈4.5M rows): `payment_date`, `net_paid`, `store_name`, `void`, `cus_crm_member_id` → daily revenue / bills / member-tagged bills, scoped via `store_name = branch.branch_name`.
- **Inventory health is NOT feasible:** `inventory.threshold` and `target_stock` are all `0.0000000` (no reorder targets), and `goods_issue` is ≈17.5M rows (latest-stock-per-SKU query is too heavy for a live RPC). → The 4th KPI becomes **Member %** (real, cheap) instead of Inventory.
- Constraint: the gateway reads ERP data only through `SECURITY DEFINER` RPCs (run as `postgres`, which has `BYPASSRLS`). New data = new RPC. The Supabase MCP is read-only, so **new RPC SQL is delivered for the user to run** in the Supabase SQL Editor.

## Architecture

### A. New RPC (delivered as SQL for the user to run)
`bearhouse_daily_revenue(p_from date, p_to date)` → `(day date, net_revenue numeric, bills bigint, member_bills bigint)`, scoped by `authorized_branches()`, same join/filter pattern as `bearhouse_branch_kpis`.

```sql
create or replace function public.bearhouse_daily_revenue(
  p_from date default ((now() - interval '30 days'))::date,
  p_to   date default (now())::date
)
returns table(day date, net_revenue numeric, bills bigint, member_bills bigint)
language sql stable security definer set search_path to 'public'
as $$
  select
    b.payment_date::date as day,
    coalesce(sum(b.net_paid), 0) as net_revenue,
    count(*) as bills,
    count(*) filter (where coalesce(b.cus_crm_member_id, '') <> '') as member_bills
  from public.bill_detail_data b
  join public.branch br on br.branch_name = b.store_name
  where br.branch_ref in (select public.authorized_branches())
    and b.payment_date::date between p_from and p_to
    and coalesce(b.void, '') <> 'true'
  group by b.payment_date::date
  order by day;
$$;
revoke all on function public.bearhouse_daily_revenue(date, date) from public;
grant execute on function public.bearhouse_daily_revenue(date, date) to authenticated;
```

One RPC powers the real chart, all four KPI sparklines, the four KPI totals, and (called again for the prior window) the four KPI deltas.

### B. App-side (no DDL) — prior-period deltas
`app/(app)/dashboard/page.jsx` computes a prior window of equal length immediately preceding `[from, to]` and fetches data for both windows in parallel:
- `bearhouse_daily_revenue(from, to)` — current series + totals
- `bearhouse_daily_revenue(prevFrom, prevTo)` — prior totals (for the 4 KPI deltas)
- `bearhouse_branch_kpis(from, to)` — per-branch (leaderboard)
- `bearhouse_branch_kpis(prevFrom, prevTo)` — per-branch prior (leaderboard growth %)

All wrapped in one `Promise.all` (functions are co-located with the DB in `sin1`). Prior window: `prevTo = from - 1 day`, `prevFrom = prevTo - (to - from)`.

### C. Dashboard screen (`components/dashboard-screen.jsx`)
- **KPI cards (4, all real):** Revenue, Transactions, Avg ticket, **Member %** (= `member_bills / bills`). Each shows a real delta vs the prior window and a real sparkline from the daily series. Remove the Inventory card, the `spark()` PRNG, and all hardcoded delta strings.
- **Revenue chart:** plot the real daily `net_revenue` series for the selected range (use the actual day count, not a fixed 30).
- **Leaderboard:** real per-branch revenue (date-filtered) + real per-branch growth = `(cur - prior) / prior`.
- Delta sign/color derives from the real numbers; `prior = 0` → show "—" / "new" rather than divide-by-zero.

### D. Remove un-backed placeholder
`components/apikeys-screen.jsx`: remove the "gateway credits $182/250" summary block and its `GATEWAY_CREDIT_*` constants. Keep the real monthly spend (`sum(spend_usd)`).

### E. Responsive polish (keep the mobile column)
`app/globals.css`: at `min-width: 768px`, raise `.m-shell` `max-width` to ~600px and refine the `.m-shell-bg` backdrop (subtle treatment + the existing side borders/shadow) so the centered column looks intentional on tablet/desktop. CSS-only; no separate desktop layout. Verify KPI grid, chart, tap targets, and font sizes look right at 390 / 768 / 1280px.

## Error handling
- Empty range (no sales) → ฿0 / 0 bills / 0% (never fabricated).
- `prior = 0` → delta shows "—" (no division by zero).
- RPC returns null/empty array → treated as zero series; chart renders a flat baseline, no crash.

## Testing
- `npm run build` clean; `npx vitest run` (existing 22) still green.
- Cross-check dashboard totals against direct SQL for two ranges (e.g. Apr vs May 2026) — numbers must match the RPC.
- Manual: change the date range → chart shape + all KPI numbers + deltas change; pick a no-data range → zeros, not fakes.
- Responsive sweep at 390 / 768 / 1280px; theme + language toggles.

## Out of scope
- Token/quota real tracking (admin Quotas) — deferred per user.
- Real inventory health (no usable threshold data).
- Separate desktop/tablet layouts (multi-column / desktop sidebar).
- The pending RLS data-exposure fix (separate, already specced).

## Files touched
- **SQL migration** (user runs): `bearhouse_daily_revenue` RPC.
- `app/(app)/dashboard/page.jsx` — prior-window calc + parallel fetches.
- `components/dashboard-screen.jsx` — real KPIs/chart/sparklines/leaderboard.
- `components/apikeys-screen.jsx` — remove gateway-credits block.
- `app/globals.css` — responsive column polish.
- `lib/i18n.js` — keys for the Member % card label (+ any new copy).
