// Server-only: resolve which provider key to use for a request — the
// user's BYO key when available, else the team gateway key.

import "server-only";
import { decryptApiKey } from "@/lib/crypto";

const TEAM_KEYS = {
  openai:     () => process.env.OPENAI_API_KEY,
  anthropic:  () => process.env.ANTHROPIC_API_KEY,
  google:     () => process.env.GOOGLE_AI_API_KEY,
  mistral:    () => process.env.MISTRAL_API_KEY,
  groq:       () => process.env.GROQ_API_KEY,
  openrouter: () => process.env.OPENROUTER_API_KEY,
};

export async function resolveProviderKey(supabaseAdmin, userId, provider) {
  const { data: rows } = await supabaseAdmin
    .from("api_keys")
    .select("enc_payload, enc_iv, enc_tag, active")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("active", true)
    .limit(1);

  if (rows?.length) {
    return { key: decryptApiKey(rows[0]), source: "byo" };
  }
  const teamKey = TEAM_KEYS[provider]?.();
  if (teamKey) return { key: teamKey, source: "gateway" };
  return { key: null, source: "none" };
}
