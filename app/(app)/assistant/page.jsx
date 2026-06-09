// Smart AI Assistant — Phase N.
// Reproduces the design's "02 · Smart AI Assistant" frame: a Nova AI chat
// card showing a single Q+A pair derived from REAL monthly insights data
// (top dipper / best mover / biggest gainer from /api/insights/monthly).
// The user message references an attached file (the latest dashboard
// scope) and the AI message displays revenue deviations as the design's
// dot list + tri-color range bar.
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { cached } from "@/lib/redis";
import { AssistantScreen } from "@/components/assistant-screen";

export default async function AssistantPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  const from = monthAgo.toISOString().slice(0, 10);
  const to   = today.toISOString().slice(0, 10);

  const cacheKey = `assistant:${user.id}:${from}:${to}:v4`;
  const data = await cached(cacheKey, 300, async () => {
    const fromMs = Date.parse(from), toMs = Date.parse(to);
    const lenMs = Math.max(0, toMs - fromMs);
    const prevTo   = new Date(fromMs - 86400000).toISOString().slice(0, 10);
    const prevFrom = new Date(fromMs - 86400000 - lenMs).toISOString().slice(0, 10);

    const [{ data: profile }, cur, prev, { data: branches }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("id", user.id).single(),
      supabase.rpc("bearhouse_branch_kpis", { p_from: from,     p_to: to }),
      supabase.rpc("bearhouse_branch_kpis", { p_from: prevFrom, p_to: prevTo }),
      // Fallback source — if KPI RPC has no rows, exec summary uses branch
      // table directly to at least surface a hero name + driver list.
      supabase.from("branches").select("id, name, region").order("name").limit(20),
    ]);

    const curByRef = {}; for (const r of cur.data || []) curByRef[r.branch_ref] = r;
    const prevByRef = {}; for (const r of prev.data || []) prevByRef[r.branch_ref] = r;

    // Compute revenue deviations for the top 3 movers — feeds the dot list.
    const movers = [];
    for (const ref of new Set([...Object.keys(curByRef), ...Object.keys(prevByRef)])) {
      const curRev = Number(curByRef[ref]?.net_revenue || 0);
      const prevRev = Number(prevByRef[ref]?.net_revenue || 0);
      if (prevRev <= 0) continue;
      movers.push({
        branchRef: ref,
        branchName: curByRef[ref]?.branch_name || ref,
        delta: curRev - prevRev,
        pct: ((curRev - prevRev) / prevRev) * 100,
      });
    }
    const topDeviations = [...movers]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);

    // Tri-color range bar — share of positive vs negative vs neutral movers.
    const totalMovers = Math.max(1, movers.length);
    const positiveCount = movers.filter((m) => m.pct >  5).length;
    const negativeCount = movers.filter((m) => m.pct < -5).length;
    const neutralCount  = totalMovers - positiveCount - negativeCount;

    // Hero — the single biggest mover (positive OR negative) becomes the
    // exec summary's headline. Its current revenue is the metric.
    let hero = topDeviations[0] ? {
      branchRef:  topDeviations[0].branchRef,
      branchName: topDeviations[0].branchName,
      curRev:     Number(curByRef[topDeviations[0].branchRef]?.net_revenue || 0),
      bills:      Number(curByRef[topDeviations[0].branchRef]?.bills || 0),
      delta:      topDeviations[0].delta,
      pct:        topDeviations[0].pct,
      up:         topDeviations[0].pct >= 0,
    } : null;
    // Fallback chain — KPI RPC → top revenue branch (curRev) → branches table.
    let extraDriversForFallback = [];
    if (!hero) {
      // First try: any branch in cur.data (even with zero revenue).
      const topKpi = [...(cur.data || [])]
        .sort((a, b) => Number(b.net_revenue || 0) - Number(a.net_revenue || 0))
        .slice(0, 4);
      if (topKpi.length) {
        hero = {
          branchRef:  topKpi[0].branch_ref,
          branchName: topKpi[0].branch_name || topKpi[0].branch_ref,
          curRev:     Number(topKpi[0].net_revenue || 0),
          bills:      Number(topKpi[0].bills || 0),
          delta:      0, pct: 0, up: true,
        };
        extraDriversForFallback = topKpi.slice(1).map((r) => ({
          branchRef:  r.branch_ref,
          branchName: r.branch_name || r.branch_ref,
          delta: 0, pct: 0,
        }));
      }
      // Last resort — branches table (always populated). Lets the card render
      // even when no transaction data has streamed in yet.
      if (!hero && branches?.length) {
        hero = {
          branchRef:  branches[0].id,
          branchName: branches[0].name || branches[0].id,
          curRev: 0, bills: 0,
          delta: 0, pct: 0, up: true,
        };
        extraDriversForFallback = branches.slice(1, 4).map((b) => ({
          branchRef:  b.id,
          branchName: b.name || b.id,
          delta: 0, pct: 0,
        }));
      }
    }

    return {
      profile, from, to,
      // When we fell back to top-revenue, expose those as drivers so the
      // "What moved it" rail still shows neighbour context.
      topDeviations: topDeviations.length ? topDeviations : extraDriversForFallback,
      hero,
      ranges: {
        positive: (positiveCount / totalMovers) * 100,
        negative: (negativeCount / totalMovers) * 100,
        neutral:  (neutralCount  / totalMovers) * 100,
      },
    };
  });

  return (
    <AssistantScreen
      profile={data.profile}
      from={data.from}
      to={data.to}
      topDeviations={data.topDeviations}
      ranges={data.ranges}
      hero={data.hero}
    />
  );
}
