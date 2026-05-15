import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supabase.rpc("gateway_list_tables");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tables: data || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { table_name, schema_name = "public", enabled, branch_column } = await request.json();
  if (!table_name) return NextResponse.json({ error: "table_name required" }, { status: 400 });

  const VALID_COLS = new Set([null, "", "branch_code", "branch_ref", "store_name"]);
  if (branch_column !== undefined && !VALID_COLS.has(branch_column)) {
    return NextResponse.json({ error: "invalid branch_column" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { error } = await admin
    .from("gateway_affected_tables")
    .upsert(
      {
        schema_name,
        table_name,
        enabled: enabled ?? false,
        branch_column: branch_column || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: "schema_name,table_name" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    user_id: user.id,
    action: "admin.affected_tables.update",
    scope: `${schema_name}.${table_name}`,
    status: "ok",
    detail: { enabled, branch_column },
  });

  return NextResponse.json({ ok: true });
}
