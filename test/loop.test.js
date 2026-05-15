import { describe, it, expect, vi } from "vitest";
import { runAgentLoop } from "../lib/ai/loop.js";

describe("runAgentLoop", () => {
  it("executes a tool call then streams a final answer", async () => {
    const events = [];
    const fakeProvider = {
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
