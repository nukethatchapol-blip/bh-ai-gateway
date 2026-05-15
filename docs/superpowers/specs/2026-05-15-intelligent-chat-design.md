# Intelligent Chat — Design Spec

_Date: 2026-05-15 · Project: BEARHOUSE AI Gateway_

## Goal

Upgrade the chat feature so it is genuinely intelligent — closer to the
Claude desktop/web experience — by closing four gaps the current chat has:

1. **Real data access** — the AI can actually query BEARHOUSE branch data
   instead of hallucinating or declining.
2. **Streaming responses** — tokens appear progressively, not after a frozen wait.
3. **Rich rendering** — proper markdown, plus native tables and charts from
   query results.
4. **Conversation memory** — past chats reopen from the sidebar and continue
   with full context.

This is one feature (the chat), so it is one spec — delivered in three
independently shippable phases.

## Current state

- `components/chat-screen.jsx` — skill picker, model picker, branch-scope pill,
  file drag-drop, message thread. `MessageBlock` already renders block types
  `p` / `tool` / `table` / `chart` / `list`.
- `app/api/chat/route.js` — one-shot JSON endpoint. Builds a system prompt from
  the skill + branch scope, calls `lib/ai/route.js#callModel` (non-streaming),
  persists messages, enforces branch ACL on `branchScope`.
- **Gap:** the route has no tool-calling loop. The "Data Analyst" skill prompt
  instructs the model to "always query the connected branch dataset", but no
  tool is wired, so the model has no data.
- Phase-2 RPCs already exist in Postgres and are ACL-scoped via
  `authorized_branches()`: `my_branches`, `bearhouse_branch_kpis`,
  `bearhouse_sales`, `bearhouse_inventory`, `bearhouse_goods_issue`.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| What "intelligent" means | All four gaps above |
| Data access mechanism | **Curated tools** wrapping the Phase-2 RPCs — no raw SQL |
| Result rendering | **Inline blocks** — `tool`/`table`/`chart` cards, prose as markdown |
| Conversation memory | **Load + continue** only — no edit/regenerate, no rename/delete |
| Loop architecture | **Server-orchestrated SSE** (approach A) |

## Architecture

`/api/chat` becomes a streaming Server-Sent-Events endpoint running a
server-side agentic loop:

```
POST /api/chat  →  Content-Type: text/event-stream
  1. Auth, resolve profile + skill + authorized branches      (existing logic)
  2. Pre-check monthly token/spend cap; over-cap → blocked message
  3. Build: system prompt + tool definitions + message history
  4. LOOP (max 5 tool rounds):
       a. Call provider with streaming enabled
       b. Stream text deltas            → emit `text-delta`
       c. If the model requests tools:
            - emit `tool-call`           (compact card)
            - execute server-side via the caller's RLS-scoped client
            - emit `tool-result`         (table/chart block)
            - append tool result to messages; continue loop
       d. No tool call → break
  5. Persist final assistant message; emit `done`
```

The loop cap (5 rounds) injects a "wrap up with what you have" nudge instead
of looping forever. Tools run on the **caller's RLS-scoped Supabase client**,
so a tool physically cannot return rows outside the user's branch scope — the
ACL is enforced by the database, not by tool code.

### New units (both server-only)

- **`lib/ai/tools.js`** — tool JSON-schema definitions + executors. Each
  executor receives the Supabase client and calls exactly one Phase-2 RPC,
  applying defensive truncation/aggregation.
- **`lib/ai/stream.js`** — `streamWithTools({ provider, model, messages, tools, onEvent })`.
  Wraps OpenAI and Anthropic streaming tool-use APIs behind one interface,
  normalizing both into the same `onEvent` callbacks.

`app/api/chat/route.js` shrinks to the orchestrator (auth, scope, loop, SSE
writer). The current non-streaming `lib/ai/route.js#callModel` is superseded
by `stream.js`; `resolveProviderKey` is retained.

## Tools catalog

Five curated tools. The model sees the JSON schemas and chooses which to call.

**Gating rule:** all five data tools are offered to the model only when the
active skill's `tools` array contains `supabase.query`. Both seeded skills
(`data-analyst`, `strategy`) carry that tag, so both get the full set today;
a future skill without it would get no data tools. Other tags in the array
(`chart.render`, `csv.export`, `market.search`) do not map to tools in this
spec — they remain descriptive only.

| Tool | Wraps RPC | Args | Returns |
|---|---|---|---|
| `list_authorized_branches` | `my_branches()` | — | branch_ref, name, region in scope |
| `get_branch_kpis` | `bearhouse_branch_kpis` | `date_from`, `date_to` | bills, net_revenue, avg_ticket per branch |
| `get_sales` | `bearhouse_sales` | `date_from`, `date_to`, `branch_ref?` | sales aggregated server-side (≤ ~500 rows) |
| `get_inventory_catalog` | `bearhouse_inventory()` | — | SKU list, target stock, threshold |
| `get_goods_issue` | `bearhouse_goods_issue` | `date_from` | movement counts per branch + SKU |

Tool results are **truncated/aggregated server-side** before returning to the
model — e.g. `get_sales` rolls up by day or branch and caps raw rows so the
model's context stays lean and answers stay fast.

## Streaming event protocol

The route emits newline-delimited JSON events. The client reads them with
`fetch` + `ReadableStream` (not `EventSource` — this is a POST).

| Event | Payload | Client action |
|---|---|---|
| `text-delta` | `{ text }` | Append to the live assistant paragraph |
| `tool-call` | `{ name, args }` | Render a `tool` block |
| `tool-result` | `{ name, block }` | Render a `table` or `chart` block |
| `done` | `{ chatId, messageId }` | Finalize message, stop the cursor |
| `error` | `{ message }` | Render the red "blocked" card |

## Rendering

`MessageBlock` already renders `p`/`tool`/`table`/`chart`/`list`. New work:

- **`lib/markdown.js`** (~60 lines, no dependency) — parses assistant prose
  into blocks: headings, lists, code fences, GitHub-style tables, paragraphs
  with inline bold/code/branch-chips. The streaming text buffer re-parses to
  blocks on each delta.
- A `tool-result` auto-renders as a `chart` block when rows are KPI-shaped
  (a numeric series per branch), else a `table` block.

## Conversation memory (load + continue)

- Sidebar Recents links already point to `/chat?c=<id>`.
- The chat page reads `?c=`; a server loader fetches that chat's `messages`
  (RLS already restricts rows to the owner) and hydrates the thread.
- On send, the last ~10 messages are sent to the model as history.
- New chats auto-title from the first user message (already implemented).
- Out of scope: edit/regenerate, rename, delete, search.

## Error handling

| Failure | Behavior |
|---|---|
| Tool execution error | Executor returns `{ error }`; model sees it, retries or explains; loop survives |
| Out-of-scope `branch_ref` arg | RLS RPC returns zero rows; executor appends a "no data / may be out of scope" note |
| Provider/network error mid-stream | Emit `error`; client shows red card; partial message discarded, not persisted |
| Loop cap (5 rounds) reached | Inject "wrap up" nudge; model produces a final answer |
| Over monthly token/spend cap | Checked before the loop; returns a blocked message |

## Testing

- **Unit** — each tool executor against a mock Supabase client: correct RPC
  name, args forwarded, truncation applied.
- **Integration** — the loop with a stubbed provider scripted to "emit one
  tool call, then text"; assert event order `tool-call → tool-result →
  text-delta → done`.
- **ACL** — a staff user scoped to one branch: a `get_sales` call for a
  different `branch_ref` returns empty; no other branch's rows ever surface.
- **Manual** — streaming renders incrementally; reopening a Recents chat
  restores history; both an OpenAI and an Anthropic model complete a tool round.

## Phasing

One spec, three shippable increments — each leaves the app fully working:

- **Phase A** — streaming SSE endpoint + `lib/markdown.js` rendering. Replaces
  the frozen wait with a live typewriter. No tools yet.
- **Phase B** — `lib/ai/tools.js` + the agentic loop. The actual data
  intelligence — real-number answers with tables/charts.
- **Phase C** — load + continue past chats from the Recents sidebar.

## Out of scope

- Raw-SQL tool / SQL escape hatch (curated tools only).
- Artifacts side panel.
- Edit/regenerate messages, rename/delete/search chats.
- New model providers beyond the OpenAI + Anthropic already wired.
- Auto-enabling Postgres RLS on the 39 production tables (separate decision).
