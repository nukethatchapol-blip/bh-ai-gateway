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
