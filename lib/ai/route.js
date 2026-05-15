// Server-only: route a chat completion to the right provider, using the
// user's BYO key when available, else falling back to the team gateway key.

import "server-only";
import { decryptApiKey } from "@/lib/crypto";
import { modelById } from "@/lib/models";

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

export async function callModel({ model, messages, apiKey, signal }) {
  const m = modelById(model);
  if (!m) throw new Error(`Unknown model: ${model}`);

  if (m.provider === "openai") {
    return openaiChat({ model, messages, apiKey, signal });
  }
  if (m.provider === "anthropic") {
    return anthropicChat({ model, messages, apiKey, signal });
  }
  throw new Error(`Provider ${m.provider} not wired yet`);
}

async function openaiChat({ model, messages, apiKey, signal }) {
  const openaiModel = model === "gpt-5.5" ? "gpt-5" : "gpt-4o";
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      messages,
      stream: false,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const json = await r.json();
  return {
    text: json.choices?.[0]?.message?.content ?? "",
    tokens_in: json.usage?.prompt_tokens ?? 0,
    tokens_out: json.usage?.completion_tokens ?? 0,
  };
}

async function anthropicChat({ model, messages, apiKey, signal }) {
  const anthropicModel =
    model === "claude-4.5-s"
      ? "claude-sonnet-4-6"
      : "claude-opus-4-7";

  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: 2048,
      system,
      messages: rest,
    }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  const json = await r.json();
  const text = (json.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return {
    text,
    tokens_in: json.usage?.input_tokens ?? 0,
    tokens_out: json.usage?.output_tokens ?? 0,
  };
}
