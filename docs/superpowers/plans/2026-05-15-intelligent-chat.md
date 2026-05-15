# Intelligent Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the BEARHOUSE AI Gateway chat into a streaming, tool-using, data-grounded assistant with conversation continuity.

**Architecture:** `/api/chat` becomes a Server-Sent-Events endpoint running a server-side agentic loop. The loop streams the model's output, executes curated data tools server-side against the caller's RLS-scoped Supabase client (branch ACL enforced by the database), and feeds results back. The browser renders an event stream into the existing block-based message renderer.

**Tech Stack:** Next.js 14 App Router (JS), Supabase JS, OpenAI + Anthropic REST APIs (streaming + tool use), Vitest for tests.

Spec: `docs/superpowers/specs/2026-05-15-intelligent-chat-design.md`

---

## File Structure

**Created:**
- `lib/markdown.js` — parse assistant prose (markdown) into renderer blocks
- `lib/ai/stream.js` — provider-agnostic streaming + tool-use wrapper
- `lib/ai/tools.js` — curated tool definitions + executors
- `lib/ai/loop.js` — the agentic loop (orchestrates stream + tools)
- `vitest.config.mjs`, `test/` — test runner + tests

**Modified:**
- `app/api/chat/route.js` — rewritten as SSE orchestrator
- `components/chat-screen.jsx` — consume SSE, render live, hydrate history
- `app/(app)/chat/page.jsx` — load past chat when `?c=<id>` present
- `lib/ai/route.js` — keep `resolveProviderKey`, drop `callModel`

---

## Task 0: Project setup — git + Vitest

**Files:**
- Create: `vitest.config.mjs`
- Modify: `package.json`

- [ ] **Step 1: Initialize git if needed**

Run: `git rev-parse --is-inside-work-tree 2>/dev/null || git init`
Expected: either `true`, or `Initialized empty Git repository`.

- [ ] **Step 2: Install Vitest**

Run: `npm install -D vitest@^2.1.8`
Expected: `added N packages`.

- [ ] **Step 3: Create `vitest.config.mjs`**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{js,mjs}"],
  },
});
```

- [ ] **Step 4: Add the test script to `package.json`**

In the `"scripts"` block, add:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 5: Sanity test**

Create `test/sanity.test.js`:

```js
import { describe, it, expect } from "vitest";
describe("sanity", () => { it("runs", () => { expect(1 + 1).toBe(2); }); });
```

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.mjs test/sanity.test.js .gitignore
git commit -m "chore: add vitest test runner"
```

---

## Task 1: Markdown-to-blocks parser

**Files:**
- Create: `lib/markdown.js`
- Test: `test/markdown.test.js`

Parses assistant prose into the block array the renderer consumes. Block
shapes: `{type:"heading",level,text}`, `{type:"p",text}`, `{type:"list",items}`,
`{type:"code",lang,text}`, `{type:"table",cols,rows}`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../lib/markdown.js";

describe("parseMarkdown", () => {
  it("parses a heading", () => {
    expect(parseMarkdown("## Sales")).toEqual([{ type: "heading", level: 2, text: "Sales" }]);
  });
  it("parses a paragraph", () => {
    expect(parseMarkdown("Revenue is up.")).toEqual([{ type: "p", text: "Revenue is up." }]);
  });
  it("parses a bullet list", () => {
    expect(parseMarkdown("- one\n- two")).toEqual([{ type: "list", items: ["one", "two"] }]);
  });
  it("parses a fenced code block", () => {
    expect(parseMarkdown("```sql\nSELECT 1\n```")).toEqual([{ type: "code", lang: "sql", text: "SELECT 1" }]);
  });
  it("parses a GitHub table", () => {
    const md = "| A | B |\n| - | - |\n| 1 | 2 |";
    expect(parseMarkdown(md)).toEqual([{ type: "table", cols: ["A", "B"], rows: [["1", "2"]] }]);
  });
  it("handles mixed content and blank lines", () => {
    const blocks = parseMarkdown("# Title\n\nText here\n\n- a");
    expect(blocks.map((b) => b.type)).toEqual(["heading", "p", "list"]);
  });
  it("returns [] for empty input", () => {
    expect(parseMarkdown("")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- markdown`
Expected: FAIL — "parseMarkdown is not a function".

- [ ] **Step 3: Implement `lib/markdown.js`**

```js
// Minimal markdown → block parser for streaming assistant prose.
// Block types consumed by components/chat-screen.jsx MessageBlock.

export function parseMarkdown(src) {
  const text = (src || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;

  const flushPara = (buf) => {
    const joined = buf.join(" ").trim();
    if (joined) blocks.push({ type: "p", text: joined });
  };

  while (i < lines.length) {
    const line = lines[i];

    // blank
    if (!line.trim()) { i++; continue; }

    // fenced code
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || "";
      const body = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { body.push(lines[i]); i++; }
      i++; // closing fence
      blocks.push({ type: "code", lang, text: body.join("\n") });
      continue;
    }

    // heading
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { blocks.push({ type: "heading", level: h[1].length, text: h[2].trim() }); i++; continue; }

    // table: header row + separator row
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const splitRow = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const cols = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      blocks.push({ type: "table", cols, rows });
      continue;
    }

    // bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // paragraph: gather until blank / structural line
    const buf = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^```/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\|.*\|\s*$/.test(lines[i])
    ) { buf.push(lines[i]); i++; }
    flushPara(buf);
  }

  return blocks;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- markdown`
Expected: `7 passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/markdown.js test/markdown.test.js
git commit -m "feat: markdown-to-blocks parser for chat rendering"
```

---

## Task 2: Render heading + code blocks

**Files:**
- Modify: `components/chat-screen.jsx` (the `MessageBlock` function)

The renderer already handles `p`/`tool`/`table`/`chart`/`list`. Add `heading`
and `code` so parsed markdown renders fully.

- [ ] **Step 1: Add the two block branches**

In `components/chat-screen.jsx`, inside `function MessageBlock({ block })`,
immediately after the `if (block.type === "p") { ... }` branch, add:

```jsx
  if (block.type === "heading") {
    const sizes = { 1: 20, 2: 17, 3: 15, 4: 13.5 };
    return (
      <div style={{
        font: `600 ${sizes[block.level] || 14}px/1.3 var(--font-sans)`,
        letterSpacing: "-0.01em", margin: "4px 0 8px",
      }}>{block.text}</div>
    );
  }
  if (block.type === "code") {
    return (
      <pre className="mono" style={{
        margin: "0 0 12px", padding: "12px 14px", borderRadius: 8,
        background: "var(--bg-2)", border: "0.5px solid var(--line)",
        font: "400 12px/1.6 var(--font-mono)", color: "var(--ink-2)",
        overflowX: "auto", whiteSpace: "pre",
      }}>{block.text}</pre>
    );
  }
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add components/chat-screen.jsx
git commit -m "feat: render heading and code blocks in chat"
```

---

## Task 3: Streaming provider wrapper (text only)

**Files:**
- Create: `lib/ai/stream.js`
- Test: `test/stream.test.js`

`streamWithTools({ provider, model, apiKey, system, messages, tools, onEvent, signal })`.
For Task 3 only the no-tools text path is implemented; `tools` is accepted but
unused. `onEvent` receives `{type:"text-delta",text}`, `{type:"tool-call",...}`,
`{type:"done"}`. Returns `{ text, toolCalls }`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from "vitest";
import { parseOpenAIDelta, parseAnthropicEvent } from "../lib/ai/stream.js";

describe("parseOpenAIDelta", () => {
  it("extracts text from a content delta", () => {
    const line = 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
    expect(parseOpenAIDelta(line)).toEqual({ type: "text-delta", text: "Hello" });
  });
  it("returns done on [DONE]", () => {
    expect(parseOpenAIDelta("data: [DONE]")).toEqual({ type: "done" });
  });
  it("ignores non-data lines", () => {
    expect(parseOpenAIDelta("")).toBeNull();
  });
});

describe("parseAnthropicEvent", () => {
  it("extracts text from content_block_delta", () => {
    const line = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}';
    expect(parseAnthropicEvent(line)).toEqual({ type: "text-delta", text: "Hi" });
  });
  it("returns done on message_stop", () => {
    const line = 'data: {"type":"message_stop"}';
    expect(parseAnthropicEvent(line)).toEqual({ type: "done" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- stream`
Expected: FAIL — "parseOpenAIDelta is not a function".

- [ ] **Step 3: Implement `lib/ai/stream.js`**

```js
import "server-only";
import { modelById } from "@/lib/models";

const OPENAI_MODEL = { "gpt-5.5": "gpt-5", "gpt-4o": "gpt-4o" };
const ANTHROPIC_MODEL = { "claude-4.5-s": "claude-sonnet-4-6", "claude-4.7-o": "claude-opus-4-7" };

// --- SSE line parsers (exported for unit tests) -----------------------------
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

// --- streaming over a fetch Response body -----------------------------------
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
      else if (ev.type === "done") { /* loop ends naturally */ }
    }
  }
  return { text };
}

// --- public API -------------------------------------------------------------
// Task 3: text-only. Tools wired in Task 6.
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- stream`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/stream.js test/stream.test.js
git commit -m "feat: streaming provider wrapper (text)"
```

---

## Task 4: Rewrite /api/chat as an SSE endpoint (no tools yet)

**Files:**
- Modify: `app/api/chat/route.js` (full rewrite)

Streams `text-delta` then `done`. Keeps all existing auth + branch-scope
checks. The agentic loop is added in Task 7; this task ships streaming alone.

- [ ] **Step 1: Replace `app/api/chat/route.js` with**

```js
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
  // recorded in audit_log for the current calendar month. (Metering is
  // best-effort — when no tokens are recorded the sum is 0 and nobody is
  // blocked; the guard is in place for when per-call metering is enhanced.)
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

  // ensure a chat row
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
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.js
git commit -m "feat: stream /api/chat responses over SSE"
```

---

## Task 5: Consume the SSE stream in the chat UI

**Files:**
- Modify: `components/chat-screen.jsx` (the `send` function + streaming render)

- [ ] **Step 1: Replace the `send` function body**

In `components/chat-screen.jsx`, replace the entire `async function send() { ... }`
with:

```jsx
  async function send() {
    if (!draft.trim() && !attached.length) return;
    const text = draft;
    const files = attached;
    const userMsg = { id: "u-" + Date.now(), role: "user", text, files, ts: "now" };
    const assistantId = "a-" + Date.now();
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", model: model.label, ts: "now", text: "", blocks: [] }]);
    setDraft("");
    setAttached([]);
    setPending(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId,
          skillId: skill.id,
          modelId: model.id,
          branchScope,
          message: text,
          history: messages.slice(-10).map((mm) => ({
            role: mm.role === "user" ? "user" : "assistant",
            content: mm.text || (mm.blocks || []).map((b) => b.text || "").join("\n"),
          })),
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || `chat failed (${r.status})`);
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev;
          try { ev = JSON.parse(line); } catch { continue; }
          if (ev.type === "text-delta") {
            acc += ev.text;
            setMessages((m) => m.map((x) => x.id === assistantId ? { ...x, text: acc } : x));
          } else if (ev.type === "done") {
            if (ev.chatId) setChatId(ev.chatId);
          } else if (ev.type === "error") {
            setMessages((m) => m.map((x) => x.id === assistantId ? { ...x, role: "blocked", text: ev.message } : x));
          }
        }
      }
    } catch (e) {
      setMessages((m) => m.map((x) => x.id === assistantId ? { ...x, role: "blocked", text: e.message } : x));
    } finally {
      setPending(false);
    }
  }
```

- [ ] **Step 2: Render streamed assistant text as markdown blocks**

At the top of `components/chat-screen.jsx`, add the import:

```jsx
import { parseMarkdown } from "@/lib/markdown";
```

In the `Message` function, in the assistant branch, replace the block-render line:

```jsx
        <div style={{ font: "400 14.5px/1.65 var(--font-sans)", color: "var(--ink-2)" }}>
          {m.blocks?.length
            ? m.blocks.map((b, i) => <MessageBlock key={i} block={b} />)
            : <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.text}</p>}
        </div>
```

with:

```jsx
        <div style={{ font: "400 14.5px/1.65 var(--font-sans)", color: "var(--ink-2)" }}>
          {(m.blocks?.length ? m.blocks : parseMarkdown(m.text || "")).map((b, i) => (
            <MessageBlock key={i} block={b} />
          ))}
        </div>
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Manual check**

Start the dev server, open `/chat`, send a message. Expected: the reply
renders progressively (token by token), formatted as markdown.

- [ ] **Step 5: Commit**

```bash
git add components/chat-screen.jsx
git commit -m "feat: render streamed chat responses live"
```

**End of Phase A — streaming chat ships here.**

---

## Task 6: Curated tool definitions + executors

**Files:**
- Create: `lib/ai/tools.js`
- Test: `test/tools.test.js`

Each tool: a JSON-schema definition + an `execute(supabase, args)` that calls
one Phase-2 RPC and returns `{ block }` (a `table`/`chart` block) or `{ error }`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from "vitest";
import { TOOLS, executeTool } from "../lib/ai/tools.js";

function mockSupabase(rows) {
  return { rpc: vi.fn().mockResolvedValue({ data: rows, error: null }) };
}

describe("TOOLS", () => {
  it("exposes the five curated tools", () => {
    expect(TOOLS.map((t) => t.name).sort()).toEqual(
      ["get_branch_kpis", "get_goods_issue", "get_inventory_catalog", "get_sales", "list_authorized_branches"]
    );
  });
});

describe("executeTool", () => {
  it("get_branch_kpis calls the RPC and returns a table block", async () => {
    const sb = mockSupabase([{ branch_ref: "FS_1", branch_name: "A", bills: 10, net_revenue: 500, avg_ticket: 50 }]);
    const out = await executeTool(sb, "get_branch_kpis", { date_from: "2026-04-01", date_to: "2026-05-01" });
    expect(sb.rpc).toHaveBeenCalledWith("bearhouse_branch_kpis", { p_from: "2026-04-01", p_to: "2026-05-01" });
    expect(out.block.type).toBe("table");
    expect(out.block.rows.length).toBe(1);
  });
  it("returns an error object on RPC failure", async () => {
    const sb = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }) };
    const out = await executeTool(sb, "get_branch_kpis", { date_from: "x", date_to: "y" });
    expect(out.error).toContain("boom");
  });
  it("rejects an unknown tool", async () => {
    const out = await executeTool(mockSupabase([]), "nope", {});
    expect(out.error).toContain("unknown tool");
  });
  it("notes empty results (possible out-of-scope)", async () => {
    const out = await executeTool(mockSupabase([]), "get_branch_kpis", { date_from: "x", date_to: "y" });
    expect(out.note).toMatch(/no data/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tools`
Expected: FAIL — "TOOLS is not defined".

- [ ] **Step 3: Implement `lib/ai/tools.js`**

```js
// Curated, ACL-safe tools. Each executor calls one Phase-2 RPC; the RPC is
// SECURITY DEFINER and filters by authorized_branches(), so a tool cannot
// return rows outside the caller's branch scope.

const MAX_ROWS = 500;

export const TOOLS = [
  {
    name: "list_authorized_branches",
    description: "List the BEARHOUSE branches the current user is authorized to see.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_branch_kpis",
    description: "Per-branch sales KPIs (bill count, net revenue, average ticket) over a date range.",
    parameters: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "ISO date YYYY-MM-DD" },
        date_to: { type: "string", description: "ISO date YYYY-MM-DD" },
      },
      required: ["date_from", "date_to"],
    },
  },
  {
    name: "get_sales",
    description: "Sales bill rows over a date range, optionally for one branch_ref.",
    parameters: {
      type: "object",
      properties: {
        date_from: { type: "string" },
        date_to: { type: "string" },
        branch_ref: { type: "string", description: "Optional branch_ref filter" },
      },
      required: ["date_from", "date_to"],
    },
  },
  {
    name: "get_inventory_catalog",
    description: "The inventory item catalog: SKU, name, target stock, threshold.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_goods_issue",
    description: "Inventory movement counts per branch and SKU since a date.",
    parameters: {
      type: "object",
      properties: { date_from: { type: "string" } },
      required: ["date_from"],
    },
  },
];

function tableBlock(rows) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  return {
    type: "table",
    cols,
    rows: rows.slice(0, MAX_ROWS).map((r) => cols.map((c) => String(r[c] ?? ""))),
  };
}

async function callRpc(supabase, fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { error: `${fn} failed: ${error.message}` };
  const rows = data || [];
  const out = { block: tableBlock(rows), rowCount: rows.length, raw: rows };
  if (rows.length === 0) out.note = "No data returned — the range may be empty or the branch outside your scope.";
  return out;
}

export async function executeTool(supabase, name, args = {}) {
  switch (name) {
    case "list_authorized_branches":
      return callRpc(supabase, "my_branches", {});
    case "get_branch_kpis":
      return callRpc(supabase, "bearhouse_branch_kpis", { p_from: args.date_from, p_to: args.date_to });
    case "get_sales":
      return callRpc(supabase, "bearhouse_sales", {
        p_from: args.date_from, p_to: args.date_to, p_branch_ref: args.branch_ref || null,
      });
    case "get_inventory_catalog":
      return callRpc(supabase, "bearhouse_inventory", {});
    case "get_goods_issue":
      return callRpc(supabase, "bearhouse_goods_issue", { p_from: args.date_from });
    default:
      return { error: `unknown tool: ${name}` };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tools`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/tools.js test/tools.test.js
git commit -m "feat: curated ACL-safe data tools"
```

---

## Task 7: Tool-use in the streaming wrapper + agentic loop

**Files:**
- Modify: `lib/ai/stream.js` (add tool-call accumulation)
- Create: `lib/ai/loop.js`
- Test: `test/loop.test.js`

`runAgentLoop` drives: stream → if tool calls, execute via `executeTool`,
append results, repeat (max 5 rounds) → else finish.

- [ ] **Step 1: Add non-streaming tool-capable call to `lib/ai/stream.js`**

Append to `lib/ai/stream.js`:

```js
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
```

- [ ] **Step 2: Write the failing loop test**

```js
import { describe, it, expect, vi } from "vitest";
import { runAgentLoop } from "../lib/ai/loop.js";

describe("runAgentLoop", () => {
  it("executes a tool call then streams a final answer", async () => {
    const events = [];
    const fakeProvider = {
      // round 1: ask for a tool; round 2: no tools
      calls: [
        { text: "", toolCalls: [{ id: "t1", name: "get_branch_kpis", args: { date_from: "a", date_to: "b" } }] },
        { text: "", toolCalls: [] },
      ],
      idx: 0,
    };
    await runAgentLoop({
      tools: [{ name: "get_branch_kpis" }],
      callForTools: async () => fakeProvider.calls[fakeProvider.idx++],
      streamFinal: async ({ onEvent }) => { onEvent({ type: "text-delta", text: "Done." }); return { text: "Done." }; },
      executeTool: async () => ({ block: { type: "table", cols: [], rows: [] }, rowCount: 0 }),
      onEvent: (e) => events.push(e),
    });
    const types = events.map((e) => e.type);
    expect(types).toContain("tool-call");
    expect(types).toContain("tool-result");
    expect(types).toContain("text-delta");
  });

  it("stops after 5 tool rounds", async () => {
    let rounds = 0;
    await runAgentLoop({
      tools: [{ name: "x" }],
      callForTools: async () => { rounds++; return { text: "", toolCalls: [{ id: "t", name: "x", args: {} }] }; },
      streamFinal: async () => ({ text: "" }),
      executeTool: async () => ({ block: { type: "table", cols: [], rows: [] } }),
      onEvent: () => {},
    });
    expect(rounds).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- loop`
Expected: FAIL — "runAgentLoop is not a function".

- [ ] **Step 4: Implement `lib/ai/loop.js`**

```js
import "server-only";

const MAX_ROUNDS = 5;

// Dependency-injected so it is unit-testable without real providers.
// callForTools(messages) -> { text, toolCalls }
// executeTool(name, args) -> { block?, error?, note?, raw? }
// streamFinal({ messages, onEvent }) -> { text }
export async function runAgentLoop({ messages = [], tools, callForTools, executeTool, streamFinal, onEvent }) {
  const convo = [...messages];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { toolCalls } = await callForTools(convo);
    if (!toolCalls || toolCalls.length === 0) break;

    for (const tc of toolCalls) {
      onEvent({ type: "tool-call", name: tc.name, args: tc.args });
      const result = await executeTool(tc.name, tc.args);
      onEvent({ type: "tool-result", name: tc.name, block: result.block || null, note: result.note });
      convo.push({
        role: "user",
        content: `[tool ${tc.name} result] ${JSON.stringify(result.raw || result.error || result.note || {})}`,
      });
    }
    if (round === MAX_ROUNDS - 1) {
      convo.push({ role: "user", content: "Tool budget reached — answer now with what you have." });
    }
  }

  return streamFinal({ messages: convo, onEvent });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- loop`
Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add lib/ai/stream.js lib/ai/loop.js test/loop.test.js
git commit -m "feat: agentic tool-use loop"
```

---

## Task 8: Wire the agentic loop into /api/chat

**Files:**
- Modify: `app/api/chat/route.js`

- [ ] **Step 1: Update imports at the top of `app/api/chat/route.js`**

```js
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { resolveProviderKey } from "@/lib/ai/route";
import { streamWithTools, callForTools } from "@/lib/ai/stream";
import { runAgentLoop } from "@/lib/ai/loop";
import { TOOLS, executeTool } from "@/lib/ai/tools";
import { modelById } from "@/lib/models";
```

- [ ] **Step 2: Replace the `ReadableStream` `start` body**

Replace the entire `start(controller)` function from Task 4 with:

```js
    async start(controller) {
      let full = "";
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
            else if (ev.type === "tool-call") sse(controller, ev);
            else if (ev.type === "tool-result") { if (ev.block) blocks.push(ev.block); sse(controller, ev); }
          },
        });
        await supabase.from("messages").insert({
          chat_id: cid, user_id: profile.id, role: "assistant",
          content: { text: full, blocks }, model: m.id,
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
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/route.js
git commit -m "feat: agentic data tools in /api/chat"
```

---

## Task 9: Render tool-call and tool-result events in the UI

**Files:**
- Modify: `components/chat-screen.jsx` (the SSE consumer in `send`)

- [ ] **Step 1: Extend the event handler in `send`**

In the `send` function's SSE loop, replace the `if (ev.type === "text-delta")`
… `else if` chain with:

```jsx
          if (ev.type === "text-delta") {
            acc += ev.text;
            setMessages((m) => m.map((x) => x.id === assistantId
              ? { ...x, text: acc, blocks: [...toolBlocks, ...parseMarkdown(acc)] } : x));
          } else if (ev.type === "tool-call") {
            toolBlocks.push({ type: "tool", name: ev.name, detail: summarizeArgs(ev.args), elapsed: "" });
            setMessages((m) => m.map((x) => x.id === assistantId
              ? { ...x, blocks: [...toolBlocks, ...parseMarkdown(acc)] } : x));
          } else if (ev.type === "tool-result") {
            if (ev.block) toolBlocks.push(ev.block);
            setMessages((m) => m.map((x) => x.id === assistantId
              ? { ...x, blocks: [...toolBlocks, ...parseMarkdown(acc)] } : x));
          } else if (ev.type === "done") {
            if (ev.chatId) setChatId(ev.chatId);
          } else if (ev.type === "error") {
            setMessages((m) => m.map((x) => x.id === assistantId
              ? { ...x, role: "blocked", text: ev.message } : x));
          }
```

- [ ] **Step 2: Declare `toolBlocks` and add `summarizeArgs`**

In `send`, just after `let acc = "";` add:

```jsx
      const toolBlocks = [];
```

At the bottom of `components/chat-screen.jsx` (module scope, after the last
component), add:

```jsx
function summarizeArgs(args = {}) {
  const parts = Object.entries(args).map(([k, v]) => `${k}=${v}`);
  return parts.join(" · ");
}
```

- [ ] **Step 3: Render assistant message from blocks when present**

Confirm the `Message` assistant branch (edited in Task 5) renders
`m.blocks?.length ? m.blocks : parseMarkdown(m.text)`. With Task 9, `blocks`
is always populated during streaming — no change needed; just verify.

- [ ] **Step 4: Verify build compiles**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Manual check**

Dev server → `/chat` → ask "What were total sales last month per branch?"
Expected: a `get_branch_kpis` tool card appears, then a data table, then a
prose summary streams in.

- [ ] **Step 6: Commit**

```bash
git add components/chat-screen.jsx
git commit -m "feat: render tool calls and results in chat"
```

**End of Phase B — data-grounded chat ships here.**

---

## Task 10: Load and continue past chats

**Files:**
- Modify: `app/(app)/chat/page.jsx` (load messages when `?c=` present)
- Modify: `components/chat-screen.jsx` (accept + hydrate `initialMessages`, `initialChatId`)

- [ ] **Step 1: Load the past chat in `app/(app)/chat/page.jsx`**

After the existing `authorizedIds` computation and before the `return`, add:

```jsx
  const params = await searchParams;
  let initialMessages = [];
  let initialChatId = null;
  if (params?.c) {
    const { data: chat } = await supabase
      .from("chats").select("id, skill_id, model_id, branch_scope")
      .eq("id", params.c).single();
    if (chat) {
      initialChatId = chat.id;
      const { data: msgs } = await supabase
        .from("messages").select("id, role, content, model, created_at")
        .eq("chat_id", chat.id).order("created_at");
      initialMessages = (msgs || []).map((mm) => ({
        id: mm.id,
        role: mm.role,
        model: mm.model,
        text: mm.content?.text || "",
        blocks: mm.content?.blocks || [],
        ts: "",
      }));
    }
  }
```

Change the function signature to accept `searchParams`:

```jsx
export default async function ChatPage({ searchParams }) {
```

And pass the new props in the `return`:

```jsx
  return (
    <ChatScreen
      profile={profile}
      skills={skills || []}
      branches={branches || []}
      authorizedIds={authorizedIds}
      initialMessages={initialMessages}
      initialChatId={initialChatId}
    />
  );
```

- [ ] **Step 2: Hydrate `ChatScreen` from the props**

In `components/chat-screen.jsx`, change the component signature and the two
`useState` initializers:

```jsx
export function ChatScreen({ profile, skills, branches, authorizedIds, initialMessages = [], initialChatId = null }) {
```

```jsx
  const [messages, setMessages] = useState(initialMessages);
  const [chatId, setChatId] = useState(initialChatId);
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Manual check**

Dev server → send a message → note the URL has no `?c=` yet → reload `/chat`
→ open the chat from the sidebar Recents → the full history renders.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/chat/page.jsx" components/chat-screen.jsx
git commit -m "feat: load and continue past chats"
```

**End of Phase C — full intelligent chat ships here.**

---

## Verification (whole feature)

- [ ] `npm test` — all unit/integration tests pass
- [ ] `npm run build` — compiles clean
- [ ] Manual: streaming renders token-by-token
- [ ] Manual: a data question triggers a tool card → table → prose
- [ ] Manual: a staff user scoped to one branch cannot get another branch's rows (ask for a branch outside scope → tool returns the "no data" note, no rows leak)
- [ ] Manual: reopening a chat from Recents restores history and continues
