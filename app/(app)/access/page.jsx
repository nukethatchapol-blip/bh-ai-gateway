import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { AccessScreen } from "@/components/access-screen";

export default async function AccessPage() {
  const supabase = await createClient();
  const me = await getCurrentProfile(); // cached — already includes `role`
  if (me?.role !== "admin") redirect("/chat");

  const [{ data: users }, { data: branches }, { data: access }, tablesResp] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, status")
      .neq("status", "pending")
      .order("full_name"),
    supabase.from("branches").select("*").order("id"),
    supabase.from("branch_access").select("user_id, branch_id"),
    supabase.rpc("gateway_list_tables"),
  ]);
  const affectedTables = tablesResp.data || [];

  const byUser = {};
  (access || []).forEach((r) => { (byUser[r.user_id] ??= new Set()).add(r.branch_id); });

  const enriched = (users || []).map((u) => ({
    ...u,
    branchIds: Array.from(byUser[u.id] || new Set()),
  }));

  return <AccessScreen users={enriched} branches={branches || []} affectedTables={affectedTables} />;
}
