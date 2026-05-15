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
