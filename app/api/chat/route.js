import { createClient, createServiceClient } from "@/lib/supabase/server";
import { resolveProviderKey } from "@/lib/ai/route";
import { streamWithTools, callForTools } from "@/lib/ai/stream";
import { runAgentLoop } from "@/lib/ai/loop";
import { TOOLS, executeTool } from "@/lib/ai/tools";
import { modelById } from "@/lib/models";
import { redactPII, redactDeep } from "@/lib/pii";
import { rateLimit } from "@/lib/redis";

// Char-based token estimate: providers vary, but ~4 chars/token is a
// reasonable upper-bound for the latin+thai mix we see. Good enough to make
// the monthly cap actually trip; switch to provider-reported usage when the
// stream layer surfaces it.
const estimateTokens = (s) => (s ? Math.ceil(String(s).length / 4) : 0);

// Sliding-window rate limit: 30 messages per rolling minute per user.
// Cheap protection against runaway cost / abuse. Fails open if Redis is down.
const CHAT_RATE_MAX = 30;
const CHAT_RATE_WINDOW = 60;

export const dynamic = "force-dynamic";

function sse(controller, event) {
  controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"));
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("id, role, status, full_name, monthly_token_cap").eq("id", user.id).single();
  if (!profile || profile.status !== "active") {
    return Response.json({ error: "account not active" }, { status: 403 });
  }

  // Per-user rate limit. Returns 429 with friendly retry-after when over.
  const rl = await rateLimit(`chat:${profile.id}`, CHAT_RATE_MAX, CHAT_RATE_WINDOW);
  if (!rl.allowed) {
    const retryAfter = Math.max(1, rl.reset - Math.floor(Date.now() / 1000));
    return Response.json(
      { error: `Too many messages — wait ${retryAfter}s and try again.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  // Spec error-handling: token cap checked before the loop. Sums tokens
  // recorded in audit_log for the current calendar month.
  if (profile.monthly_token_cap) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data: usedRows } = await supabase
      .from("audit_log")
      .select("tokens")
      .eq("user_id", profile.id)
      .gte("created_at", monthStart.toISOString());
    const usedTokens = (usedRows || []).reduce((a, r) => a + (r.tokens || 0), 0);
    if (usedTokens >= profile.monthly_token_cap) {
      return Response.json({
        error: `Monthly token cap reached (${usedTokens.toLocaleString()} / ${profile.monthly_token_cap.toLocaleString()}). Ask an admin to raise it.`,
      }, { status: 429 });
    }
  }

  const body = await request.json();
  const { chatId, skillId, modelId, branchScope, message, history = [] } = body;

  const { data: skill } = await supabase
    .from("skills").select("id, name, system_prompt, tools, active").eq("id", skillId).single();
  if (!skill?.active) return Response.json({ error: "skill not available" }, { status: 400 });

  const { data: access } = await supabase
    .from("branch_access").select("branch_id").eq("user_id", profile.id);
  const authorized = (access || []).map((a) => a.branch_id);

  if (branchScope && branchScope !== "ALL" && !authorized.includes(branchScope)) {
    return Response.json({ error: "branch outside authorization" }, { status: 403 });
  }

  const m = modelById(modelId);
  if (!m) return Response.json({ error: "unknown model" }, { status: 400 });

  const admin = createServiceClient();
  const { key, source } = await resolveProviderKey(admin, profile.id, m.provider);
  if (!key) {
    return Response.json({
      error: `No API key for ${m.provider}. Add one in API Keys.`,
    }, { status: 400 });
  }

  const scopeText = branchScope === "ALL"
    ? `Authorized branches: ${authorized.join(", ") || "(none)"}.`
    : `Authorized branch: ${branchScope}.`;
  const answerStyle =
    "ANSWER STYLE\nDo your step-by-step reasoning in your thinking, not in the reply. " +
    "The final reply must be a direct, concise answer for a business user — quote the " +
    "numbers and insights. Do not paste raw SQL, scratch work, or schema guesses in the " +
    "reply unless the user explicitly asks for SQL.";
  const system = `${skill.system_prompt}\n\nBRANCH SCOPE\n${scopeText}\nUSER: ${profile.full_name} (${profile.role})\n\n${answerStyle}`;

  let cid = chatId;
  if (!cid) {
    const { data: created } = await supabase.from("chats").insert({
      user_id: profile.id, title: (message || "Untitled").slice(0, 80),
      skill_id: skill.id, model_id: m.id,
      branch_scope: branchScope === "ALL" ? null : branchScope,
    }).select("id").single();
    cid = created?.id;
  }
  await supabase.from("messages").insert({
    chat_id: cid, user_id: profile.id, role: "user", content: { text: message },
  });

  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      let thinking = "";
      const blocks = [];
      const toolsEnabled = (skill.tools || []).includes("supabase.query");
      try {
        await runAgentLoop({
          messages: [...history, { role: "user", content: message }],
          tools: toolsEnabled ? TOOLS : [],
          callForTools: async (convo) => {
            if (!toolsEnabled) return { text: "", toolCalls: [] };
            return callForTools({
              provider: m.provider, model: m.id, apiKey: key,
              system, messages: convo, tools: TOOLS,
            });
          },
          executeTool: (name, args) => executeTool(supabase, name, args),
          streamFinal: async ({ messages: convo, onEvent }) => {
            return streamWithTools({
              provider: m.provider, model: m.id, apiKey: key,
              system, messages: convo, onEvent,
            });
          },
          onEvent: (ev) => {
            if (ev.type === "text-delta") { full += ev.text; sse(controller, ev); }
            else if (ev.type === "thinking-delta") { thinking += ev.text; sse(controller, ev); }
            else if (ev.type === "tool-call") sse(controller, ev);
            else if (ev.type === "tool-result") { if (ev.block) blocks.push(ev.block); sse(controller, ev); }
          },
        });
        // PII redaction on PERSISTED message — masks phone numbers + emails
        // in assistant text, thinking, and tool-result blocks. The live SSE
        // stream above already went to the (authenticated) user; redaction
        // protects the SAVED record (re-opens, shares, audits).
        const savedText = redactPII(full);
        const savedThinking = redactPII(thinking);
        const savedBlocks = redactDeep(blocks);

        await supabase.from("messages").insert({
          chat_id: cid, user_id: profile.id, role: "assistant",
          content: { text: savedText, blocks: savedBlocks, thinking: savedThinking },
          model: m.id,
        });

        // Token accounting (estimate). Sums input prompt + assistant output
        // + thinking. Once recorded, the cap-check at the top of this route
        // will actually trip when the user is over their monthly_token_cap.
        const inputText = system + (history || []).map((h) => h.content || "").join("\n") + (message || "");
        const tokens = estimateTokens(inputText) + estimateTokens(full) + estimateTokens(thinking);

        await supabase.from("audit_log").insert({
          user_id: profile.id, action: "chat.message",
          scope: branchScope || "ALL", model: m.id, status: "ok",
          tokens,
          detail: { source, est_tokens: true },
        });
        sse(controller, { type: "done", chatId: cid });
      } catch (err) {
        sse(controller, { type: "error", message: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
