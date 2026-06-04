// Activity Overview — surfaces what the gateway has automated for this user
// over the last 30 days. Numbers are derived from real data:
//   • Hours saved   ← audit_log events × ~3 min/event (conservative)
//   • Sales synced  ← branches with positive revenue / authorized branches
//   • Stock alerts  ← inventory_watch row count (re-order recommendations)
//   • Connected     ← authorized branch count out of total
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { cached } from "@/lib/redis";
import { ActivityScreen } from "@/components/activity-screen";

const MINUTES_PER_EVENT = 3; // conservative — a chat or ack save ≈ 3 min manual work

export default async function ActivityPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const cacheKey = `activity:${user.id}`;
  const data = await cached(cacheKey, 60, async () => {
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 86400000);
    const from = monthAgo.toISOString().slice(0, 10);
    const to   = today.toISOString().slice(0, 10);

    const [
      { data: profile },
      { data: branches },
      { data: access },
      { data: kpis },
      { data: invWatch },
      { count: events },
    ] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, role").eq("id", user.id).single(),
      supabase.from("branches").select("id, name, region"),
      supabase.from("branch_access").select("branch_id").eq("user_id", user.id),
      supabase.rpc("bearhouse_branch_kpis", { p_from: from, p_to: to }),
      supabase.rpc("bearhouse_inventory_watch", { p_limit: 100 }),
      supabase.from("audit_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", from + "T00:00:00Z"),
    ]);

    return {
      profile,
      branches: branches || [],
      authorizedIds: (access || []).map((a) => a.branch_id),
      kpis: kpis || [],
      stockAlerts: (invWatch || []).length,
      events: events || 0,
      from, to,
    };
  });

  // Sales synced = branches with real revenue rows / authorized branches.
  const branchesWithSales = (data.kpis || []).filter((k) => Number(k.net_revenue) > 0).length;
  const denom = Math.max(1, data.authorizedIds.length);
  const salesSyncedPct = Math.min(100, (branchesWithSales / denom) * 100);

  // Hours saved = events × MINUTES_PER_EVENT / 60. Rounded to 1 dp.
  const hoursSaved = Math.round((data.events * MINUTES_PER_EVENT) / 6) / 10;

  return (
    <ActivityScreen
      profile={data.profile}
      branches={data.branches}
      authorizedIds={data.authorizedIds}
      hoursSaved={hoursSaved}
      events={data.events}
      salesSyncedPct={salesSyncedPct}
      branchesWithSales={branchesWithSales}
      stockAlerts={data.stockAlerts}
    />
  );
}
