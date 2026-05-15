"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Icon, RoleBadge, Segmented, Switch } from "./ui";
import { PageHeader } from "./shell";
import { useLang } from "./lang-context";

export function AccessScreen({ users, branches, affectedTables = [] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(users[0]?.id);
  const [scope, setScope] = useState(() => {
    const out = {};
    users.forEach((u) => { out[u.id] = new Set(u.branchIds); });
    return out;
  });
  const [filterRegion, setFilterRegion] = useState("All");
  const [q, setQ] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // Mobile pane switcher — desktop ignores this state via CSS.
  const [mobilePane, setMobilePane] = useState("matrix"); // "users" | "matrix" | "policy"
  const { t } = useLang();
  const [tables, setTables] = useState(affectedTables);

  async function saveAffectedTable(row, patch) {
    const next = { ...row, ...patch };
    setTables((prev) => prev.map((r) => (r.table_name === row.table_name ? next : r)));
    await fetch("/api/admin/affected-tables", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schema_name: row.schema_name,
        table_name: row.table_name,
        enabled: next.enabled,
        branch_column: next.branch_column || null,
      }),
    });
  }

  const u = users.find((x) => x.id === selectedId) || users[0];
  const userScope = scope[u?.id] || new Set();
  const regions = useMemo(() => ["All", ...Array.from(new Set(branches.map((b) => b.region)))], [branches]);
  const filtered = branches.filter(
    (b) => (filterRegion === "All" || b.region === filterRegion) &&
      (!q || b.name.toLowerCase().includes(q.toLowerCase()) || b.id.toLowerCase().includes(q.toLowerCase()))
  );

  function toggleBranch(bid) {
    setScope((s) => {
      const set = new Set(s[selectedId]);
      set.has(bid) ? set.delete(bid) : set.add(bid);
      return { ...s, [selectedId]: set };
    });
    setDirty(true);
  }
  function setAll(ids, on) {
    setScope((s) => {
      const set = new Set(s[selectedId]);
      ids.forEach((id) => (on ? set.add(id) : set.delete(id)));
      return { ...s, [selectedId]: set };
    });
    setDirty(true);
  }

  async function applyChanges() {
    setSaving(true);
    const r = await fetch("/api/admin/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: selectedId,
        branchIds: Array.from(userScope),
      }),
    });
    setSaving(false);
    if (r.ok) {
      setDirty(false);
      startTransition(() => router.refresh());
    } else {
      alert("Save failed");
    }
  }

  if (!u) {
    return (
      <div className="pageframe">
        <PageHeader title="Branch access" crumb="/ admin · access" />
        <div className="page-body" style={{ padding: 40, color: "var(--muted)" }}>No users yet.</div>
      </div>
    );
  }

  return (
    <div className="pageframe">
      <PageHeader title="Branch access" crumb="/ admin · access · supabase rls">
        <button className="btn btn-sm" type="button"><Icon name="download" size={13} /> Export policy</button>
        <button className="btn btn-sm btn-primary" type="button" disabled={!dirty || saving} onClick={applyChanges}>
          <Icon name="check" size={13} /> {saving ? "Saving…" : "Apply changes"}
        </button>
      </PageHeader>

      <div className="access-tabs" style={{ padding: "8px 14px 0", borderBottom: "0.5px solid var(--line)", background: "var(--bg)", gap: 6 }}>
        {[
          { id: "users",  label: "Users" },
          { id: "matrix", label: "Branches" },
          { id: "policy", label: "Policy" },
        ].map((t) => {
          const active = mobilePane === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setMobilePane(t.id)}
              style={{
                appearance: "none", border: 0, background: "transparent",
                padding: "10px 4px", cursor: "pointer",
                font: `${active ? 600 : 500} 13px/1 var(--font-sans)`,
                color: active ? "var(--ink)" : "var(--muted)",
                borderBottom: `2px solid ${active ? "var(--ink)" : "transparent"}`,
                marginBottom: -1,
              }}>{t.label}</button>
          );
        })}
      </div>

      <div className="access-grid" style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr 320px", minHeight: 0 }}>
        <div className={`access-pane ${mobilePane !== "users" ? "hidden-mobile" : ""}`} style={{ borderRight: "0.5px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--line)" }}>
            <div style={{ position: "relative" }}>
              <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input className="input" placeholder="Search users…" style={{ paddingLeft: 32 }} />
            </div>
          </div>
          <div className="scroll-y" style={{ flex: 1, padding: 6 }}>
            {users.map((u2) => {
              const n = scope[u2.id]?.size || 0;
              return (
                <button key={u2.id} onClick={() => setSelectedId(u2.id)} type="button"
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8, border: 0,
                    background: u2.id === selectedId ? "var(--bg-2)" : "transparent",
                    cursor: "pointer", textAlign: "left", marginBottom: 2,
                  }}>
                  <Avatar name={u2.full_name || u2.email} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "500 13px/1.2 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u2.full_name || u2.email}</div>
                    <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                      <RoleBadge role={u2.role} /> <span>· {n === branches.length ? "all" : n} branch{n !== 1 ? "es" : ""}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`access-pane ${mobilePane !== "matrix" ? "hidden-mobile" : ""}`} style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--bg)" }}>
          <div style={{ padding: "16px 24px 12px", borderBottom: "0.5px solid var(--line)", background: "var(--bg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={u.full_name || u.email} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ font: "600 15px/1.2 var(--font-sans)" }}>{u.full_name || u.email}</div>
                <div className="mono" style={{ font: "400 11.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4 }}>{u.email}</div>
              </div>
              <div className="tnum" style={{ textAlign: "right" }}>
                <div style={{ font: "500 22px/1 var(--font-sans)" }}>
                  {userScope.size}<span className="muted" style={{ font: "400 14px/1 var(--font-sans)" }}> / {branches.length}</span>
                </div>
                <div className="mono muted" style={{ font: "400 10.5px/1 var(--font-mono)", marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>branches authorized</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
              <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
                <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input className="input" placeholder="Filter branches" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 32, height: 32 }} />
              </div>
              <Segmented value={filterRegion} onChange={setFilterRegion} options={regions} />
              <div style={{ flex: 1 }} />
              <button className="btn btn-sm btn-ghost" type="button" onClick={() => setAll(filtered.map((b) => b.id), true)}>Grant filtered</button>
              <button className="btn btn-sm btn-ghost" type="button" onClick={() => setAll(filtered.map((b) => b.id), false)}>Revoke filtered</button>
            </div>
          </div>

          <div className="scroll-y" style={{ flex: 1, padding: "16px 24px 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {filtered.map((b) => {
                const on = userScope.has(b.id);
                return (
                  <button key={b.id} onClick={() => toggleBranch(b.id)} type="button"
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "12px 12px", border: "0.5px solid",
                      borderColor: on ? "transparent" : "var(--line)",
                      borderRadius: 10, cursor: "pointer", textAlign: "left",
                      background: on ? "var(--accent-soft)" : "var(--panel)",
                    }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      background: on ? "var(--accent)" : "transparent",
                      border: on ? "1px solid var(--accent)" : "1.5px solid var(--line)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff",
                    }}>
                      {on && <Icon name="check" size={11} stroke={2} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: "500 13px/1.2 var(--font-sans)", color: on ? "var(--accent-ink)" : "var(--ink)" }}>{b.name}</div>
                      <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4 }}>{b.id} · {b.region}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`access-pane ${mobilePane !== "policy" ? "hidden-mobile" : ""}`} style={{ borderLeft: "0.5px solid var(--line)", background: "var(--panel-2)",
          display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "14px 18px 8px" }}>
            <div className="eyebrow">Resulting policy</div>
            <p className="muted" style={{ font: "400 11.5px/1.5 var(--font-sans)", margin: "8px 0 0" }}>
              Live Supabase RLS that will be applied when you click <b style={{ color: "var(--ink-2)" }}>Apply changes</b>.
            </p>
          </div>

          <div className="scroll-y" style={{ flex: 1, padding: "8px 18px 18px" }}>
            <div className="mono" style={{
              padding: "12px 14px", borderRadius: 8,
              background: "var(--bg)", border: "0.5px solid var(--line)",
              font: "400 11.5px/1.65 var(--font-mono)", color: "var(--ink-2)",
              whiteSpace: "pre-wrap", wordBreak: "break-all",
            }}>
{`-- policy: read_branch_data
-- enforced by: public.authorized_branches(${u.id})
-- branches:
`}<span style={{ color: "var(--accent-ink)" }}>{Array.from(userScope).map((s) => `  ${s}`).join("\n") || "  (none — user blocked from all branch data)"}</span>
            </div>

            <AffectedTablesConfig tables={tables} onChange={saveAffectedTable} />

            <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Default deny</div>
            <p className="muted" style={{ font: "400 12px/1.55 var(--font-sans)", margin: 0 }}>
              Any branch not in the list above is invisible to {(u.full_name || u.email).split(" ")[0]}.
              Chat queries silently filter; explicit references return a blocked response.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AffectedTablesConfig({ tables, onChange }) {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);

  const filtered = useMemo(() => {
    return tables.filter((row) => {
      if (showOnlyEnabled && !row.enabled) return false;
      if (q && !row.table_name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [tables, q, showOnlyEnabled]);

  const enabledCount = tables.filter((r) => r.enabled).length;

  return (
    <>
      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{t("access.affected.title")}</span>
        <span className="mono tnum" style={{ color: "var(--accent-ink)", fontSize: 10 }}>
          {enabledCount} / {tables.length}
        </span>
      </div>
      <p className="muted" style={{ font: "400 11.5px/1.5 var(--font-sans)", margin: "0 0 10px" }}>
        {t("access.affected.hint")}
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Icon name="search" size={11} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input
            className="input"
            placeholder={t("access.affected.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ paddingLeft: 26, height: 28, font: "400 12px/1 var(--font-sans)" }}
          />
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setShowOnlyEnabled((v) => !v)}
          title={t("access.affected.col.enabled")}
          style={{ padding: "0 8px", height: 28, background: showOnlyEnabled ? "var(--accent-soft)" : "var(--panel)", color: showOnlyEnabled ? "var(--accent-ink)" : "var(--muted)" }}
        >
          <Icon name="check" size={11} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 340, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <div className="muted" style={{ font: "400 12px/1.4 var(--font-sans)", padding: 12, textAlign: "center" }}>
            {t("access.affected.empty")}
          </div>
        )}
        {filtered.map((row) => (
          <AffectedTableRow key={`${row.schema_name}.${row.table_name}`} row={row} onChange={onChange} />
        ))}
      </div>
    </>
  );
}

function AffectedTableRow({ row, onChange }) {
  const branchOptions = [];
  if (row.has_branch_ref)  branchOptions.push("branch_ref");
  if (row.has_branch_code) branchOptions.push("branch_code");
  if (row.has_store_name)  branchOptions.push("store_name");
  const hasAny = branchOptions.length > 0;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto auto",
      alignItems: "center", gap: 8, padding: "8px 10px",
      borderRadius: 6, background: "var(--bg)", border: "0.5px solid var(--line)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{
          font: "500 12px/1.2 var(--font-mono)",
          color: row.enabled ? "var(--ink)" : "var(--ink-2)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {row.schema_name}.{row.table_name}
        </div>
        <div className="mono" style={{ font: "400 10px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3 }}>
          <span className="tnum">{Number(row.row_estimate || 0).toLocaleString()}</span> rows
          {hasAny && row.enabled && (
            <>
              <span style={{ margin: "0 6px", color: "var(--line)" }}>·</span>
              <select
                value={row.branch_column || ""}
                onChange={(e) => onChange(row, { branch_column: e.target.value || null })}
                className="mono"
                style={{
                  appearance: "none", border: "0.5px solid var(--line)",
                  background: "var(--panel)", color: "var(--ink-2)",
                  font: "500 10px/1 var(--font-mono)", padding: "2px 4px",
                  borderRadius: 3, cursor: "pointer",
                }}
              >
                <option value="">—</option>
                {branchOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}
        </div>
      </div>
      <Switch value={!!row.enabled} onChange={(v) => onChange(row, { enabled: v })} size={16} />
    </div>
  );
}
