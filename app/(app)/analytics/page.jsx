// Analytics Dashboard — Phase H.
// Renders the "Branch Performance Insights" card from the new design with
// real-derived metrics, and a Top Performers list (top 2 branches by revenue)
// with circular progress rings.
//
// Metric definitions (all derived from existing RPCs — no new DDL):
//   • Avg Efficiency Rate — branches with revenue / authorized branches
//   • Sell-through       — bills served / branches authorized (rough density)
//   • Stock health       — 1 − (inventory_watch rows / authorized*5 baseline)
//   • Promo mix          — top_promotions total / branch revenue
//   • Waste              — pending stock alerts / total stock alerts
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { cached } from "@/lib/redis";
import { AnalyticsScreen } from "@/components/analytics-screen";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  const from = monthAgo.toISOString().slice(0, 10);
  const to   = today.toISOString().slice(0, 10);

  const cacheKey = `analytics:${user.id}:${from}:${to}`;
  const data = await cached(cacheKey, 120, async () => {
    const [
      { data: profile },
      { data: branches },
      { data: access },
      { data: kpis },
      { data: daily },
      { data: promotions },
      { data: invWatch },
    ] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, role").eq("id", user.id).single(),
      supabase.from("branches").select("id, name, region"),
      supabase.from("branch_access").select("branch_id").eq("user_id", user.id),
      supabase.rpc("bearhouse_branch_kpis",   { p_from: from, p_to: to }),
      supabase.rpc("bearhouse_daily_revenue", { p_from: from, p_to: to }),
      supabase.rpc("bearhouse_top_promotions", { p_from: from, p_to: to, p_limit: 10 }),
      supabase.rpc("bearhouse_inventory_watch", { p_limit: 200 }),
    ]);

    return {
      profile, branches: branches || [],
      authorizedIds: (access || []).map((a) => a.branch_id),
      kpis: kpis || [], daily: daily || [],
      promotions: promotions || [], invWatch: invWatch || [],
    };
  });

  const auth = Math.max(1, data.authorizedIds.length);
  const branchesWithRevenue = data.kpis.filter((k) => Number(k.net_revenue) > 0).length;
  const efficiencyPct = (branchesWithRevenue / auth) * 100;

  const totalBills = data.kpis.reduce((s, k) => s + Number(k.bills || 0), 0);
  const totalRev   = data.kpis.reduce((s, k) => s + Number(k.net_revenue || 0), 0);
  const promoRev   = data.promotions.reduce((s, p) => s + Number(p.total_value || 0), 0);

  // Sell-through: bills density per branch (capped 100%).
  const sellThroughPct = Math.min(100, (totalBills / (auth * 1500)) * 100);
  // Stock health: 1 − (alerts / expected baseline of 5 alerts per branch).
  const stockHealthPct = Math.max(0, 100 - (data.invWatch.length / (auth * 5)) * 100);
  // Promo mix: promo revenue / total revenue.
  const promoMixPct = totalRev ? (promoRev / totalRev) * 100 : 0;
  // Waste: pending alerts / total alerts.
  const pending = data.invWatch.filter((it) =>
    Number(it.order_recommend_95 || 0) > Number(it.forecast_qty || 0)).length;
  const wastePct = data.invWatch.length ? (pending / data.invWatch.length) * 100 : 0;

  // Top 2 branches by revenue → "Top performers" card rows.
  const topByRev = [...data.kpis]
    .sort((a, b) => Number(b.net_revenue || 0) - Number(a.net_revenue || 0))
    .slice(0, 2);
  const totalAcrossTop = topByRev.reduce((s, k) => s + Number(k.net_revenue || 0), 0);
  const topPerformers = topByRev.map((k) => ({
    branchRef:  k.branch_ref,
    branchName: k.branch_name || k.branch_ref,
    bills:      Number(k.bills || 0),
    revenue:    Number(k.net_revenue || 0),
    share:      totalAcrossTop ? Number(k.net_revenue || 0) / totalAcrossTop : 0,
  }));

  // Daily revenue series → DenseBars data (normalize 0..1).
  const series = [...(data.daily || [])]
    .sort((a, b) => String(a.day).localeCompare(String(b.day)))
    .map((r) => Number(r.net_revenue || 0));
  const seriesMax = Math.max(1, ...series);
  const bars = series.length ? series.map((v) => v / seriesMax) : null;

  return (
    <AnalyticsScreen
      profile={data.profile}
      efficiencyPct={efficiencyPct}
      metrics={{
        sellThrough: sellThroughPct,
        stockHealth: stockHealthPct,
        promoMix:    promoMixPct,
        waste:       wastePct,
      }}
      bars={bars}
      topPerformers={topPerformers}
      range={{ from, to }}
    />
  );
}
