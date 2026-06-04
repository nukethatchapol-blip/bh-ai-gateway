"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MODELS, modelById } from "@/lib/models";
import { parseMarkdown } from "@/lib/markdown";
import {
  Avatar, BarMini, Field, Icon, Modal, Segmented, prettySize,
} from "./ui";
import { Sheet, roundBtn } from "./mobile-ui";
import { useLang } from "./lang-context";

export function ChatScreen({ profile, skills, branches, authorizedIds, initialMessages = [], initialChatId = null, initialDraft = "" }) {
  const { t } = useLang();
  const [skillId, setSkillId] = useState(skills[0]?.id || "data-analyst");
  const [modelId, setModelId] = useState("claude-4.5-s");
  const [branchScope, setBranchScope] = useState("ALL");
  // initialDraft lets external pages (e.g. Strategy panel "Ask in chat") seed
  // the composer with a starter question. Empty string for normal entry.
  const [draft, setDraft] = useState(initialDraft);
  const [attached, setAttached] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [showBranchPick, setShowBranchPick] = useState(false);
  const [sheet, setSheet] = useState(null); // null | "skill" | "model"
  const [pending, setPending] = useState(false);
  const [chatId, setChatId] = useState(initialChatId);
  const [shareCopied, setShareCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  const skill = skills.find((s) => s.id === skillId) || skills[0];
  const model = modelById(modelId) || MODELS[0];
  const scopedBranch = branchScope === "ALL" ? null : branches.find((b) => b.id === branchScope);
  const composerRef = useRef(null);

  function buildTranscript() {
    const sections = messages.map((m) => {
      if (m.role === "user") return `## You\n\n${m.text || ""}`;
      if (m.role === "blocked") return `## System\n\n${m.text || ""}`;
      const body = m.text || (m.blocks || []).map((b) => b.text || "").filter(Boolean).join("\n");
      return `## ${skill?.name || "Assistant"}${m.model ? ` · ${m.model}` : ""}\n\n${body}`;
    });
    const header = `# BEARHOUSE AI Gateway — conversation`;
    const meta = `*Exported ${new Date().toISOString()}*`;
    return `${header}\n\n${meta}\n\n${sections.join("\n\n")}\n`;
  }

  async function shareTranscript() {
    const transcript = buildTranscript();
    try {
      await navigator.clipboard.writeText(transcript);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      /* clipboard unavailable (insecure context / permission) */
    }
  }

  // BR-S4 — download the conversation as a Markdown file. Works without
  // clipboard permission and produces a record the user can attach to email,
  // ticket systems, etc.
  function exportTranscript() {
    if (!messages.length) return;
    const transcript = buildTranscript();
    const blob = new Blob([transcript], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    a.download = `chat-${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function send() {
    if (!draft.trim() && !attached.length) return;
    const text = draft;
    const files = attached;
    const userMsg = { id: "u-" + Date.now(), role: "user", text, files, ts: "now" };
    const assistantId = "a-" + Date.now();
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", model: model.label, ts: "now", text: "", blocks: [] }]);
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
          history: messages.slice(-10).map((mm) => ({
            role: mm.role === "user" ? "user" : "assistant",
            content: mm.text || (mm.blocks || []).map((b) => b.text || "").join("\n"),
          })),
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || `chat failed (${r.status})`);
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let thinkingAcc = "";
      const toolBlocks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev;
          try { ev = JSON.parse(line); } catch { continue; }
          if (ev.type === "text-delta") {
            acc += ev.text;
            setMessages((m) => m.map((x) => x.id === assistantId
              ? { ...x, text: acc, blocks: [...toolBlocks, ...parseMarkdown(acc)] } : x));
          } else if (ev.type === "thinking-delta") {
            thinkingAcc += ev.text;
            setMessages((m) => m.map((x) => x.id === assistantId
              ? { ...x, thinking: thinkingAcc } : x));
          } else if (ev.type === "tool-call") {
            toolBlocks.push({ type: "tool", name: ev.name, detail: summarizeArgs(ev.args), elapsed: "" });
            setMessages((m) => m.map((x) => x.id === assistantId
              ? { ...x, blocks: [...toolBlocks, ...parseMarkdown(acc)] } : x));
          } else if (ev.type === "tool-result") {
            if (ev.block) toolBlocks.push(ev.block);
            setMessages((m) => m.map((x) => x.id === assistantId
              ? { ...x, blocks: [...toolBlocks, ...parseMarkdown(acc)] } : x));
          } else if (ev.type === "done") {
            if (ev.chatId) setChatId(ev.chatId);
          } else if (ev.type === "error") {
            setMessages((m) => m.map((x) => x.id === assistantId
              ? { ...x, role: "blocked", text: ev.message } : x));
          }
        }
      }
    } catch (e) {
      setMessages((m) => m.map((x) => x.id === assistantId ? { ...x, role: "blocked", text: e.message } : x));
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

  const sendDisabled = !(draft.trim() || attached.length);

  // Slash-command skill picker. If the draft is /-prefixed with no space yet,
  // open a menu of matching skills. Selecting commits the skill and clears
  // the trigger so the user can keep typing their actual message.
  const slashMatch = /^\/(\S*)$/.exec(draft);
  const slashQuery = slashMatch ? slashMatch[1].toLowerCase() : null;
  const slashOpen = slashQuery !== null;
  const skillMatches = slashOpen
    ? skills.filter((s) => s.name.toLowerCase().includes(slashQuery) || (s.id || "").toLowerCase().includes(slashQuery))
    : [];
  function pickSkillFromSlash(id) {
    setSkillId(id);
    setDraft("");
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}>

      {/* compact top bar — stays at the top of the chat root naturally */}
      <div style={{
        padding: "8px 14px 10px", display: "flex", alignItems: "center", gap: 10,
        borderBottom: "0.5px solid var(--line-2)", flexShrink: 0,
        background: "var(--composer-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>
        <Link href="/chat" aria-label="Back to chats" style={{ ...roundBtn(), textDecoration: "none" }}>
          <Icon name="chevleft" size={15} stroke={2} />
        </Link>
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <div style={{
            font: "600 14px/1.2 var(--font-sans)", color: "var(--ink)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{skill?.name || t("chat.newChat")}</div>
          <button type="button" onClick={() => setShowBranchPick(true)} style={{
            appearance: "none", border: 0, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4,
            padding: "2px 8px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-ink)",
            font: "500 10.5px/1 var(--font-mono)",
          }}>
            <Icon name="store" size={10} stroke={1.6} />
            {scopedBranch ? `${scopedBranch.id} · ${scopedBranch.name}` : t("chat.allScope", { n: authorizedIds.length })}
            <Icon name="chevdown" size={9} />
          </button>
        </div>
        <button type="button" onClick={() => setShowThinking((v) => !v)}
          title={showThinking ? t("chat.hideThinking") : t("chat.showThinking")}
          style={{
            ...roundBtn(),
            background: showThinking ? "var(--accent-soft)" : "var(--panel)",
            color: showThinking ? "var(--accent-ink)" : "var(--ink)",
            borderColor: showThinking ? "transparent" : "var(--line)",
          }}>
          <Icon name="sparkles" size={14} style={{ color: showThinking ? "var(--accent-ink)" : "var(--muted)" }} />
        </button>
        <button type="button" onClick={exportTranscript} disabled={messages.length === 0}
          title={t("chat.exportMd")}
          aria-label={t("chat.exportMd")}
          style={{ ...roundBtn(), opacity: messages.length === 0 ? 0.4 : 1 }}>
          <Icon name="download" size={13} />
        </button>
        <button type="button" onClick={shareTranscript} disabled={messages.length === 0}
          title={t("chat.shareTooltip")}
          style={{ ...roundBtn(), opacity: messages.length === 0 ? 0.4 : 1 }}>
          <Icon name={shareCopied ? "check" : "upload"} size={14} />
        </button>
      </div>

      {dragging && (
        <div style={{
          position: "absolute", inset: 16, zIndex: 50,
          background: "var(--accent-soft)", border: "2px dashed var(--accent)",
          borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--accent-ink)", font: "500 16px/1.3 var(--font-sans)",
          pointerEvents: "none",
        }}>
          <div style={{ textAlign: "center" }}>
            <Icon name="paperclip" size={32} stroke={1.25} />
            <div style={{ marginTop: 8 }}>{t("chat.dropFiles")}</div>
            <div className="mono" style={{ font: "400 12px/1 var(--font-mono)", color: "var(--accent-ink)", opacity: 0.7, marginTop: 4 }}>PDF · CSV · XLSX · PNG · JPG · TXT</div>
          </div>
        </div>
      )}

      {/* messages — own scroll container so the composer can sit in flow below */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px 24px" }}>
        {messages.length === 0 && (
          <EmptyChat skill={skill} scope={scopedBranch} onPick={(text) => setDraft(text)} />
        )}
        {messages.map((m, i) => (
          <Message
            key={m.id}
            m={m}
            skill={skill}
            user={profile}
            streaming={pending && i === messages.length - 1 && m.role === "assistant"}
            showThinking={showThinking}
          />
        ))}
      </div>

      {/* composer — sits in flow at the bottom of the chat root, which is
          itself height:100% of .m-scroll, so the composer always pins to the
          top of the tab bar without relying on sticky-in-flex. */}
      <div style={{
        flexShrink: 0, padding: "10px 12px 10px",
        background: "var(--composer-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: "0.5px solid var(--line)",
      }}>
        {/* Slash-command skill menu (Claude-desktop style). Renders above the
            composer panel when the draft is /-prefixed with no space yet. */}
        {slashOpen && (
          <div style={{
            background: "var(--panel)", border: "0.5px solid var(--line)",
            borderRadius: 16, overflow: "hidden", marginBottom: 8,
            boxShadow: "0 -8px 30px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.06)",
          }}>
            <div style={{
              padding: "9px 14px 7px", display: "flex", alignItems: "center", gap: 7,
              borderBottom: "0.5px solid var(--line-2)",
            }}>
              <span className="mono" style={{
                font: "600 11px/1 var(--font-mono)", color: "var(--accent-ink)",
                background: "var(--accent-soft)", padding: "3px 6px", borderRadius: 5,
              }}>/</span>
              <span className="mono" style={{
                font: "500 11.5px/1 var(--font-mono)", color: "var(--muted)",
                letterSpacing: ".04em", textTransform: "uppercase",
              }}>
                {t("chat.skillsMatch", { n: skillMatches.length, s: skillMatches.length !== 1 ? "es" : "" })}
              </span>
            </div>
            {skillMatches.length === 0 && (
              <div style={{ padding: "16px 14px", font: "400 13px/1.4 var(--font-sans)", color: "var(--muted)", textAlign: "center" }}>
                {t("chat.noSkillMatch", { q: slashQuery })}
              </div>
            )}
            {skillMatches.map((s, i) => {
              const sel = i === 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickSkillFromSlash(s.id)}
                  style={{
                    width: "100%", appearance: "none", border: 0, cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 14px",
                    background: sel ? "var(--accent-soft)" : "transparent",
                    borderBottom: i < skillMatches.length - 1 ? "0.5px solid var(--line-2)" : "none",
                  }}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0, marginTop: 1,
                    background: sel ? "rgba(255,255,255,.5)" : "var(--bg-2)",
                    color: sel ? "var(--accent-ink)" : "var(--muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="sparkles" size={15} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ font: "600 14px/1.2 var(--font-sans)", color: sel ? "var(--accent-ink)" : "var(--ink)" }}>{s.name}</span>
                    </div>
                    {s.description && (
                      <div style={{
                        font: "400 12px/1.4 var(--font-sans)", marginTop: 3,
                        color: sel ? "var(--accent-ink)" : "var(--muted)",
                        opacity: sel ? 0.85 : 1,
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>{s.description}</div>
                    )}
                  </div>
                  {sel && (
                    <span className="mono" style={{
                      flexShrink: 0, alignSelf: "center",
                      font: "500 10px/1 var(--font-mono)", color: "var(--accent-ink)",
                      border: "0.5px solid var(--accent-ink)", borderRadius: 5, padding: "3px 5px", opacity: 0.7,
                    }}>↵</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div ref={composerRef} style={{
          background: "var(--panel)",
          border: `0.5px solid ${slashOpen ? "var(--accent)" : "var(--line)"}`,
          borderRadius: 22, boxShadow: "0 4px 16px rgba(0,0,0,.04)",
          transition: "border-color 120ms ease",
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
                  <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span className="mono muted" style={{ font: "400 10.5px/1 var(--font-mono)" }}>{prettySize(f.size)}</span>
                  <button onClick={() => setAttached((a) => a.filter((_, j) => j !== i))} type="button"
                    style={{ appearance: "none", border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer", display: "flex", padding: 0 }}>
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
              // Slash menu: Enter (no shift) commits the first match.
              if (slashOpen && e.key === "Enter" && !e.shiftKey && skillMatches.length > 0) {
                e.preventDefault();
                pickSkillFromSlash(skillMatches[0].id);
                return;
              }
              // Cmd/Ctrl+Enter sends.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Ask the ${skill?.name?.toLowerCase() || "assistant"} about ${scopedBranch ? scopedBranch.name : "your branches"}…`}
            rows={2}
            style={{
              width: "100%", border: 0, outline: 0, background: "transparent",
              padding: "14px 16px 6px", color: "var(--ink)", resize: "none",
              font: "400 14.5px/1.5 var(--font-sans)", fontFamily: "var(--font-sans)",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px 6px 10px" }}>
            <FileAttachButton onPick={(files) =>
              setAttached((a) => [
                ...a,
                ...files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
              ])
            } />

            <button
              type="button"
              style={composerPill()}
              onClick={() => setDraft("/")}
              title={t("chat.slashHint")}
            >
              <span className="mono" style={{ font: "600 13px/1 var(--font-mono)", color: "var(--accent-ink)" }}>/</span>
              <span style={{ color: "var(--accent-ink)" }}>{skill?.name || t("chat.skill")}</span>
            </button>

            <button type="button" style={composerPill()} onClick={() => setSheet("model")}>
              <span className="mono" style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)" }}>{(model.provider || "").slice(0, 4).toUpperCase()}</span>
              <span>{model.label}</span>
              <Icon name="chevdown" size={10} style={{ color: "var(--muted)" }} />
            </button>

            <div style={{ flex: 1 }} />
            <button onClick={send} type="button" style={{
              width: 32, height: 32, borderRadius: 999, border: 0, cursor: "pointer",
              background: "var(--ink)", color: "var(--bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: sendDisabled ? 0.4 : 1,
            }}>
              <Icon name="send" size={14} />
            </button>
          </div>
        </div>

        {/* Slash hint */}
        <div className="mono" style={{
          textAlign: "center", marginTop: 7,
          font: "400 11px/1 var(--font-mono)", color: "var(--muted-2)",
        }}>
          {slashOpen ? t("chat.slashFilter") : t("chat.slashHint")}
        </div>
      </div>

      {sheet === "model" && (
        <Sheet title={t("chat.model")} onClose={() => setSheet(null)}>
          <ModelList value={modelId}
            onChange={(v) => { setModelId(v); setSheet(null); }} />
        </Sheet>
      )}

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

function composerPill() {
  return {
    display: "inline-flex", alignItems: "center", gap: 5, height: 28, padding: "0 10px",
    borderRadius: 999, border: 0, background: "transparent",
    color: "var(--ink-2)", font: "500 12px/1 var(--font-sans)", cursor: "pointer",
  };
}

function FileAttachButton({ onPick }) {
  const ref = useRef(null);
  const { t } = useLang();
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
        <span className="chat-attach-label">{t("chat.attach")}</span>
      </button>
    </>
  );
}

// Skill picker body (rendered inside a bottom Sheet) — card per skill with
// the active one highlighted, plus each skill's tools as chips.
function SkillList({ skills, value, onChange }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ font: "400 12.5px/1.4 var(--font-sans)", color: "var(--muted)", padding: "0 20px 12px" }}>
        {t("chat.skillNote")}
      </div>

      {skills.map((s) => {
        const active = s.id === value;
        return (
          <button key={s.id} type="button" onClick={() => onChange(s.id)} style={{
            appearance: "none", width: "calc(100% - 32px)", display: "block", textAlign: "left",
            margin: "0 16px 8px", padding: 14, borderRadius: 14, cursor: "pointer",
            background: active ? "var(--accent-soft)" : "var(--panel)",
            border: active ? "0.5px solid transparent" : "0.5px solid var(--line)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: active ? "rgba(255,255,255,.55)" : "var(--bg-2)",
                color: active ? "var(--accent-ink)" : "var(--muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><Icon name="sparkles" size={14} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "600 14.5px/1.2 var(--font-sans)", color: active ? "var(--accent-ink)" : "var(--ink)" }}>{s.name}</div>
                {s.description && (
                  <div style={{ font: "400 12.5px/1.45 var(--font-sans)", color: active ? "var(--accent-ink)" : "var(--muted)", marginTop: 3, opacity: active ? 0.8 : 1 }}>{s.description}</div>
                )}
              </div>
              {active && <Icon name="check" size={16} stroke={2} style={{ color: "var(--accent-ink)" }} />}
            </div>
            {s.tools?.length > 0 && (
              <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                {s.tools.map((tool) => (
                  <span key={tool} className="mono" style={{
                    font: "500 10.5px/1 var(--font-mono)", padding: "3px 7px", borderRadius: 5,
                    background: active ? "rgba(255,255,255,.45)" : "var(--bg-2)", color: "var(--muted)",
                  }}>{tool}</span>
                ))}
              </div>
            )}
          </button>
        );
      })}

      <div style={{
        margin: "8px 16px 4px", padding: "10px 14px", borderRadius: 12,
        background: "var(--bg-2)", border: "0.5px dashed var(--line)",
        font: "400 11.5px/1.5 var(--font-sans)", color: "var(--muted)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Icon name="shield" size={13} />
        {t("chat.skillGranted")}
      </div>
    </>
  );
}

// Model picker body (rendered inside a bottom Sheet).
function ModelList({ value, onChange }) {
  return (
    <>
      {MODELS.map((m) => {
        const active = m.id === value;
        return (
          <button key={m.id} type="button" onClick={() => onChange(m.id)} style={{
            appearance: "none", width: "calc(100% - 32px)", display: "flex", alignItems: "center", gap: 12,
            margin: "0 16px 8px", padding: 14, borderRadius: 14, cursor: "pointer",
            background: active ? "var(--accent-soft)" : "var(--panel)",
            border: active ? "0.5px solid transparent" : "0.5px solid var(--line)",
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: active ? "rgba(255,255,255,.55)" : "var(--bg-2)",
              color: active ? "var(--accent-ink)" : "var(--muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              font: "600 11px/1 var(--font-mono)",
            }}>{(m.provider || "").slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div style={{ font: "600 14.5px/1.2 var(--font-sans)", color: active ? "var(--accent-ink)" : "var(--ink)" }}>{m.label}</div>
              <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: active ? "var(--accent-ink)" : "var(--muted)", marginTop: 4, opacity: active ? 0.8 : 1 }}>
                {m.provider} · {m.ctx} ctx · {m.speed}
              </div>
            </div>
            <span className="mono" style={{ font: "500 11px/1 var(--font-mono)", color: active ? "var(--accent-ink)" : "var(--muted)" }}>{m.cost}</span>
            {active && <Icon name="check" size={16} stroke={2} style={{ color: "var(--accent-ink)" }} />}
          </button>
        );
      })}
    </>
  );
}

function BranchPickerModal({ branches, value, onClose, onChange, authCount }) {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const list = useMemo(
    () => branches.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.id.toLowerCase().includes(q.toLowerCase())),
    [q, branches]
  );
  return (
    <Modal onClose={onClose} title={t("chat.scopeTitle")} width={520}>
      <div style={{ padding: "0 16px 12px" }}>
        <input className="input" placeholder={t("chat.scopeSearch")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <div style={{ maxHeight: 320, overflow: "auto", padding: "0 8px 8px" }}>
        <ScopeRow active={value === "ALL"} title={t("chat.scopeAll")} sub={t("chat.scopeCount", { n: authCount })} icon="globe" onClick={() => onChange("ALL")} />
        {list.map((b) => (
          <ScopeRow key={b.id} active={value === b.id} title={b.name} sub={`${b.id} · ${b.region}`}
            icon="store" onClick={() => onChange(b.id)} />
        ))}
      </div>
      <div style={{ padding: "10px 16px", borderTop: "0.5px solid var(--line)", font: "400 11.5px/1.5 var(--font-mono)", color: "var(--muted)" }}>
        {t("chat.scopeNote")}
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

function EmptyChat({ skill, scope, onPick }) {
  const { t } = useLang();
  const prompts = [t("recents.q1"), t("recents.q2"), t("recents.q3")];
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

      {/* Quick start: tap to fill the composer so the user can review/edit
          before sending. Lives in the new-conversation empty state — moved
          from the chat home list where it had no compose target. */}
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", padding: "0 4px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
          font: "500 11px/1 var(--font-mono)", color: "var(--muted)",
          textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4,
        }}>
          <Icon name="sparkles" size={11} />
          <span>{t("recents.quickStart")}</span>
        </div>
        {prompts.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick && onPick(q)}
            style={{
              appearance: "none", textAlign: "left", cursor: "pointer",
              border: "0.5px solid var(--line)", background: "var(--bg-2)",
              borderRadius: 10, padding: "10px 12px",
              font: "400 13.5px/1.35 var(--font-sans)", color: "var(--ink-2)",
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function StreamingIndicator({ hasText }) {
  if (hasText) {
    return <span className="stream-cursor" aria-hidden="true" />;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 0" }} aria-label="Thinking">
      <span className="thinking-dot" style={{ animationDelay: "0ms" }} />
      <span className="thinking-dot" style={{ animationDelay: "150ms" }} />
      <span className="thinking-dot" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

// Reasoning box. While the model is actively thinking (streaming, no
// answer yet) it always shows live. Once the answer is in, visibility is
// driven by the global "Show thinking" header toggle (`show`).
function ThinkingBox({ thinking, streaming, hasAnswer, show }) {
  if (!thinking) return null;
  const live = streaming && !hasAnswer;
  if (!live && !show) return null; // hidden by the global toggle

  return (
    <div style={{
      margin: "0 0 10px", border: "0.5px solid var(--line)",
      borderRadius: 8, background: "var(--bg-2)", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px", color: "var(--muted)",
      }}>
        <Icon name="sparkles" size={12} style={{ color: "var(--accent)" }} />
        <span style={{ font: "500 11.5px/1 var(--font-sans)" }}>
          {live ? "Thinking…" : "Thought process"}
        </span>
        {live && (
          <span style={{ display: "inline-flex", gap: 4 }}>
            <span className="thinking-dot" style={{ width: 4, height: 4, animationDelay: "0ms" }} />
            <span className="thinking-dot" style={{ width: 4, height: 4, animationDelay: "150ms" }} />
            <span className="thinking-dot" style={{ width: 4, height: 4, animationDelay: "300ms" }} />
          </span>
        )}
      </div>
      <div className="scroll-y" style={{
        padding: "0 12px 10px", font: "400 12px/1.6 var(--font-sans)",
        color: "var(--muted)", whiteSpace: "pre-wrap", maxHeight: 280,
      }}>
        {thinking}
      </div>
    </div>
  );
}

function Message({ m, skill, user, streaming = false, showThinking = false }) {
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
  // assistant
  const blocks = m.blocks?.length ? m.blocks : parseMarkdown(m.text || "");
  const lastBlock = blocks[blocks.length - 1];
  // When streaming with text, blink the cursor at the end of the last
  // paragraph (Claude-style). Otherwise the indicator renders standalone.
  const inlineCursor = streaming && !!m.text && lastBlock?.type === "p";
  const renderBlocks = inlineCursor
    ? blocks.map((b, i) => (i === blocks.length - 1 ? { ...b, _cursor: true } : b))
    : blocks;
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
        {m.thinking && (
          <ThinkingBox thinking={m.thinking} streaming={streaming} hasAnswer={!!m.text} show={showThinking} />
        )}
        <div style={{ font: "400 14.5px/1.65 var(--font-sans)", color: "var(--ink-2)" }}>
          {renderBlocks.map((b, i) => (
            <MessageBlock key={i} block={b} />
          ))}
          {streaming && !inlineCursor && !(m.thinking && !m.text) && (
            <StreamingIndicator hasText={!!m.text} />
          )}
        </div>
        {!streaming && (
          <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
            <button className="btn btn-ghost btn-icon btn-sm" type="button"
              onClick={() => navigator.clipboard?.writeText(m.text || "")}>
              <Icon name="copy" size={12} style={{ color: "var(--muted)" }} />
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" type="button"><Icon name="arrow_up" size={12} style={{ color: "var(--muted)" }} /></button>
            <button className="btn btn-ghost btn-icon btn-sm" type="button"><Icon name="arrow_down" size={12} style={{ color: "var(--muted)" }} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBlock({ block }) {
  if (block.type === "p") {
    // SECURITY: escape HTML entities FIRST so raw model/assistant output can't
    // inject markup (stored XSS via prompt injection). Only after escaping do we
    // add our own known-safe tags for bold/code/branch chips.
    const html = (block.text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/`([^`]+)`/g, '<code style="font:500 12.5px/1 var(--font-mono);background:var(--bg-2);padding:1px 5px;border-radius:4px;">$1</code>')
      .replace(/\[(BKK|CNX|HKT|PTY|KKC|UDN|HHN)-(\d+)\]/g, '<span class="chip">$1-$2</span>')
      + (block._cursor ? '<span class="stream-cursor"></span>' : "");
    return <p style={{ margin: "0 0 12px" }} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (block.type === "heading") {
    const sizes = { 1: 20, 2: 17, 3: 15, 4: 13.5 };
    return (
      <div style={{
        font: `600 ${sizes[block.level] || 14}px/1.3 var(--font-sans)`,
        letterSpacing: "-0.01em", margin: "4px 0 8px",
      }}>{block.text}</div>
    );
  }
  if (block.type === "code") {
    return (
      <pre className="mono" style={{
        margin: "0 0 12px", padding: "12px 14px", borderRadius: 8,
        background: "var(--bg-2)", border: "0.5px solid var(--line)",
        font: "400 12px/1.6 var(--font-mono)", color: "var(--ink-2)",
        overflowX: "auto", whiteSpace: "pre",
      }}>{block.text}</pre>
    );
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

function summarizeArgs(args = {}) {
  const parts = Object.entries(args).map(([k, v]) => `${k}=${v}`);
  return parts.join(" · ");
}
