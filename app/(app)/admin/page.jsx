import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminScreen } from "@/components/admin-screen";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/chat");

  const [{ data: pending }, { data: users }, { data: skills }, { data: audit }] = await Promise.all([
    supabase.from("profiles")
      .select("id, email, full_name, requested_role, requested_branch, request_note, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("profiles")
      .select("id, email, full_name, role, status, last_seen_at, created_at, monthly_token_cap, monthly_spend_cap_usd")
      .eq("status", "active")
      .order("full_name"),
    supabase.from("skills").select("*").order("name"),
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(30),
  ]);

  // Build branch access counts per user
  const { data: accessRows } = await supabase.from("branch_access").select("user_id, branch_id");
  const byUser = {};
  (accessRows || []).forEach((r) => { (byUser[r.user_id] ??= []).push(r.branch_id); });

  return (
    <AdminScreen
      currentUserId={user.id}
      pending={pending || []}
      users={(users || []).map((u) => ({ ...u, branches: byUser[u.id] || [] }))}
      skills={skills || []}
      audit={audit || []}
    />
  );
}
