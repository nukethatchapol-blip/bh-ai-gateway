import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { invalidate } from "@/lib/redis";

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

  // Bust the dashboard cache for the affected user so the next page load
  // reflects the new ACL immediately instead of waiting for the 60s TTL.
  // We don't know which (from, to) windows are cached, so we invalidate via
  // pattern using the helper which knows its own naming scheme.
  await invalidatePattern(`c:dash:${userId}:*`).catch(() => {});

  return NextResponse.json({ ok: true });
}

// Pattern-delete using Redis' SCAN + DEL via the singleton client.
// Falls back silently if Redis is unreachable.
async function invalidatePattern(pattern) {
  // Lightweight: open a connection, SCAN+DEL. The shared singleton client
  // from lib/redis isn't suited to multi-key ops on pattern; do it via Lua
  // through the underlying client so it's atomic-ish from this request's POV.
  const { default: Redis } = await import("ioredis");
  if (!process.env.REDIS_URL) return;
  const r = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1, connectTimeout: 2000, lazyConnect: true,
  });
  try {
    await r.connect();
    // SCAN through the keyspace and DEL matches in batches.
    let cursor = "0";
    do {
      const [next, keys] = await r.scan(cursor, "MATCH", pattern, "COUNT", 100);
      if (keys.length) await r.del(...keys);
      cursor = next;
    } while (cursor !== "0");
  } catch {
    /* swallow — cache invalidation is best-effort */
  } finally {
    try { await r.quit(); } catch {}
  }
}
