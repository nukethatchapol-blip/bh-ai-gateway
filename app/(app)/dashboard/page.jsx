import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // These four queries are independent — run them in parallel instead of
  // four sequential round trips to the (Singapore) DB.
  const [{ data: profile }, { data: branches }, { data: access }, { data: kpis }] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase.from("branches").select("*").order("name"),
    supabase.from("branch_access").select("branch_id").eq("user_id", user.id),
    supabase.rpc("bearhouse_branch_kpis", { p_from: from, p_to: to }),
  ]);
  const authorizedIds = (access || []).map((a) => a.branch_id);

  return (
    <DashboardScreen
      profile={profile}
      branches={branches || []}
      authorizedIds={authorizedIds}
      kpis={kpis || []}
      from={from}
      to={to}
    />
  );
}
