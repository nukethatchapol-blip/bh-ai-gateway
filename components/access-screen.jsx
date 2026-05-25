"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Icon, RoleBadge, Switch } from "./ui";
import { NavBar, SectionHeader, GroupCard, MToggle, roundBtn } from "./mobile-ui";
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
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
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

  // Group branches by region, preserving first-seen order.
  const regionGroups = useMemo(() => {
    const map = new Map();
    branches.forEach((b) => {
      if (!map.has(b.region)) map.set(b.region, []);
      map.get(b.region).push(b);
    });
    return Array.from(map.entries()); // [ [region, branches[]], ... ]
  }, [branches]);

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
      <>
        <NavBar title={t("nav.access")} leading={<Icon name="store" size={20} stroke={1.6} style={{ color: "var(--muted)" }} />} />
        <div style={{ padding: "0 16px", color: "var(--muted)", font: "400 14px/1.4 var(--font-sans)" }}>
          {t("access.noUsers")}
        </div>
      </>
    );
  }

  const firstName = (u.full_name || u.email).split(" ")[0];

  return (
    <>
      {/* compact nav: back + title + Save */}
      <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button type="button" onClick={() => router.back()} style={roundBtn()} aria-label="Back">
          <Icon name="chevleft" size={15} stroke={2} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{t("nav.access")}</div>
          <div style={{ font: "600 17px/1.2 var(--font-sans)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name || u.email}</div>
        </div>
        <button type="button" onClick={applyChanges} disabled={!dirty || saving} style={{
          ...roundBtn(), width: "auto", padding: "0 14px", borderRadius: 999,
          background: dirty && !saving ? "var(--ink)" : "var(--bg-2)",
          color: dirty && !saving ? "var(--panel)" : "var(--muted)",
          borderColor: dirty && !saving ? "var(--ink)" : "var(--line)",
          font: "600 12.5px/1 var(--font-sans)",
          cursor: dirty && !saving ? "pointer" : "default",
        }}>{saving ? t("access.saving") : t("common.save")}</button>
      </div>

      {/* user selector — horizontal pill list */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 16px 12px", flexShrink: 0 }}>
        {users.map((u2) => {
          const n = scope[u2.id]?.size || 0;
          const on = u2.id === selectedId;
          return (
            <button key={u2.id} type="button" onClick={() => setSelectedId(u2.id)} style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px 6px 6px", borderRadius: 999, cursor: "pointer",
              background: on ? "var(--panel)" : "transparent",
              border: `0.5px solid ${on ? "var(--line)" : "transparent"}`,
              boxShadow: on ? "var(--shadow-sm)" : "none",
            }}>
              <Avatar name={u2.full_name || u2.email} size={26} />
              <div style={{ textAlign: "left" }}>
                <div style={{ font: `${on ? 600 : 500} 12.5px/1.1 var(--font-sans)`, color: on ? "var(--ink)" : "var(--ink-2)", whiteSpace: "nowrap" }}>
                  {(u2.full_name || u2.email).split(" ")[0]}
                </div>
                <div className="mono" style={{ font: "400 9.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 2 }}>
                  {n === branches.length ? "all" : n} {n === 1 ? "branch" : "branches"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* selected-user summary card */}
      <GroupCard style={{ margin: "0 16px 14px", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={u.full_name || u.email} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ font: "600 14.5px/1.2 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name || u.email}</span>
              <RoleBadge role={u.role} />
            </div>
            <div className="mono" style={{ font: "400 11.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4 }}>{u.email}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="tnum" style={{ font: "600 22px/1 var(--font-mono)" }}>
              {userScope.size}<span style={{ color: "var(--muted)", font: "400 13px/1 var(--font-sans)" }}>/{branches.length}</span>
            </div>
            <div className="mono" style={{ font: "400 10px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>{t("access.branches")}</div>
          </div>
        </div>
      </GroupCard>

      {/* region-grouped branch toggle list */}
      {regionGroups.map(([region, regionBranches]) => {
        const ids = regionBranches.map((b) => b.id);
        const allOn = ids.every((id) => userScope.has(id));
        return (
          <React.Fragment key={region}>
            <div style={{ padding: "10px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div className="mono" style={{ font: "500 11px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>
                {region} · {regionBranches.length}
              </div>
              <button type="button" onClick={() => setAll(ids, !allOn)} style={{
                border: 0, background: "transparent", color: "var(--accent-ink)",
                font: "500 12px/1 var(--font-sans)", cursor: "pointer",
              }}>{allOn ? t("access.revokeAll") : t("access.toggleAll")}</button>
            </div>
            <GroupCard>
              {regionBranches.map((b, i) => {
                const on = userScope.has(b.id);
                return (
                  <div key={b.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderBottom: i < regionBranches.length - 1 ? "0.5px solid var(--line-2)" : "none",
                  }}>
                    <Icon name="store" size={15} stroke={1.5} style={{ color: "var(--muted)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: "500 14px/1.2 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                      <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3 }}>{b.id}</div>
                    </div>
                    <MToggle on={on} onChange={() => toggleBranch(b.id)} />
                  </div>
                );
              })}
            </GroupCard>
          </React.Fragment>
        );
      })}

      {/* affected tables config */}
      <SectionHeader>{t("access.affected.title")}</SectionHeader>
      <AffectedTablesConfig tables={tables} onChange={saveAffectedTable} />

      {/* default deny note */}
      <SectionHeader>{t("access.defaultDeny")}</SectionHeader>
      <div style={{ padding: "0 20px", font: "400 12.5px/1.55 var(--font-sans)", color: "var(--muted)" }}>
        {t("access.defaultDeny.body", { name: firstName })}
      </div>

      <div style={{ height: 16 }} />
    </>
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
    <div style={{ padding: "0 16px" }}>
      <p className="muted" style={{ font: "400 12px/1.5 var(--font-sans)", margin: "0 4px 10px" }}>
        {t("access.affected.hint")}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input
            placeholder={t("access.affected.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              width: "100%", height: 34, borderRadius: 10, border: "0.5px solid var(--line)",
              background: "var(--panel)", color: "var(--ink)", paddingLeft: 32, paddingRight: 10,
              font: "400 13px/1 var(--font-sans)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowOnlyEnabled((v) => !v)}
          title={t("access.affected.col.enabled")}
          style={{
            height: 34, padding: "0 12px", borderRadius: 10, cursor: "pointer",
            border: "0.5px solid var(--line)",
            background: showOnlyEnabled ? "var(--accent-soft)" : "var(--panel)",
            color: showOnlyEnabled ? "var(--accent-ink)" : "var(--muted)",
            display: "flex", alignItems: "center", gap: 6,
            font: "500 11px/1 var(--font-mono)",
          }}
        >
          <Icon name="check" size={12} />
          <span className="mono tnum">{enabledCount}/{tables.length}</span>
        </button>
      </div>

      <GroupCard style={{ margin: 0 }}>
        {filtered.length === 0 && (
          <div className="muted" style={{ font: "400 12.5px/1.4 var(--font-sans)", padding: 16, textAlign: "center" }}>
            {t("access.affected.empty")}
          </div>
        )}
        {filtered.map((row, i) => (
          <AffectedTableRow
            key={`${row.schema_name}.${row.table_name}`}
            row={row}
            onChange={onChange}
            last={i === filtered.length - 1}
          />
        ))}
      </GroupCard>
    </div>
  );
}

function AffectedTableRow({ row, onChange, last }) {
  const branchOptions = [];
  if (row.has_branch_ref)  branchOptions.push("branch_ref");
  if (row.has_branch_code) branchOptions.push("branch_code");
  if (row.has_store_name)  branchOptions.push("store_name");
  const hasAny = branchOptions.length > 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
      borderBottom: last ? "none" : "0.5px solid var(--line-2)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mono" style={{
          font: "500 12.5px/1.2 var(--font-mono)",
          color: row.enabled ? "var(--ink)" : "var(--ink-2)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {row.schema_name}.{row.table_name}
        </div>
        <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <span className="tnum">{Number(row.row_estimate || 0).toLocaleString()}</span> rows
          {hasAny && row.enabled && (
            <>
              <span style={{ color: "var(--line)" }}>·</span>
              <select
                value={row.branch_column || ""}
                onChange={(e) => onChange(row, { branch_column: e.target.value || null })}
                className="mono"
                style={{
                  appearance: "none", border: "0.5px solid var(--line)",
                  background: "var(--panel)", color: "var(--ink-2)",
                  font: "500 10.5px/1 var(--font-mono)", padding: "3px 6px",
                  borderRadius: 5, cursor: "pointer",
                }}
              >
                <option value="">—</option>
                {branchOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}
        </div>
      </div>
      <Switch value={!!row.enabled} onChange={(v) => onChange(row, { enabled: v })} size={18} />
    </div>
  );
}
