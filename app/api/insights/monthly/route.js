// Monthly insights API: returns 3-5 "What changed this month" cards for the
// Strategy panel. v1 derives insights from real KPIs (top dipper, top mover,
// best member-uplift) via two `bearhouse_branch_kpis` calls (cur + prior).
// Structured so a future v2 can call an LLM with the same payload and get
// natural-language narrative for the detail text.
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { cached } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  const from = url.searchParams.get("from") || monthAgo.toISOString().slice(0, 10);
  const to   = url.searchParams.get("to")   || today.toISOString().slice(0, 10);

  // Prior period of equal length.
  const fromMs = Date.parse(from), toMs = Date.parse(to);
  const lenMs = Math.max(0, toMs - fromMs);
  const prevTo   = new Date(fromMs - 86400000).toISOString().slice(0, 10);
  const prevFrom = new Date(fromMs - 86400000 - lenMs).toISOString().slice(0, 10);

  const key = `insights:${user.id}:${from}:${to}`;
  const insights = await cached(key, 300, async () => deriveInsights(from, to, prevFrom, prevTo));
  return Response.json({ items: insights, range: { from, to } });
}

async function deriveInsights(from, to, prevFrom, prevTo) {
  const supabase = await createClient();

  const [cur, prev] = await Promise.all([
    supabase.rpc("bearhouse_branch_kpis", { p_from: from,     p_to: to }),
    supabase.rpc("bearhouse_branch_kpis", { p_from: prevFrom, p_to: prevTo }),
  ]);

  const curByRef  = {};
  for (const r of cur.data || []) curByRef[r.branch_ref] = r;
  const prevByRef = {};
  for (const r of prev.data || []) prevByRef[r.branch_ref] = r;

  const movers = [];
  for (const ref of new Set([...Object.keys(curByRef), ...Object.keys(prevByRef)])) {
    const curRev = Number(curByRef[ref]?.net_revenue || 0);
    const prevRev = Number(prevByRef[ref]?.net_revenue || 0);
    if (prevRev <= 0) continue; // skip new branches
    const delta = curRev - prevRev;
    const pct = (delta / prevRev) * 100;
    movers.push({
      ref,
      name: curByRef[ref]?.branch_name || prevByRef[ref]?.branch_name || ref,
      curRev, prevRev, delta, pct,
    });
  }

  const items = [];

  // 1) Worst dipper (alert) — any branch down > 5%.
  const dippers = movers.filter((m) => m.pct < -5).sort((a, b) => a.pct - b.pct);
  if (dippers.length) {
    const d = dippers[0];
    items.push({
      kind: "alert",
      title: `${d.name} revenue fell ${d.pct.toFixed(1)}% MoM`,
      branch: d.ref,
      detail: `Revenue at ${d.name} dropped from ฿${Math.round(d.prevRev).toLocaleString()} to ฿${Math.round(d.curRev).toLocaleString()} between ${prevFrom}–${prevTo} and ${from}–${to}. Investigate stock-outs, staffing, or local competition.`,
      action: "Draft restock plan",
      metric: `${d.pct.toFixed(1)}%`,
      metricNeg: true,
    });
  }

  // 2) Best mover (opportunity) — biggest % gainer.
  const winners = movers.filter((m) => m.pct > 5).sort((a, b) => b.pct - a.pct);
  if (winners.length) {
    const w = winners[0];
    items.push({
      kind: "opportunity",
      title: `${w.name} is up ${w.pct.toFixed(1)}% — double down`,
      branch: w.ref,
      detail: `Revenue at ${w.name} climbed from ฿${Math.round(w.prevRev).toLocaleString()} to ฿${Math.round(w.curRev).toLocaleString()}. Look at what changed (promo, staffing, product mix) and see if it transfers to similar branches.`,
      action: "Simulate promo",
      metric: `+${w.pct.toFixed(1)}%`,
      metricNeg: false,
    });
  }

  // 3) Biggest absolute revenue gainer (different lens — value, not %).
  const bigGain = [...movers].sort((a, b) => b.delta - a.delta)[0];
  if (bigGain && bigGain.delta > 0 && (!winners.length || bigGain.ref !== winners[0].ref)) {
    items.push({
      kind: "opportunity",
      title: `${bigGain.name} added ฿${Math.round(bigGain.delta / 1000)}K this period`,
      branch: bigGain.ref,
      detail: `Largest absolute revenue lift across your scope. Worth understanding the driver — repeatable wins compound.`,
      action: "Schedule promo",
      metric: `+฿${Math.round(bigGain.delta / 1000)}K`,
      metricNeg: false,
    });
  }

  // Fallback if no data — show a no-data hint instead of an empty panel.
  if (items.length === 0) {
    items.push({
      kind: "opportunity",
      title: "Not enough data yet for a comparison",
      branch: "ALL",
      detail: "Pick a wider date range, or wait until you have at least one full prior period. The analyst surfaces alerts once it sees branch-level changes.",
      action: "Open dashboard",
      metric: "—",
      metricNeg: false,
    });
  }

  return items;
}
