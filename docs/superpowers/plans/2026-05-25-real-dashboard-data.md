# Real Dashboard Data + Responsive Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every fabricated value on the dashboard with real, date-filtered data; remove the un-backed API-keys "gateway credits" placeholder; and polish the centered mobile column for tablet/desktop.

**Architecture:** One new `SECURITY DEFINER` RPC (`bearhouse_daily_revenue`) returns a daily series scoped by `authorized_branches()`. `dashboard/page.jsx` fetches the current + prior window (for real deltas) in parallel. `dashboard-screen.jsx` renders real KPIs (incl. **Member %** replacing the un-computable Inventory), a real revenue chart, real sparklines, and real per-branch growth. CSS-only responsive widening at ≥768px.

**Tech Stack:** Next.js 14 App Router (JS), Supabase Postgres (SECURITY DEFINER RPCs), React client components.

Spec: `docs/superpowers/specs/2026-05-25-real-dashboard-data-design.md`

**No new unit tests** (UI/data rebuild). Verification = `npm run build` + `npx vitest run` (existing 22 stay green) + SQL cross-check + manual. Do NOT run `npm run dev`. The new RPC is **DDL the user runs** (MCP is read-only) — Task 1 only writes the SQL file; the app degrades gracefully (zeros) until it's applied.

---

## Token/data notes
- Real source table: `bill_detail_data` — `payment_date`, `net_paid`, `store_name`, `void`, `cus_crm_member_id`. Join to branch via `branch.branch_name = bill_detail_data.store_name`, scope via `authorized_branches()`.
- Existing RPC `bearhouse_branch_kpis(p_from, p_to)` returns per-branch `(branch_ref, branch_name, bills, net_revenue, avg_ticket)` — reused for the leaderboard (current + prior).
- `branch_access.branch_id == branch.branch_ref`; `branches` view exposes `id` (=branch_ref), `name`, `region`.

---

## File Structure
- **Create:** `supabase/migrations/0003_daily_revenue_rpc.sql` (delivered for the user to run)
- **Modify:** `app/(app)/dashboard/page.jsx` (prior-window + parallel fetches)
- **Modify:** `components/dashboard-screen.jsx` (real KPIs/chart/sparklines/leaderboard)
- **Modify:** `components/apikeys-screen.jsx` (remove gateway-credits block)
- **Modify:** `app/globals.css` (responsive column widening)
- **Modify:** `lib/i18n.js` (Member % card keys)

---

### Task 1: New RPC SQL (user runs in Supabase)

**Files:** Create `supabase/migrations/0003_daily_revenue_rpc.sql`

- [ ] **Step 1:** Create `supabase/migrations/0003_daily_revenue_rpc.sql` with exactly:

```sql
-- Daily revenue series for the dashboard, scoped to the caller's branches.
-- Mirrors bearhouse_branch_kpis: SECURITY DEFINER (runs as postgres/BYPASSRLS),
-- search_path locked, EXECUTE granted only to authenticated.
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

- [ ] **Step 2:** Do NOT attempt to apply it (MCP is read-only). Commit:
```bash
git add supabase/migrations/0003_daily_revenue_rpc.sql
git commit -m "feat: bearhouse_daily_revenue RPC (daily series for dashboard)"
```

---

### Task 2: Dashboard page — prior window + parallel fetches

**Files:** Modify `app/(app)/dashboard/page.jsx`

- [ ] **Step 1:** Replace the body of `DashboardPage` (keep the `safeDate` helper + imports) so it computes the prior window and fetches current+prior in parallel. The function becomes:

```jsx
export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const from = safeDate(params?.from, monthAgo.toISOString().slice(0, 10));
  const to   = safeDate(params?.to,   today.toISOString().slice(0, 10));

  // Prior window: same length, immediately preceding [from, to].
  const fromMs = Date.parse(from), toMs = Date.parse(to);
  const lenMs  = Math.max(0, toMs - fromMs);
  const prevTo   = new Date(fromMs - 86400000).toISOString().slice(0, 10);
  const prevFrom = new Date(fromMs - 86400000 - lenMs).toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Independent — one round trip (functions co-located with the DB in sin1).
  const [
    { data: profile }, { data: branches }, { data: access },
    { data: kpis }, { data: kpisPrior },
    { data: daily }, { data: dailyPrior },
  ] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase.from("branches").select("*").order("name"),
    supabase.from("branch_access").select("branch_id").eq("user_id", user.id),
    supabase.rpc("bearhouse_branch_kpis",  { p_from: from,     p_to: to }),
    supabase.rpc("bearhouse_branch_kpis",  { p_from: prevFrom, p_to: prevTo }),
    supabase.rpc("bearhouse_daily_revenue", { p_from: from,     p_to: to }),
    supabase.rpc("bearhouse_daily_revenue", { p_from: prevFrom, p_to: prevTo }),
  ]);
  const authorizedIds = (access || []).map((a) => a.branch_id);

  return (
    <DashboardScreen
      profile={profile}
      branches={branches || []}
      authorizedIds={authorizedIds}
      kpis={kpis || []}
      kpisPrior={kpisPrior || []}
      daily={daily || []}
      dailyPrior={dailyPrior || []}
      from={from}
      to={to}
    />
  );
}
```

- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`. (RPC may not exist in the DB yet → `daily` comes back null → handled as `[]`; page still renders.)
- [ ] **Step 3:** Commit:
```bash
git add "app/(app)/dashboard/page.jsx"
git commit -m "feat: dashboard fetches daily series + prior window for real deltas"
```

---

### Task 3: Dashboard screen — real KPIs, chart, sparklines, leaderboard

**Files:** Modify `components/dashboard-screen.jsx`; `lib/i18n.js`

- [ ] **Step 1:** In `lib/i18n.js`, after the `"dash.kpi.inventory"` line add:
```js
  "dash.kpi.members":        { en: "Member %",            th: "% สมาชิก" },
  "dash.kpi.members.sub":    { en: "bills with a member", th: "บิลที่มีสมาชิก" },
  "dash.deltaNew":           { en: "new",                 th: "ใหม่" },
```

- [ ] **Step 2:** In `components/dashboard-screen.jsx`, **delete** the `spark()` PRNG helper (the whole `function spark(...) { ... }` block near the top).

- [ ] **Step 3:** Add these pure helpers near the top of the file (after the imports, before `fmtRange`):
```jsx
function sumDaily(rows) {
  let rev = 0, bills = 0, member = 0;
  for (const r of rows || []) {
    rev += Number(r.net_revenue || 0);
    bills += Number(r.bills || 0);
    member += Number(r.member_bills || 0);
  }
  return { rev, bills, member, aov: bills ? rev / bills : 0, memberPct: bills ? (member / bills) * 100 : 0 };
}
function pctDelta(cur, prev) {
  if (!prev) return null; // no prior baseline → caller shows "new"
  return ((cur - prev) / prev) * 100;
}
function fmtDelta(d, t) {
  if (d === null || !isFinite(d)) return { text: t("dash.deltaNew"), neg: false };
  return { text: `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`, neg: d < 0 };
}
```

- [ ] **Step 4:** Change the component signature + computations. Replace:
```jsx
export function DashboardScreen({ profile, branches, authorizedIds, kpis = [], from, to }) {
```
with:
```jsx
export function DashboardScreen({ profile, branches, authorizedIds, kpis = [], kpisPrior = [], daily = [], dailyPrior = [], from, to }) {
```

- [ ] **Step 5:** Replace the `stats` useMemo (the block that maps `visible` to sales/customers/growth) with a version that adds real per-branch growth from the prior window:
```jsx
  const kpiPriorByRef = useMemo(() => {
    const m = {};
    kpisPrior.forEach((k) => { m[k.branch_ref] = k; });
    return m;
  }, [kpisPrior]);

  const stats = useMemo(() => visible.map((b) => {
    const real = kpiByRef[b.id];
    const sales = Number(real?.net_revenue || 0);
    const priorSales = Number(kpiPriorByRef[b.id]?.net_revenue || 0);
    return {
      ...b,
      sales,
      customers: Number(real?.bills || 0),
      growth: pctDelta(sales, priorSales) ?? 0,
    };
  }), [visible, kpiByRef, kpiPriorByRef]);
```

- [ ] **Step 6:** Replace the `totals` useMemo with real totals derived from the daily series (current + prior), and build the daily arrays for the chart/sparklines:
```jsx
  const cur = useMemo(() => sumDaily(daily), [daily]);
  const prev = useMemo(() => sumDaily(dailyPrior), [dailyPrior]);

  // Daily arrays for the chart + sparklines (chronological).
  const series = useMemo(() => {
    const rows = [...(daily || [])].sort((a, b) => String(a.day).localeCompare(String(b.day)));
    return {
      revenue: rows.map((r) => Number(r.net_revenue || 0)),
      bills:   rows.map((r) => Number(r.bills || 0)),
      aov:     rows.map((r) => (Number(r.bills) ? Number(r.net_revenue) / Number(r.bills) : 0)),
      member:  rows.map((r) => (Number(r.bills) ? (Number(r.member_bills) / Number(r.bills)) * 100 : 0)),
    };
  }, [daily]);

  const totals = { sales: cur.rev, customers: cur.bills, aov: cur.aov, memberPct: cur.memberPct };
```
(Delete the old `totals` useMemo that summed `stats`.)

- [ ] **Step 7:** Replace the `kpiCards` array with real values + real deltas + real sparklines:
```jsx
  const dRevenue = fmtDelta(pctDelta(cur.rev, prev.rev), t);
  const dBills   = fmtDelta(pctDelta(cur.bills, prev.bills), t);
  const dAov     = fmtDelta(pctDelta(cur.aov, prev.aov), t);
  const dMember  = fmtDelta(pctDelta(cur.memberPct, prev.memberPct), t);

  const kpiCards = [
    { label: t("dash.kpi.revenue"),  value: `฿${(totals.sales / 1000).toFixed(0)}K`, delta: dRevenue.text, neg: dRevenue.neg, data: series.revenue },
    { label: t("dash.kpi.customers"), value: totals.customers.toLocaleString(),       delta: dBills.text,   neg: dBills.neg,   data: series.bills },
    { label: t("dash.kpi.avgticket"), value: `฿${totals.aov.toFixed(0)}`,             delta: dAov.text,     neg: dAov.neg,     data: series.aov },
    { label: t("dash.kpi.members"),   value: `${totals.memberPct.toFixed(1)}%`,       delta: dMember.text,  neg: dMember.neg,  data: series.member },
  ];
```

- [ ] **Step 8:** Update `RevenueChart` to plot the real series. Change the `<RevenueChart .../>` usage to pass the data:
```jsx
        <RevenueChart range={rangeLabel} data={series.revenue} growth={pctDelta(cur.rev, prev.rev) ?? 0} branchCount={visible.length} />
```
and replace the `RevenueChart` function's data generation. Replace its signature + the `data`/`max` derivation:
```jsx
function RevenueChart({ range, data = [], growth, branchCount }) {
  const { t } = useLang();
  const pts = data.length ? data : [0, 0];
  const max = Math.max(...pts, 1);
  const ptsMain = pts.map((v, i) => [(i / Math.max(1, pts.length - 1)) * 320, 100 - (v / max) * 90]);
```
Then update the header sub-line + keep the existing `<svg>` block, but change `pathMain`/`areaMain` to use `ptsMain` (already defined) and the sub-line to:
```jsx
          <div style={{ font: "400 11.5px/1 var(--font-sans)", color: "var(--muted)", marginTop: 4 }}>
            {t("dash.revenue.sub", { n: branchCount, s: branchCount === 1 ? "" : "es", range })}
          </div>
```
(Delete the old `const days = 30; const data = useMemo(...PRNG...); const max = ...` lines — `data` is now a prop.)

- [ ] **Step 9:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 10:** Commit:
```bash
git add components/dashboard-screen.jsx lib/i18n.js
git commit -m "feat: real dashboard KPIs, chart, sparklines, branch growth"
```

---

### Task 4: API Keys — remove un-backed gateway credits

**Files:** Modify `components/apikeys-screen.jsx`

- [ ] **Step 1:** Delete the constants (lines ~12-14):
```jsx
// Static gateway-credit chrome (no real per-user gateway credit ledger exists yet).
const GATEWAY_CREDIT_USED = 182;
const GATEWAY_CREDIT_CAP = 250;
```
and delete the `const creditPct = ...` line inside the component.

- [ ] **Step 2:** Replace the summary `GroupCard` (the `{/* summary card */}` block) with a single-column real-spend summary:
```jsx
      {/* summary card — real monthly spend only */}
      <GroupCard style={{ margin: "0 16px 14px", padding: 14 }}>
        <div className="mono" style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>
          {t("apikeys.monthlySpend")}
        </div>
        <div className="tnum" style={{ font: "600 24px/1 var(--font-sans)", marginTop: 8, letterSpacing: "-0.01em" }}>${monthlySpend.toFixed(2)}</div>
        <div style={{ font: "400 11.5px/1.3 var(--font-sans)", color: "var(--muted)", marginTop: 5 }}>
          {t("apikeys.keysConfigured", { n: configured })}
        </div>
      </GroupCard>
```

- [ ] **Step 3:** Run `npm run build` — expect `✓ Compiled successfully`. Confirm `apikeys.gatewayCredits` is no longer referenced (grep `gatewayCredits` in the file → no match; leaving the unused i18n key is fine).
- [ ] **Step 4:** Commit:
```bash
git add components/apikeys-screen.jsx
git commit -m "feat: remove unbacked gateway-credits placeholder from API keys"
```

---

### Task 5: Responsive polish (keep mobile column)

**Files:** Modify `app/globals.css`

- [ ] **Step 1:** In the `/* ---------- mobile-first shell ---------- */` section, after the `.m-shell-bg { ... }` rule, append:
```css
/* Tablet/desktop: widen the centered column a little and frame it so the
   surrounding space looks intentional. Still a single mobile-first column. */
@media (min-width: 768px) {
  .m-shell { max-width: 600px; box-shadow: 0 0 0 1px var(--line), 0 24px 60px rgba(0,0,0,.10); }
  .m-shell-bg {
    background:
      radial-gradient(1200px 600px at 50% -10%, var(--accent-soft) 0%, transparent 60%),
      var(--bg-2);
  }
}
```

- [ ] **Step 2:** Run `npm run build` — expect `✓ Compiled successfully`.
- [ ] **Step 3:** Commit:
```bash
git add app/globals.css
git commit -m "feat: polish centered column on tablet/desktop"
```

---

## Verification (whole feature)
- [ ] `npm run build` clean; `npx vitest run` → existing 22 still pass.
- [ ] After the user runs `0003_daily_revenue_rpc.sql`: dashboard revenue total matches a direct SQL `sum(net_paid)` for the same range; changing the range changes the chart shape + all four KPI values + their deltas; a no-data range shows zeros (no fakes).
- [ ] KPI card 4 reads **Member %** (not Inventory); deltas are real (or "new" when no prior data).
- [ ] API Keys shows only real monthly spend (no $182/250).
- [ ] Column looks right and centered with a framed backdrop at 390 / 768 / 1280px; theme + language toggles work.
