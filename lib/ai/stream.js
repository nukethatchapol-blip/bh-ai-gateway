import "server-only";
import { modelById } from "@/lib/models";

const OPENAI_MODEL = { "gpt-5.5": "gpt-5", "gpt-4o": "gpt-4o" };
const ANTHROPIC_MODEL = { "claude-4.5-s": "claude-sonnet-4-6", "claude-4.7-o": "claude-opus-4-7" };

export function parseOpenAIDelta(line) {
  if (!line.startsWith("data:")) return null;
  const payload = line.slice(5).trim();
  if (!payload) return null;
  if (payload === "[DONE]") return { type: "done" };
  let json;
  try { json = JSON.parse(payload); } catch { return null; }
  const delta = json.choices?.[0]?.delta;
  if (delta?.content) return { type: "text-delta", text: delta.content };
  if (delta?.tool_calls) return { type: "tool-call-delta", toolCalls: delta.tool_calls };
  return null;
}

export function parseAnthropicEvent(line) {
  if (!line.startsWith("data:")) return null;
  const payload = line.slice(5).trim();
  if (!payload) return null;
  let json;
  try { json = JSON.parse(payload); } catch { return null; }
  if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
    return { type: "text-delta", text: json.delta.text };
  }
  if (json.type === "message_stop") return { type: "done" };
  return null;
}

async function pumpSSE(response, parseLine, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const ev = parseLine(line.trim());
      if (!ev) continue;
      if (ev.type === "text-delta") { text += ev.text; onEvent(ev); }
    }
  }
  return { text };
}

export async function streamWithTools({ provider, model, apiKey, system, messages, onEvent, signal }) {
  const m = modelById(model);
  if (!m) throw new Error(`Unknown model: ${model}`);

  if (m.provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL[model] || "gpt-4o",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const { text } = await pumpSSE(res, parseOpenAIDelta, onEvent);
    return { text, toolCalls: [] };
  }

  if (m.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL[model] || "claude-sonnet-4-6",
        max_tokens: 2048,
        stream: true,
        system,
        messages: messages.map((mm) => ({
          role: mm.role === "assistant" ? "assistant" : "user",
          content: typeof mm.content === "string" ? mm.content : JSON.stringify(mm.content),
        })),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const { text } = await pumpSSE(res, parseAnthropicEvent, onEvent);
    return { text, toolCalls: [] };
  }

  throw new Error(`Provider ${m.provider} not supported`);
}

// One model turn that may return tool calls. Non-streamed for the tool
// decision; the final user-facing turn uses streamWithTools (text path).
export async function callForTools({ provider, model, apiKey, system, messages, tools, signal }) {
  const m = modelById(model);
  if (m.provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL[model] || "gpt-4o",
        messages: [{ role: "system", content: system }, ...messages],
        tools: tools.map((t) => ({ type: "function", function: {
          name: t.name, description: t.description, parameters: t.parameters,
        } })),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const msg = json.choices?.[0]?.message || {};
    return {
      text: msg.content || "",
      toolCalls: (msg.tool_calls || []).map((tc) => ({
        id: tc.id, name: tc.function.name,
        args: JSON.parse(tc.function.arguments || "{}"),
      })),
    };
  }
  if (m.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: {
        "content-type": "application/json", "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL[model] || "claude-sonnet-4-6",
        max_tokens: 2048, system,
        messages: messages.map((mm) => ({
          role: mm.role === "assistant" ? "assistant" : "user",
          content: typeof mm.content === "string" ? mm.content : mm.content,
        })),
        tools: tools.map((t) => ({
          name: t.name, description: t.description, input_schema: t.parameters,
        })),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const text = (json.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const toolCalls = (json.content || []).filter((b) => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, args: b.input || {} }));
    return { text, toolCalls };
  }
  throw new Error(`Provider ${m.provider} not supported`);
}
