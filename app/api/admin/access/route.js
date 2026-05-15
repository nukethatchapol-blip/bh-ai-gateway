import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { userId, branchIds } = await request.json();
  if (!userId || !Array.isArray(branchIds)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const admin = createServiceClient();
  // Replace the full set of access rows for this user.
  await admin.from("branch_access").delete().eq("user_id", userId);
  if (branchIds.length) {
    const rows = branchIds.map((branch_id) => ({ user_id: userId, branch_id, granted_by: user.id }));
    const { error } = await admin.from("branch_access").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    user_id: user.id,
    action: "admin.access.update",
    scope: userId,
    status: "ok",
    detail: { count: branchIds.length },
  });

  return NextResponse.json({ ok: true });
}
