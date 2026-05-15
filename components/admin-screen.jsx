"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Icon, RoleBadge, Segmented, Tabs, EmptyHint, Field } from "./ui";
import { PageHeader } from "./shell";

export function AdminScreen({ currentUserId, pending, users, skills, audit }) {
  const [tab, setTab] = useState("approvals");
  return (
    <div className="pageframe">
      <PageHeader title="Admin console" crumb="/ admin">
        <span className="badge badge-accent"><Icon name="shield" size={11} /> admin</span>
        <button className="btn btn-sm" type="button"><Icon name="download" size={13} /> Audit CSV</button>
      </PageHeader>

      <div style={{ padding: "0 28px", borderBottom: "0.5px solid var(--line)", background: "var(--bg)" }}>
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: "approvals", label: "Approvals", count: pending.length },
          { id: "users",     label: "Users",     count: users.length },
          { id: "skills",    label: "Skills",    count: skills.length },
          { id: "audit",     label: "Audit log" },
          { id: "quotas",    label: "Quotas" },
        ]} />
      </div>

      <div className="page-body scroll-y">
        <div style={{ padding: "20px 28px 40px", maxWidth: 1400, margin: "0 auto" }}>
          {tab === "approvals" && <ApprovalsTab pending={pending} />}
          {tab === "users" && <UsersTab users={users} currentUserId={currentUserId} />}
          {tab === "skills" && <SkillsTab skills={skills} />}
          {tab === "audit" && <AuditTab audit={audit} />}
          {tab === "quotas" && <QuotasTab users={users} />}
        </div>
      </div>
    </div>
  );
}

function ApprovalsTab({ pending }) {
  const [resolved, setResolved] = useState({});
  const remaining = pending.filter((u) => !resolved[u.id]);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function decide(profileId, decision) {
    const r = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId, decision }),
    });
    if (r.ok) {
      setResolved((s) => ({ ...s, [profileId]: decision }));
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="approvals-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 className="h-2">Pending access requests</h2>
          <span className="mono muted" style={{ font: "400 11.5px/1 var(--font-mono)" }}>
            {remaining.length} pending · {Object.keys(resolved).length} resolved
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {remaining.length === 0 && (
            <EmptyHint icon="check" title="All caught up" hint="No pending registration requests right now." />
          )}
          {remaining.map((p) => (
            <div key={p.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <Avatar name={p.full_name || p.email} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ font: "600 14px/1.2 var(--font-sans)" }}>{p.full_name || p.email}</span>
                    <span className="badge badge-warn"><span className="dot" /> pending</span>
                  </div>
                  <div className="mono" style={{ font: "400 11.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4 }}>
                    {p.email}<span style={{ margin: "0 6px" }}>·</span>requested {p.created_at?.slice(0, 16).replace("T"," ")}
                  </div>
                  <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 6, background: "var(--bg-2)",
                    font: "400 12.5px/1.5 var(--font-sans)", color: "var(--ink-2)" }}>
                    <div className="mono" style={{ font: "500 10.5px/1 var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Requested scope</div>
                    {(p.requested_role || "staff").toUpperCase()}{p.requested_branch ? ` · ${p.requested_branch}` : ""}
                  </div>
                  {p.request_note && (
                    <p style={{ font: "400 12.5px/1.5 var(--font-sans)", color: "var(--muted)", margin: "10px 0 0" }}>
                      "{p.request_note}"
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-sm btn-accent" type="button" onClick={() => decide(p.id, "approve")}>
                    <Icon name="check" size={12} /> Approve
                  </button>
                  <button className="btn btn-sm" type="button" onClick={() => decide(p.id, "deny")}>Deny</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Default new-user policy</div>
          <PolicyRow label="Default role" value="Staff" />
          <PolicyRow label="Default model" value="claude-4.5-s" mono />
          <PolicyRow label="Default skill" value="Data Analyst" />
          <PolicyRow label="Token cap (monthly)" value="2,000,000" mono />
          <PolicyRow label="Branch scope" value="Single branch only" />
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>SLA</div>
          <div style={{ font: "400 12px/1.55 var(--font-sans)", color: "var(--muted)" }}>
            Respond within 1 business day. Approvals auto-grant the requested scope.
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--line-2)" }}>
      <span style={{ font: "400 12.5px/1 var(--font-sans)", color: "var(--muted)" }}>{label}</span>
      <span className={mono ? "mono" : ""} style={{ font: `500 12.5px/1 var(--${mono ? "font-mono" : "font-sans"})`, color: "var(--ink)" }}>
        {value}
      </span>
    </div>
  );
}

function RoleSelect({ user, currentUserId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // An admin can't change their own role (prevents self-lockout).
  if (user.id === currentUserId) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <RoleBadge role={user.role} />
        <span className="mono" style={{ font: "400 9.5px/1 var(--font-mono)", color: "var(--muted-2)" }}>you</span>
      </span>
    );
  }

  async function change(role) {
    if (role === user.role) return;
    setBusy(true);
    const r = await fetch("/api/admin/role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId: user.id, role }),
    });
    setBusy(false);
    if (r.ok) router.refresh();
    else alert((await r.json().catch(() => ({}))).error || "Role update failed");
  }

  return (
    <select
      className="input"
      value={user.role}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      aria-label={`Role for ${user.full_name || user.email}`}
      style={{ height: 28, width: 116, padding: "0 8px", font: "500 12px/1 var(--font-sans)", textTransform: "capitalize" }}
    >
      <option value="staff">Staff</option>
      <option value="manager">Manager</option>
      <option value="admin">Admin</option>
    </select>
  );
}

function UsersTab({ users, currentUserId }) {
  const [q, setQ] = useState("");
  const filtered = users.filter((u) =>
    !q || u.full_name?.toLowerCase().includes(q.toLowerCase()) ||
    u.email.toLowerCase().includes(q.toLowerCase()) ||
    u.role?.includes(q.toLowerCase())
  );
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <Icon name="search" size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input className="input" placeholder="Search by name, email, role…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm" type="button"><Icon name="filter" size={13} /> Filter</button>
        </div>
      </div>

      <div className="card admin-tab-table" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", font: "400 13px/1.4 var(--font-sans)", minWidth: 700 }}>
          <thead>
            <tr>
              {["User", "Role", "Branch scope", "Last seen", "Status"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 16px",
                  font: "500 10.5px/1 var(--font-mono)", letterSpacing: ".06em", textTransform: "uppercase",
                  color: "var(--muted)", borderBottom: "0.5px solid var(--line)",
                  background: "var(--panel-2)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? "0.5px solid var(--line-2)" : "none" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={u.full_name || u.email} size={28} />
                    <div>
                      <div style={{ font: "500 13px/1.2 var(--font-sans)" }}>{u.full_name || u.email}</div>
                      <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted)", marginTop: 2 }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}><RoleSelect user={u} currentUserId={currentUserId} /></td>
                <td style={{ padding: "12px 16px" }}>
                  {u.branches === "ALL"
                    ? <span style={{ font: "500 12.5px/1 var(--font-sans)" }}>All branches</span>
                    : (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(u.branches || []).slice(0, 3).map((b) => (
                          <span key={b} className="mono" style={{
                            font: "500 10.5px/1 var(--font-mono)", padding: "3px 6px",
                            background: "var(--bg-2)", border: "0.5px solid var(--line)", borderRadius: 4,
                          }}>{b}</span>
                        ))}
                        {(u.branches || []).length > 3 && (
                          <span className="mono muted" style={{ font: "400 10.5px/1 var(--font-mono)", alignSelf: "center" }}>
                            +{u.branches.length - 3}
                          </span>
                        )}
                        {(u.branches || []).length === 0 && <span className="muted" style={{ font: "400 12px/1 var(--font-sans)" }}>—</span>}
                      </div>
                    )
                  }
                </td>
                <td style={{ padding: "12px 16px", color: "var(--muted)", font: "400 12.5px/1 var(--font-sans)" }}>
                  {u.last_seen_at ? new Date(u.last_seen_at).toLocaleString() : "—"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span className="badge badge-accent"><span className="dot" /> {u.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkillsTab({ skills }) {
  const [active, setActive] = useState(skills[0]?.id);
  const s = skills.find((x) => x.id === active);
  if (!s) return <EmptyHint title="No skills defined" hint="Create a skill via SQL or extend this UI to call /api/admin/skills." />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>
      <div className="card">
        <div style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="eyebrow">Skills</span>
        </div>
        {skills.map((sk) => (
          <button key={sk.id} onClick={() => setActive(sk.id)} type="button"
            style={{
              width: "100%", display: "block", textAlign: "left",
              padding: "12px 14px", border: 0,
              background: sk.id === active ? "var(--bg-2)" : "transparent",
              borderLeft: `2px solid ${sk.id === active ? "var(--accent)" : "transparent"}`,
              cursor: "pointer",
            }}>
            <div style={{ font: "500 13px/1.2 var(--font-sans)" }}>{sk.name}</div>
            <div className="mono" style={{ font: "400 10.5px/1.3 var(--font-mono)", color: "var(--muted)", marginTop: 4 }}>{sk.id}</div>
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 className="h-2">{s.name}</h3>
            <p className="muted" style={{ font: "400 13px/1.5 var(--font-sans)", margin: "4px 0 0", maxWidth: 540 }}>{s.description}</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
          <Field label="ID"><input className="input mono" value={s.id} readOnly /></Field>
          <Field label="Visible to">
            <input className="input" value={s.visible_to || "everyone"} readOnly />
          </Field>
        </div>
        <div style={{ marginTop: 16 }}>
          <Field label="System prompt" hint="Inserted at the top of every conversation using this skill.">
            <textarea className="input" rows={6} defaultValue={s.system_prompt} readOnly />
          </Field>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ font: "500 12px/1 var(--font-sans)", color: "var(--ink-2)", marginBottom: 8 }}>Tool access</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(s.tools || []).map((t) => (
              <span key={t} className="mono" style={{
                font: "500 11px/1 var(--font-mono)", padding: "5px 9px", borderRadius: 6,
                background: "var(--accent-soft)", color: "var(--accent-ink)",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <Icon name="check" size={10} /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditTab({ audit }) {
  const fmt = (t) => t ? new Date(t).toLocaleTimeString() : "—";
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="input" placeholder="Filter events…" style={{ maxWidth: 280 }} />
        <Segmented value="today" onChange={() => {}} options={[
          { value: "today", label: "Today" }, { value: "wk", label: "7d" }, { value: "mo", label: "30d" }, { value: "all", label: "All" }
        ]} />
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" type="button"><Icon name="download" size={12} /> Export</button>
      </div>
      <div className="card admin-tab-table" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", font: "400 12.5px/1.4 var(--font-sans)", minWidth: 720 }}>
          <thead>
            <tr>
              {["Time", "User", "Action", "Scope", "Model", "Tokens", "Status"].map((h, i) => (
                <th key={h} style={{
                  textAlign: i >= 5 ? "right" : "left", padding: "10px 16px",
                  font: "500 10.5px/1 var(--font-mono)", letterSpacing: ".06em", textTransform: "uppercase",
                  color: "var(--muted)", borderBottom: "0.5px solid var(--line)",
                  background: "var(--panel-2)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="mono tnum" style={{ font: "400 12px/1.4 var(--font-mono)" }}>
            {audit.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: i < audit.length - 1 ? "0.5px solid var(--line-2)" : "none" }}>
                <td style={{ padding: "10px 16px", color: "var(--muted)" }}>{fmt(e.created_at)}</td>
                <td style={{ padding: "10px 16px", color: "var(--ink)" }}>{e.user_id?.slice(0, 6) || "—"}</td>
                <td style={{ padding: "10px 16px", color: e.status === "denied" ? "oklch(0.55 0.18 25)" : "var(--ink-2)" }}>{e.action}</td>
                <td style={{ padding: "10px 16px", color: "var(--ink-2)" }}>{e.scope}</td>
                <td style={{ padding: "10px 16px", color: "var(--muted)" }}>{e.model || "—"}</td>
                <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--ink-2)" }}>{e.tokens?.toLocaleString() || "—"}</td>
                <td style={{ padding: "10px 16px", textAlign: "right" }}>
                  <span className={e.status === "denied" ? "badge badge-red" : "badge badge-accent"} style={{ height: 18, fontSize: 10 }}>
                    <span className="dot" /> {e.status}
                  </span>
                </td>
              </tr>
            ))}
            {audit.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>No events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotasTab({ users }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {users.slice(0, 8).map((u) => {
        const used = Math.abs(((u.id || "").charCodeAt(2) * 7919) % 100);
        return (
          <div key={u.id} className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={u.full_name || u.email} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "500 14px/1.2 var(--font-sans)" }}>{u.full_name || u.email}</div>
                <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3 }}>{u.email}</div>
              </div>
              <RoleBadge role={u.role} />
            </div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <QuotaBar label="Tokens" used={used * 24000} cap={u.monthly_token_cap || 2_000_000} unit="" />
              <QuotaBar label="Spend" used={Number((used * 1.4).toFixed(2))} cap={u.monthly_spend_cap_usd || 50} unit="$" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuotaBar({ label, used, cap, unit }) {
  const pct = Math.min(100, (used / cap) * 100);
  const warn = pct > 80;
  const danger = pct > 95;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</span>
        <span className="mono tnum" style={{ font: "500 11px/1 var(--font-mono)", color: danger ? "oklch(0.55 0.18 25)" : warn ? "oklch(0.55 0.18 70)" : "var(--ink-2)" }}>
          {unit}{used.toLocaleString()} <span style={{ color: "var(--muted)" }}>/ {unit}{cap.toLocaleString()}</span>
        </span>
      </div>
      <div style={{ height: 5, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%",
          background: danger ? "oklch(0.55 0.18 25)" : warn ? "oklch(0.65 0.16 70)" : "var(--accent)" }} />
      </div>
    </div>
  );
}
