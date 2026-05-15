import { createClient, createServiceClient } from "@/lib/supabase/server";
import { resolveProviderKey } from "@/lib/ai/route";
import { streamWithTools } from "@/lib/ai/stream";
import { modelById } from "@/lib/models";

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
  const system = `${skill.system_prompt}\n\nBRANCH SCOPE\n${scopeText}\nUSER: ${profile.full_name} (${profile.role})`;

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
      try {
        await streamWithTools({
          provider: m.provider, model: m.id, apiKey: key, system,
          messages: [...history, { role: "user", content: message }],
          onEvent: (ev) => {
            if (ev.type === "text-delta") { full += ev.text; sse(controller, ev); }
          },
        });
        await supabase.from("messages").insert({
          chat_id: cid, user_id: profile.id, role: "assistant",
          content: { text: full }, model: m.id,
        });
        await supabase.from("audit_log").insert({
          user_id: profile.id, action: "chat.message",
          scope: branchScope || "ALL", model: m.id, status: "ok", detail: { source },
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
