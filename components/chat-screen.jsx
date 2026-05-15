"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MODELS, modelById } from "@/lib/models";
import {
  Avatar, BarMini, Field, Icon, Modal, Segmented, prettySize,
} from "./ui";
import { PageHeader } from "./shell";

export function ChatScreen({ profile, skills, branches, authorizedIds }) {
  const [skillId, setSkillId] = useState(skills[0]?.id || "data-analyst");
  const [modelId, setModelId] = useState("claude-4.5-s");
  const [branchScope, setBranchScope] = useState("ALL");
  const [draft, setDraft] = useState("");
  const [attached, setAttached] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showSkillPick, setShowSkillPick] = useState(false);
  const [showModelPick, setShowModelPick] = useState(false);
  const [showBranchPick, setShowBranchPick] = useState(false);
  const [pending, setPending] = useState(false);
  const [chatId, setChatId] = useState(null);

  const skill = skills.find((s) => s.id === skillId) || skills[0];
  const model = modelById(modelId) || MODELS[0];
  const scopedBranch = branchScope === "ALL" ? null : branches.find((b) => b.id === branchScope);
  const composerRef = useRef(null);

  async function send() {
    if (!draft.trim() && !attached.length) return;
    const text = draft;
    const files = attached;
    const userMsg = { id: "u-" + Date.now(), role: "user", text, files, ts: "now" };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setAttached([]);
    setPending(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId,
          skillId: skill.id,
          modelId: model.id,
          branchScope,
          message: text,
          files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
          history: messages.slice(-10).map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text || m.blocks?.map((b) => b.text).join("\n") || "",
          })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "chat failed");
      if (data.chatId) setChatId(data.chatId);
      setMessages((m) => [...m, {
        id: "a-" + Date.now(),
        role: data.blocked ? "blocked" : "assistant",
        model: model.label,
        ts: "now",
        text: data.text,
        blocks: data.blocks,
      }]);
    } catch (e) {
      setMessages((m) => [...m, {
        id: "e-" + Date.now(),
        role: "blocked",
        text: e.message || "Request failed",
      }]);
    } finally {
      setPending(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files || []).slice(0, 5);
    setAttached((a) => [...a, ...files.map((f) => ({ name: f.name, size: f.size, type: f.type || "file" }))]);
  }

  return (
    <div className="pageframe">
      <PageHeader title="New chat" crumb="/ chat">
        <BranchScopePill scope={branchScope} count={authorizedIds.length}
          branch={scopedBranch} onOpen={() => setShowBranchPick(true)} />
        <button className="btn btn-sm btn-ghost" type="button">
          <Icon name="upload" size={13} /> Share
        </button>
        <button className="btn btn-sm btn-primary" type="button"
          onClick={() => { setMessages([]); setChatId(null); }}>
          <Icon name="plus" size={13} /> New chat
        </button>
      </PageHeader>

      <div className="page-body scroll-y" style={{ position: "relative" }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}>

        {dragging && (
          <div style={{
            position: "absolute", inset: 16, zIndex: 50,
            background: "var(--accent-soft)", border: "2px dashed var(--accent)",
            borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent-ink)", font: "500 18px/1.3 var(--font-sans)",
            pointerEvents: "none",
          }}>
            <div style={{ textAlign: "center" }}>
              <Icon name="paperclip" size={32} stroke={1.25} />
              <div style={{ marginTop: 8 }}>Drop files to attach</div>
              <div className="mono" style={{ font: "400 12px/1 var(--font-mono)", color: "var(--accent-ink)", opacity: 0.7, marginTop: 4 }}>PDF · CSV · XLSX · PNG · JPG · TXT</div>
            </div>
          </div>
        )}

        <div className="chat-thread" style={{ maxWidth: 760, margin: "0 auto", padding: "24px 32px 200px" }}>
          {messages.length === 0 && (
            <EmptyChat skill={skill} scope={scopedBranch} />
          )}
          {messages.map((m) => (
            <Message key={m.id} m={m} skill={skill} user={profile} />
          ))}
          {pending && (
            <div style={{ padding: "14px 0", display: "flex", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: "var(--accent-soft)" }} />
              <div className="mono muted" style={{ font: "400 12px/1 var(--font-mono)", alignSelf: "center" }}>thinking…</div>
            </div>
          )}
        </div>
      </div>

      <div className="chat-composer-wrap" style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        padding: "0 32px 24px", pointerEvents: "none",
      }}>
        <div ref={composerRef} style={{
          maxWidth: 760, margin: "0 auto", pointerEvents: "auto",
          background: "var(--panel)", border: "0.5px solid var(--line)",
          borderRadius: 16, boxShadow: "var(--shadow-lg)",
        }}>
          {attached.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 12px 0" }}>
              {attached.map((f, i) => (
                <div key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "6px 10px 6px 8px", borderRadius: 8,
                  background: "var(--bg-2)", border: "0.5px solid var(--line)",
                  font: "500 12px/1 var(--font-sans)",
                }}>
                  <Icon name="doc" size={13} style={{ color: "var(--muted)" }} />
                  <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span className="mono muted" style={{ font: "400 10.5px/1 var(--font-mono)" }}>{prettySize(f.size)}</span>
                  <button onClick={() => setAttached((a) => a.filter((_, j) => j !== i))} type="button"
                    className="btn btn-ghost btn-icon" style={{ width: 18, height: 18, padding: 0 }}>
                    <Icon name="close" size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Ask the ${skill?.name?.toLowerCase() || "assistant"} about ${scopedBranch ? scopedBranch.name : "your branches"}…`}
            rows={2}
            style={{
              width: "100%", border: 0, outline: 0, background: "transparent",
              padding: "16px 16px 8px", color: "var(--ink)", resize: "none",
              font: "400 14.5px/1.55 var(--font-sans)", fontFamily: "var(--font-sans)",
            }}
          />

          <div className="chat-toolbar" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 10px" }}>
            <FileAttachButton onPick={(files) =>
              setAttached((a) => [
                ...a,
                ...files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
              ])
            } />

            <ChatPicker open={showSkillPick} onOpenChange={setShowSkillPick}
              trigger={
                <button className="btn btn-sm" type="button" onClick={() => setShowSkillPick((v) => !v)}>
                  <Icon name="sparkles" size={13} style={{ color: "var(--accent)" }} />
                  <span className="chat-picker-label">{skill?.name || "Skill"}</span>
                  <Icon name="chevdown" size={11} style={{ color: "var(--muted)" }} />
                </button>
              }>
              <SkillList skills={skills} value={skillId} onChange={(v) => { setSkillId(v); setShowSkillPick(false); }} />
            </ChatPicker>

            <ChatPicker open={showModelPick} onOpenChange={setShowModelPick}
              trigger={
                <button className="btn btn-sm" type="button" onClick={() => setShowModelPick((v) => !v)}>
                  <span className="mono" style={{ font: "500 11px/1 var(--font-mono)", color: "var(--muted)" }}>{(model.provider || "").slice(0, 4).toUpperCase()}</span>
                  <span className="chat-picker-label">{model.label}</span>
                  <Icon name="chevdown" size={11} style={{ color: "var(--muted)" }} />
                </button>
              }>
              <ModelList value={modelId} onChange={(v) => { setModelId(v); setShowModelPick(false); }} />
            </ChatPicker>

            <div style={{ flex: 1 }} />
            <span className="mono muted chat-kbd-hint" style={{ font: "400 11px/1 var(--font-mono)", marginRight: 4 }}>
              <span className="kbd">⌘</span> <span className="kbd">↵</span>
            </span>
            <button onClick={send} type="button" className="btn btn-icon btn-primary btn-sm"
              style={{ width: 30, height: 30, borderRadius: 8, opacity: draft.trim() || attached.length ? 1 : 0.4 }}>
              <Icon name="send" size={13} />
            </button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <span className="mono muted" style={{ font: "400 11px/1 var(--font-mono)" }}>
            Your scope: <span style={{ color: "var(--ink-2)" }}>{scopedBranch ? scopedBranch.name : `${authorizedIds.length} branches`}</span>
            <span style={{ margin: "0 8px", color: "var(--line)" }}>·</span>
            Row-level policy enforced on every query
          </span>
        </div>
      </div>

      {showBranchPick && (
        <BranchPickerModal
          branches={branches.filter((b) => authorizedIds.includes(b.id))}
          value={branchScope}
          onClose={() => setShowBranchPick(false)}
          onChange={(v) => { setBranchScope(v); setShowBranchPick(false); }}
          authCount={authorizedIds.length}
        />
      )}
    </div>
  );
}

function FileAttachButton({ onPick }) {
  const ref = useRef(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onPick(files);
          e.target.value = "";
        }}
      />
      <button className="btn btn-sm btn-ghost" type="button" onClick={() => ref.current?.click()}>
        <Icon name="paperclip" size={13} style={{ color: "var(--muted)" }} />
        <span className="chat-attach-label">Attach</span>
      </button>
    </>
  );
}

function BranchScopePill({ scope, branch, count, onOpen }) {
  const label = scope === "ALL" ? `All scope (${count})` : branch ? branch.name : "Select scope";
  return (
    <button className="btn btn-sm" type="button" onClick={onOpen}
      style={{ background: "var(--accent-soft)", color: "var(--accent-ink)", borderColor: "transparent" }}>
      <Icon name="store" size={13} />
      <span>{label}</span>
      <Icon name="chevdown" size={11} />
    </button>
  );
}

function ChatPicker({ open, onOpenChange, trigger, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) onOpenChange(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onOpenChange]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      {trigger}
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0,
          width: 320, maxHeight: 340, overflow: "auto",
          background: "var(--panel)", border: "0.5px solid var(--line)",
          borderRadius: 12, boxShadow: "var(--shadow-lg)", zIndex: 80, padding: 6,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function SkillList({ skills, value, onChange }) {
  return (
    <>
      <div className="eyebrow" style={{ padding: "8px 10px 4px" }}>Skills · system prompts</div>
      {skills.map((s) => {
        const active = s.id === value;
        return (
          <button key={s.id} onClick={() => onChange(s.id)} type="button"
            style={{
              width: "100%", display: "block", textAlign: "left",
              padding: "10px 10px", borderRadius: 8, border: 0,
              background: active ? "var(--accent-soft)" : "transparent",
              cursor: "pointer",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="sparkles" size={13} style={{ color: active ? "var(--accent-ink)" : "var(--muted)" }} />
              <span style={{ font: "500 13px/1 var(--font-sans)", color: active ? "var(--accent-ink)" : "var(--ink)" }}>{s.name}</span>
              {active && <Icon name="check" size={13} style={{ marginLeft: "auto", color: "var(--accent-ink)" }} />}
            </div>
            <div style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--muted)", marginTop: 4 }}>{s.description}</div>
            {s.tools?.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {s.tools.map((t) => (
                  <span key={t} className="mono" style={{
                    font: "400 10px/1 var(--font-mono)", color: "var(--muted)",
                    padding: "2px 5px", border: "0.5px solid var(--line)", borderRadius: 4,
                  }}>{t}</span>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </>
  );
}

function ModelList({ value, onChange }) {
  return (
    <>
      <div className="eyebrow" style={{ padding: "8px 10px 4px" }}>Model</div>
      {MODELS.map((m) => {
        const active = m.id === value;
        return (
          <button key={m.id} onClick={() => onChange(m.id)} type="button"
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "10px 10px", borderRadius: 8, border: 0,
              background: active ? "var(--accent-soft)" : "transparent",
              cursor: "pointer",
            }}>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ font: "500 13px/1 var(--font-sans)", color: active ? "var(--accent-ink)" : "var(--ink)" }}>{m.label}</div>
              <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3 }}>
                {m.provider} · {m.ctx} ctx · {m.speed}
              </div>
            </div>
            <span className="mono" style={{ font: "500 11px/1 var(--font-mono)", color: "var(--muted)" }}>{m.cost}</span>
            {active && <Icon name="check" size={13} style={{ color: "var(--accent-ink)" }} />}
          </button>
        );
      })}
    </>
  );
}

function BranchPickerModal({ branches, value, onClose, onChange, authCount }) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () => branches.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.id.toLowerCase().includes(q.toLowerCase())),
    [q, branches]
  );
  return (
    <Modal onClose={onClose} title="Set chat scope" width={520}>
      <div style={{ padding: "0 16px 12px" }}>
        <input className="input" placeholder="Search branches…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <div style={{ maxHeight: 320, overflow: "auto", padding: "0 8px 8px" }}>
        <ScopeRow active={value === "ALL"} title="All my branches" sub={`${authCount} branches`} icon="globe" onClick={() => onChange("ALL")} />
        {list.map((b) => (
          <ScopeRow key={b.id} active={value === b.id} title={b.name} sub={`${b.id} · ${b.region}`}
            icon="store" onClick={() => onChange(b.id)} />
        ))}
      </div>
      <div style={{ padding: "10px 16px", borderTop: "0.5px solid var(--line)", font: "400 11.5px/1.5 var(--font-mono)", color: "var(--muted)" }}>
        Scope locks every query and document the AI can read. Branches outside your scope are not visible.
      </div>
    </Modal>
  );
}

function ScopeRow({ active, title, sub, icon, onClick }) {
  return (
    <button onClick={onClick} type="button"
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "10px 12px", borderRadius: 8, border: 0,
        background: active ? "var(--accent-soft)" : "transparent", cursor: "pointer",
      }}>
      <Icon name={icon} size={14} style={{ color: active ? "var(--accent-ink)" : "var(--muted)" }} />
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ font: "500 13px/1.2 var(--font-sans)", color: active ? "var(--accent-ink)" : "var(--ink)" }}>{title}</div>
        <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted)", marginTop: 3 }}>{sub}</div>
      </div>
      {active && <Icon name="check" size={14} style={{ color: "var(--accent-ink)" }} />}
    </button>
  );
}

function EmptyChat({ skill, scope }) {
  return (
    <div style={{ padding: "60px 0 20px", textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, margin: "0 auto 14px",
        borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent-ink)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="sparkles" size={24} />
      </div>
      <h2 className="h-1">{skill?.name || "AI Gateway"}</h2>
      <p className="muted" style={{ font: "400 14px/1.55 var(--font-sans)", margin: "8px auto 0", maxWidth: 480 }}>
        {skill?.description || "Ask anything about your branches — sales, inventory, customer counts, top products."}
      </p>
      <div className="mono muted" style={{ font: "400 11.5px/1 var(--font-mono)", marginTop: 16 }}>
        scope · {scope ? scope.name : "all your branches"}
      </div>
    </div>
  );
}

function Message({ m, skill, user }) {
  if (m.role === "user") {
    return (
      <div style={{ display: "flex", gap: 12, padding: "14px 0", flexDirection: "row-reverse" }}>
        <Avatar name={user.full_name || user.email} size={28} />
        <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {m.files?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, justifyContent: "flex-end" }}>
              {m.files.map((f, i) => (
                <div key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 8px 4px 6px", borderRadius: 6,
                  background: "var(--bg-2)", border: "0.5px solid var(--line)",
                  font: "500 11.5px/1 var(--font-sans)",
                }}>
                  <Icon name="doc" size={11} style={{ color: "var(--muted)" }} />
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
          )}
          {m.text && (
            <div style={{
              padding: "10px 14px", background: "var(--ink)", color: "var(--bg)",
              borderRadius: 14, borderBottomRightRadius: 4,
              font: "400 14.5px/1.55 var(--font-sans)", whiteSpace: "pre-wrap",
            }}>{m.text}</div>
          )}
        </div>
      </div>
    );
  }
  if (m.role === "blocked") {
    return (
      <div style={{ padding: "14px 0", display: "flex", gap: 12 }}>
        <div style={{ width: 28, flexShrink: 0 }} />
        <div style={{
          flex: 1, padding: "14px 16px", borderRadius: 12, maxWidth: 580,
          background: "oklch(0.95 0.04 25 / 0.5)", border: "0.5px solid oklch(0.85 0.08 25)",
          color: "oklch(0.42 0.16 25)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, font: "600 13px/1 var(--font-sans)" }}>
            <Icon name="shield" size={14} />
            Blocked by row-level policy
          </div>
          <div style={{ font: "400 13px/1.55 var(--font-sans)", marginTop: 6 }}>{m.text}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 12, padding: "14px 0" }}>
      <div style={{
        width: 28, height: 28, borderRadius: 999, flexShrink: 0,
        background: "var(--accent-soft)", color: "var(--accent-ink)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="sparkles" size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
          <span style={{ font: "600 13px/1 var(--font-sans)" }}>{skill?.name}</span>
          <span className="mono muted" style={{ font: "400 11px/1 var(--font-mono)" }}>· {m.model || ""} · {m.ts}</span>
        </div>
        <div style={{ font: "400 14.5px/1.65 var(--font-sans)", color: "var(--ink-2)" }}>
          {m.blocks?.length
            ? m.blocks.map((b, i) => <MessageBlock key={i} block={b} />)
            : <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.text}</p>}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          <button className="btn btn-ghost btn-icon btn-sm" type="button"
            onClick={() => navigator.clipboard?.writeText(m.text || "")}>
            <Icon name="copy" size={12} style={{ color: "var(--muted)" }} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" type="button"><Icon name="arrow_up" size={12} style={{ color: "var(--muted)" }} /></button>
          <button className="btn btn-ghost btn-icon btn-sm" type="button"><Icon name="arrow_down" size={12} style={{ color: "var(--muted)" }} /></button>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({ block }) {
  if (block.type === "p") {
    const html = block.text
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/`([^`]+)`/g, '<code style="font:500 12.5px/1 var(--font-mono);background:var(--bg-2);padding:1px 5px;border-radius:4px;">$1</code>')
      .replace(/\[(BKK|CNX|HKT|PTY|KKC|UDN|HHN)-(\d+)\]/g, '<span class="chip">$1-$2</span>');
    return <p style={{ margin: "0 0 12px" }} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (block.type === "tool") {
    return (
      <div style={{
        margin: "0 0 12px", padding: "8px 12px", borderRadius: 8,
        background: "var(--bg-2)", border: "0.5px solid var(--line)",
        font: "400 12px/1.5 var(--font-mono)", color: "var(--muted)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Icon name="bolt" size={12} style={{ color: "var(--accent)" }} />
        <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{block.name}</span>
        <span>{block.detail}</span>
        {block.elapsed && <span style={{ marginLeft: "auto", color: "var(--accent-ink)" }}>{block.elapsed}</span>}
      </div>
    );
  }
  if (block.type === "table") {
    return (
      <div style={{
        margin: "0 0 12px", border: "0.5px solid var(--line)", borderRadius: 8, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", font: "400 12.5px/1.4 var(--font-sans)" }}>
          <thead>
            <tr style={{ background: "var(--bg-2)" }}>
              {block.cols.map((c) => (
                <th key={c} style={{ textAlign: "left", padding: "8px 12px",
                  font: "500 11px/1 var(--font-mono)", letterSpacing: ".04em", textTransform: "uppercase",
                  color: "var(--muted)", borderBottom: "0.5px solid var(--line)" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="tnum">
            {block.rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: i < block.rows.length - 1 ? "0.5px solid var(--line-2)" : "none" }}>
                {r.map((c, j) => (
                  <td key={j} style={{ padding: "8px 12px", color: j === 0 ? "var(--ink)" : "var(--ink-2)", fontWeight: j === 0 ? 500 : 400 }}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "chart") {
    return (
      <div style={{ margin: "0 0 12px", padding: "12px 14px", border: "0.5px solid var(--line)", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div style={{ font: "500 12.5px/1 var(--font-sans)" }}>{block.title}</div>
          <div className="mono muted" style={{ font: "400 11px/1 var(--font-mono)" }}>{block.subtitle}</div>
        </div>
        <BarMini data={block.data} w={520} h={64} color="var(--accent)" />
      </div>
    );
  }
  if (block.type === "list") {
    return (
      <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
        {block.items.map((it, i) => <li key={i} style={{ marginBottom: 4 }}>{it}</li>)}
      </ul>
    );
  }
  return null;
}
