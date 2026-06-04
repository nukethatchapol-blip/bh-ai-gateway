import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { cached } from "@/lib/redis";
import { DashboardScreen } from "@/components/dashboard-screen";

function safeDate(s, fallback) {
  if (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return fallback;
}

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
  const user = await getCurrentUser(); // cached across layout+page

  // The bulk of the page is 10 parallel queries scoped to this user's
  // branch_access and the chosen window. Cache the whole blob in Redis
  // by (user, from, to) for 60s — revisits in that window are instant.
  // The cache is per-user so branch ACL changes within the TTL are visible
  // after at most 60s. If Redis is unreachable, `cached()` falls through
  // and computes live.
  const cacheKey = `dash:${user.id}:${from}:${to}`;
  const data = await cached(cacheKey, 60, async () => {
    const [
      { data: profile }, { data: branches }, { data: access },
      { data: kpis }, { data: kpisPrior },
      { data: daily }, { data: dailyPrior },
      { data: promotions }, { data: products }, { data: invWatch },
    ] = await Promise.all([
      supabase.from("profiles").select("id, role").eq("id", user.id).single(),
      supabase.from("branches").select("*").order("name"),
      supabase.from("branch_access").select("branch_id").eq("user_id", user.id),
      supabase.rpc("bearhouse_branch_kpis",  { p_from: from,     p_to: to }),
      supabase.rpc("bearhouse_branch_kpis",  { p_from: prevFrom, p_to: prevTo }),
      supabase.rpc("bearhouse_daily_revenue", { p_from: from,     p_to: to }),
      supabase.rpc("bearhouse_daily_revenue", { p_from: prevFrom, p_to: prevTo }),
      supabase.rpc("bearhouse_top_promotions", { p_from: from, p_to: to, p_limit: 6 }),
      supabase.rpc("bearhouse_top_products",   { p_from: from, p_to: to, p_limit: 6 }),
      supabase.rpc("bearhouse_inventory_watch", { p_limit: 6 }),
    ]);
    return {
      profile,
      branches: branches || [],
      access: access || [],
      kpis: kpis || [],
      kpisPrior: kpisPrior || [],
      daily: daily || [],
      dailyPrior: dailyPrior || [],
      promotions: promotions || [],
      products: products || [],
      invWatch: invWatch || [],
    };
  });

  const authorizedIds = (data.access || []).map((a) => a.branch_id);

  return (
    <DashboardScreen
      profile={data.profile}
      branches={data.branches}
      authorizedIds={authorizedIds}
      kpis={data.kpis}
      kpisPrior={data.kpisPrior}
      daily={data.daily}
      dailyPrior={data.dailyPrior}
      promotions={data.promotions}
      products={data.products}
      invWatch={data.invWatch}
      from={from}
      to={to}
    />
  );
}
