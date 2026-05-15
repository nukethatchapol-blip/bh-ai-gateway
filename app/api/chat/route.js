import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { resolveProviderKey, callModel } from "@/lib/ai/route";
import { modelById } from "@/lib/models";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, status, full_name, monthly_token_cap")
    .eq("id", user.id)
    .single();
  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "account not active" }, { status: 403 });
  }

  const body = await request.json();
  const { chatId, skillId, modelId, branchScope, message, history = [] } = body;

  // 1. Validate skill
  const { data: skill } = await supabase
    .from("skills")
    .select("id, name, system_prompt, tools, active")
    .eq("id", skillId)
    .single();
  if (!skill || !skill.active) {
    return NextResponse.json({ error: "skill not available" }, { status: 400 });
  }

  // 2. Resolve authorized branches — every role (including admin) is
  //    governed by branch_access. Admins get all branches auto-granted
  //    via the on_profile_role_change trigger on promotion.
  const { data: access } = await supabase
    .from("branch_access")
    .select("branch_id")
    .eq("user_id", profile.id);
  const authorized = (access || []).map((a) => a.branch_id);

  // 3. Enforce: branchScope must be in authorized set (unless ALL)
  if (branchScope && branchScope !== "ALL" && !authorized.includes(branchScope)) {
    await audit(supabase, profile.id, "chat.blocked", branchScope, modelId, 0, "denied", {
      reason: "scope outside authorization",
    });
    return NextResponse.json({
      blocked: true,
      text: `Branch "${branchScope}" is outside your authorization. The admin can grant access from the Access page.`,
    });
  }

  // 4. Build system prompt with the scope context
  // Note: branch-mention filtering at the prompt level is unreliable across the
  // real (messy) branch_ref space — the DB-level RLS enforces scope authoritatively.
  const scopeText =
    branchScope === "ALL"
      ? `You may only reference and analyse data from branches in this set: ${authorized.join(", ")}. Never reference other branches.`
      : `You may only reference and analyse data from branch ${branchScope}. Never reference other branches.`;
  const systemPrompt = `${skill.system_prompt}\n\nBRANCH SCOPE POLICY\n${scopeText}\n\nUSER\n${profile.full_name || user.email}\nROLE: ${profile.role}`;

  // 6. Build provider call
  const m = modelById(modelId);
  if (!m) return NextResponse.json({ error: "unknown model" }, { status: 400 });

  const admin = createServiceClient();
  const { key, source } = await resolveProviderKey(admin, profile.id, m.provider);

  if (!key) {
    return NextResponse.json({
      blocked: true,
      text: `No API key available for ${m.provider}. Add one in API Keys, or ask an admin to configure the team gateway key.`,
    });
  }

  // 7. Find or create chat
  let cid = chatId;
  if (!cid) {
    const { data: created } = await supabase
      .from("chats")
      .insert({
        user_id: profile.id,
        title: (message || "Untitled").slice(0, 80),
        skill_id: skill.id,
        model_id: m.id,
        branch_scope: branchScope === "ALL" ? null : branchScope,
      })
      .select("id")
      .single();
    cid = created?.id;
  }

  await supabase.from("messages").insert({
    chat_id: cid,
    user_id: profile.id,
    role: "user",
    content: { text: message },
  });

  // 8. Call the model
  let reply, tokensIn = 0, tokensOut = 0;
  try {
    const result = await callModel({
      model: m.id,
      apiKey: key,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
    });
    reply = result.text;
    tokensIn = result.tokens_in;
    tokensOut = result.tokens_out;
  } catch (err) {
    await audit(supabase, profile.id, "chat.error", branchScope || "ALL", m.id, 0, "error", { message: err.message });
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  await supabase.from("messages").insert({
    chat_id: cid,
    user_id: profile.id,
    role: "assistant",
    content: { text: reply },
    model: m.id,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
  });

  await audit(supabase, profile.id, "chat.message", branchScope || "ALL", m.id, tokensIn + tokensOut, "ok", { source });

  return NextResponse.json({
    chatId: cid,
    text: reply,
    blocks: [
      { type: "tool", name: "model.call", detail: `${m.provider} · ${m.label} · key=${source}`, elapsed: "" },
      { type: "p", text: reply },
    ],
    tokens_in: tokensIn,
    tokens_out: tokensOut,
  });
}

async function audit(supabase, userId, action, scope, model, tokens, status, detail) {
  await supabase.from("audit_log").insert({
    user_id: userId,
    action,
    scope,
    model: model || null,
    tokens: tokens || 0,
    status,
    detail,
  });
}
