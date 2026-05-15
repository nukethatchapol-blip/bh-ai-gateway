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
