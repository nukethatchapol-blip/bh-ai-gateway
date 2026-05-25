"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Icon, RoleBadge, EmptyHint } from "./ui";
import { NavBar, SectionHeader, GroupCard } from "./mobile-ui";
import { useLang } from "./lang-context";

const TABS = [
  { id: "approvals", labelKey: "admin.tab.approvals" },
  { id: "users",     labelKey: "admin.tab.users" },
  { id: "skills",    labelKey: "admin.tab.skills" },
  { id: "audit",     labelKey: "admin.tab.audit" },
  { id: "quotas",    labelKey: "admin.tab.quotas" },
];

export function AdminScreen({ currentUserId, pending, users, skills, audit }) {
  const [tab, setTab] = useState("approvals");
  const { t } = useLang();

  return (
    <>
      <NavBar
        title={t("nav.admin")}
        sub={t("admin.pendingSub", { n: pending.length })}
        leading={<Icon name="shield" size={20} stroke={1.6} style={{ color: "var(--muted)" }} />}
        trailing={<RoleBadge role="admin" />}
      />

      {/* segmented control */}
      <div style={{ padding: "4px 16px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", padding: 3, background: "var(--bg-2)", borderRadius: 10, gap: 3, overflowX: "auto" }}>
          {TABS.map((tb) => {
            const active = tab === tb.id;
            return (
              <button key={tb.id} type="button" onClick={() => setTab(tb.id)} style={{
                flex: "1 0 auto", textAlign: "center", padding: "6px 10px", borderRadius: 7,
                appearance: "none", border: 0, cursor: "pointer", whiteSpace: "nowrap",
                font: `${active ? 600 : 500} 12.5px/1 var(--font-sans)`,
                background: active ? "var(--panel)" : "transparent",
                color: active ? "var(--ink)" : "var(--muted)",
                boxShadow: active ? "0 1px 2px rgba(0,0,0,.05)" : "none",
              }}>{t(tb.labelKey)}</button>
            );
          })}
        </div>
      </div>

      {tab === "approvals" && <ApprovalsTab pending={pending} />}
      {tab === "users" && <UsersTab users={users} currentUserId={currentUserId} />}
      {tab === "skills" && <SkillsTab skills={skills} />}
      {tab === "audit" && <AuditTab audit={audit} />}
      {tab === "quotas" && <QuotasTab users={users} />}
    </>
  );
}

function ApprovalsTab({ pending }) {
  const [resolved, setResolved] = useState({});
  const remaining = pending.filter((u) => !resolved[u.id]);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { t } = useLang();

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
    <div style={{ padding: "0 16px" }}>
      {remaining.length === 0 && (
        <GroupCard style={{ margin: 0 }}>
          <EmptyHint icon="check" title={t("admin.allCaughtUp")} hint={t("admin.noPending")} />
        </GroupCard>
      )}

      {remaining.map((p) => (
        <div key={p.id} style={{
          background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 14,
          padding: 14, marginBottom: 10,
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Avatar name={p.full_name || p.email} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ font: "600 14.5px/1.2 var(--font-sans)" }}>{p.full_name || p.email}</span>
                <span className="badge badge-warn"><span className="dot" /> {t("admin.pending")}</span>
              </div>
              <div className="mono" style={{ font: "400 11.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 5 }}>
                {p.email}
              </div>
              <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted-2)", marginTop: 4 }}>
                {p.created_at?.slice(0, 16).replace("T", " ")}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 10, padding: "9px 11px", borderRadius: 9, background: "var(--bg-2)",
            font: "400 12.5px/1.5 var(--font-sans)", color: "var(--ink-2)",
          }}>
            <div className="mono" style={{ font: "500 10px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>
              {t("admin.requested")}
            </div>
            {(p.requested_role || "staff").toUpperCase()}{p.requested_branch ? ` · ${p.requested_branch}` : ""}
          </div>

          {p.request_note && (
            <div style={{ font: "400 12.5px/1.5 var(--font-sans)", color: "var(--muted)", marginTop: 8 }}>
              &quot;{p.request_note}&quot;
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => decide(p.id, "approve")} style={{
              flex: 1, appearance: "none", border: 0, height: 38, borderRadius: 10,
              background: "var(--accent)", color: "#fff", font: "600 13.5px/1 var(--font-sans)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer",
            }}>
              <Icon name="check" size={14} stroke={2} />
              {t("admin.approve")}
            </button>
            <button type="button" onClick={() => decide(p.id, "deny")} style={{
              flex: 1, appearance: "none", border: "0.5px solid var(--line)", height: 38, borderRadius: 10,
              background: "var(--panel)", color: "var(--ink-2)", font: "500 13.5px/1 var(--font-sans)", cursor: "pointer",
            }}>{t("admin.deny")}</button>
          </div>
        </div>
      ))}

      <div style={{
        marginTop: 4, padding: "12px 14px", borderRadius: 12,
        background: "var(--bg-2)", border: "0.5px dashed var(--line)",
        font: "400 12px/1.5 var(--font-sans)", color: "var(--muted)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Icon name="shield" size={13} />
        {t("admin.notify")}
      </div>
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
      style={{ height: 28, width: 110, padding: "0 8px", font: "500 12px/1 var(--font-sans)", textTransform: "capitalize" }}
    >
      <option value="staff">Staff</option>
      <option value="manager">Manager</option>
      <option value="admin">Admin</option>
    </select>
  );
}

function UsersTab({ users, currentUserId }) {
  const [q, setQ] = useState("");
  const { t } = useLang();
  const filtered = users.filter((u) =>
    !q || u.full_name?.toLowerCase().includes(q.toLowerCase()) ||
    u.email.toLowerCase().includes(q.toLowerCase()) ||
    u.role?.includes(q.toLowerCase())
  );
  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Icon name="search" size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.searchUsers")}
          style={{
            width: "100%", height: 38, borderRadius: 10, border: "0.5px solid var(--line)",
            background: "var(--panel)", color: "var(--ink)", paddingLeft: 36, paddingRight: 12,
            font: "400 14px/1 var(--font-sans)",
          }}
        />
      </div>

      <GroupCard style={{ margin: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", font: "400 13px/1.4 var(--font-sans)", minWidth: 640 }}>
          <thead>
            <tr>
              {[t("admin.col.user"), t("admin.col.role"), t("admin.col.scope"), t("admin.col.lastSeen"), t("admin.col.status")].map((h) => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 14px",
                  font: "500 10.5px/1 var(--font-mono)", letterSpacing: ".06em", textTransform: "uppercase",
                  color: "var(--muted)", borderBottom: "0.5px solid var(--line)", whiteSpace: "nowrap",
                  background: "var(--bg-2)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? "0.5px solid var(--line-2)" : "none" }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={u.full_name || u.email} size={28} />
                    <div>
                      <div style={{ font: "500 13px/1.2 var(--font-sans)", whiteSpace: "nowrap" }}>{u.full_name || u.email}</div>
                      <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted)", marginTop: 2 }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 14px" }}><RoleSelect user={u} currentUserId={currentUserId} /></td>
                <td style={{ padding: "12px 14px" }}>
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
                <td style={{ padding: "12px 14px", color: "var(--muted)", font: "400 12.5px/1 var(--font-sans)", whiteSpace: "nowrap" }}>
                  {u.last_seen_at ? new Date(u.last_seen_at).toLocaleString() : "—"}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span className="badge badge-accent"><span className="dot" /> {u.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GroupCard>
    </div>
  );
}

function SkillsTab({ skills }) {
  const [active, setActive] = useState(skills[0]?.id);
  const { t } = useLang();
  const s = skills.find((x) => x.id === active);
  if (!s) return (
    <div style={{ padding: "0 16px" }}>
      <GroupCard style={{ margin: 0 }}>
        <EmptyHint title={t("admin.noSkills")} hint={t("admin.noSkills.hint")} />
      </GroupCard>
    </div>
  );
  return (
    <div style={{ padding: "0 16px" }}>
      {/* skill picker */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {skills.map((sk) => {
          const on = sk.id === active;
          return (
            <button key={sk.id} type="button" onClick={() => setActive(sk.id)} style={{
              padding: "6px 12px", borderRadius: 999, cursor: "pointer",
              font: `${on ? 600 : 500} 12.5px/1 var(--font-sans)`,
              background: on ? "var(--accent)" : "var(--panel)",
              color: on ? "#fff" : "var(--ink-2)",
              border: on ? "0.5px solid transparent" : "0.5px solid var(--line)",
            }}>{sk.name}</button>
          );
        })}
      </div>

      <GroupCard style={{ margin: 0, padding: 16 }}>
        <div style={{ font: "600 16px/1.2 var(--font-sans)" }}>{s.name}</div>
        <p className="muted" style={{ font: "400 13px/1.5 var(--font-sans)", margin: "6px 0 0" }}>{s.description}</p>

        <div style={{ marginTop: 16 }}>
          <SkillField label={t("admin.skill.id")}>
            <div className="mono" style={{ font: "400 12.5px/1.4 var(--font-mono)", color: "var(--ink-2)", padding: "8px 10px", borderRadius: 8, background: "var(--bg-2)", border: "0.5px solid var(--line)" }}>{s.id}</div>
          </SkillField>
        </div>
        <div style={{ marginTop: 12 }}>
          <SkillField label={t("admin.skill.visible")}>
            <div style={{ font: "400 13px/1.4 var(--font-sans)", color: "var(--ink-2)", padding: "8px 10px", borderRadius: 8, background: "var(--bg-2)", border: "0.5px solid var(--line)" }}>{s.visible_to || "everyone"}</div>
          </SkillField>
        </div>
        <div style={{ marginTop: 12 }}>
          <SkillField label={t("admin.skill.prompt")}>
            <div style={{ font: "400 12.5px/1.55 var(--font-sans)", color: "var(--ink-2)", padding: "10px 12px", borderRadius: 8, background: "var(--bg-2)", border: "0.5px solid var(--line)", whiteSpace: "pre-wrap" }}>{s.system_prompt}</div>
          </SkillField>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ font: "500 12px/1 var(--font-sans)", color: "var(--ink-2)", marginBottom: 8 }}>{t("admin.skill.tools")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(s.tools || []).map((tool) => (
              <span key={tool} className="mono" style={{
                font: "500 11px/1 var(--font-mono)", padding: "5px 9px", borderRadius: 6,
                background: "var(--accent-soft)", color: "var(--accent-ink)",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <Icon name="check" size={10} /> {tool}
              </span>
            ))}
          </div>
        </div>
      </GroupCard>
    </div>
  );
}

function SkillField({ label, children }) {
  return (
    <div>
      <div style={{ font: "500 11px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function AuditTab({ audit }) {
  const fmt = (t) => t ? new Date(t).toLocaleString() : "—";
  const { t } = useLang();
  return (
    <div style={{ padding: "0 16px" }}>
      <GroupCard style={{ margin: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", font: "400 12.5px/1.4 var(--font-sans)", minWidth: 680 }}>
          <thead>
            <tr>
              {[t("admin.col.time"), t("admin.col.user"), t("admin.col.action"), t("admin.col.scope"), t("admin.col.model"), t("admin.col.tokens"), t("admin.col.status")].map((h, i) => (
                <th key={h} style={{
                  textAlign: i >= 5 ? "right" : "left", padding: "10px 14px",
                  font: "500 10.5px/1 var(--font-mono)", letterSpacing: ".06em", textTransform: "uppercase",
                  color: "var(--muted)", borderBottom: "0.5px solid var(--line)", whiteSpace: "nowrap",
                  background: "var(--bg-2)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="mono tnum" style={{ font: "400 12px/1.4 var(--font-mono)" }}>
            {audit.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: i < audit.length - 1 ? "0.5px solid var(--line-2)" : "none" }}>
                <td style={{ padding: "10px 14px", color: "var(--muted)", whiteSpace: "nowrap" }}>{fmt(e.created_at)}</td>
                <td style={{ padding: "10px 14px", color: "var(--ink)" }}>{e.user_id?.slice(0, 6) || "—"}</td>
                <td style={{ padding: "10px 14px", color: e.status === "denied" ? "oklch(0.55 0.18 25)" : "var(--ink-2)" }}>{e.action}</td>
                <td style={{ padding: "10px 14px", color: "var(--ink-2)" }}>{e.scope}</td>
                <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{e.model || "—"}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--ink-2)" }}>{e.tokens?.toLocaleString() || "—"}</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                  <span className={e.status === "denied" ? "badge badge-red" : "badge badge-accent"} style={{ height: 18, fontSize: 10 }}>
                    <span className="dot" /> {e.status}
                  </span>
                </td>
              </tr>
            ))}
            {audit.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>{t("admin.noEvents")}</td></tr>
            )}
          </tbody>
        </table>
      </GroupCard>
    </div>
  );
}

function QuotasTab({ users }) {
  const { t } = useLang();
  return (
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {users.slice(0, 8).map((u) => {
        const used = Math.abs(((u.id || "").charCodeAt(2) * 7919) % 100);
        return (
          <div key={u.id} style={{
            background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 14, padding: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={u.full_name || u.email} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "500 14px/1.2 var(--font-sans)" }}>{u.full_name || u.email}</div>
                <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3 }}>{u.email}</div>
              </div>
              <RoleBadge role={u.role} />
            </div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <QuotaBar label={t("admin.quota.tokens")} used={used * 24000} cap={u.monthly_token_cap || 2_000_000} unit="" />
              <QuotaBar label={t("admin.quota.spend")} used={Number((used * 1.4).toFixed(2))} cap={u.monthly_spend_cap_usd || 50} unit="$" />
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
      </div>
      <div className="mono tnum" style={{ font: "500 11px/1 var(--font-mono)", color: danger ? "oklch(0.55 0.18 25)" : warn ? "oklch(0.55 0.18 70)" : "var(--ink-2)", marginBottom: 6 }}>
        {unit}{used.toLocaleString()} <span style={{ color: "var(--muted)" }}>/ {unit}{cap.toLocaleString()}</span>
      </div>
      <div style={{ height: 5, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%",
          background: danger ? "oklch(0.55 0.18 25)" : warn ? "oklch(0.65 0.16 70)" : "var(--accent)" }} />
      </div>
    </div>
  );
}
