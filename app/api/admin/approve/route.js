import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { profileId, decision } = await request.json();
  if (!profileId || !["approve", "deny"].includes(decision)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, email, requested_role, requested_branch")
    .eq("id", profileId)
    .single();
  if (!target) return NextResponse.json({ error: "profile not found" }, { status: 404 });

  if (decision === "approve") {
    await admin
      .from("profiles")
      .update({
        status: "active",
        role: target.requested_role || "staff",
      })
      .eq("id", profileId);

    // grant initial branch access if a primary branch was requested
    if (target.requested_branch) {
      await admin.from("branch_access").insert({
        user_id: profileId,
        branch_id: target.requested_branch,
        granted_by: user.id,
      }).select();
    }
  } else {
    await admin
      .from("profiles")
      .update({ status: "disabled" })
      .eq("id", profileId);
  }

  await admin.from("audit_log").insert({
    user_id: user.id,
    action: decision === "approve" ? "admin.approve" : "admin.deny",
    scope: profileId,
    status: "ok",
    detail: { target: target.email },
  });

  return NextResponse.json({ ok: true });
}
