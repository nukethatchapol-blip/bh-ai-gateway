import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptApiKey } from "@/lib/crypto";

const VALID = new Set(["openai", "anthropic", "google", "mistral", "groq", "openrouter"]);

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { provider, key, monthly_cap_usd } = await request.json();
  if (!VALID.has(provider) || !key || key.length < 8) {
    return NextResponse.json({ error: "invalid provider or key" }, { status: 400 });
  }

  const { enc_payload, enc_iv, enc_tag } = encryptApiKey(key);
  const last4 = key.slice(-4);

  const admin = createServiceClient();
  const { error } = await admin
    .from("api_keys")
    .upsert(
      {
        user_id: user.id,
        provider,
        last4,
        enc_payload,
        enc_iv,
        enc_tag,
        monthly_cap_usd: monthly_cap_usd ?? 250,
        active: true,
      },
      { onConflict: "user_id,provider" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  if (!VALID.has(provider)) return NextResponse.json({ error: "invalid provider" }, { status: 400 });

  const admin = createServiceClient();
  const { error } = await admin
    .from("api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
