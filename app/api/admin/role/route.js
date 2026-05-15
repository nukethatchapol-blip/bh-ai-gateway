import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const ROLES = new Set(["staff", "manager", "admin"]);

// Change a user's role. Admin-only. Promoting to admin fires the
// grant_admin_full_access trigger (auto-grants every branch); demoting
// an admin clears that auto-granted branch access here.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { profileId, role } = await request.json();
  if (!profileId || !ROLES.has(role)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  if (profileId === user.id) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data: target } = await admin
    .from("profiles").select("role").eq("id", profileId).single();
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const { error } = await admin.from("profiles").update({ role }).eq("id", profileId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Demotion from admin: revoke the all-branches access the promotion granted.
  if (target.role === "admin" && role !== "admin") {
    await admin.from("branch_access").delete().eq("user_id", profileId);
  }

  await admin.from("audit_log").insert({
    user_id: user.id,
    action: "admin.role.update",
    scope: profileId,
    status: "ok",
    detail: { from: target.role, to: role },
  });

  return NextResponse.json({ ok: true });
}
