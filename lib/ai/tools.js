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
