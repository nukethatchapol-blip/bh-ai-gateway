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
