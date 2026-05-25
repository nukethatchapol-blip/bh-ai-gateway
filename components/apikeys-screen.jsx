"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon, Field, Modal } from "./ui";
import { NavBar, SectionHeader, GroupCard, roundBtn } from "./mobile-ui";
import { useLang } from "./lang-context";
import { PROVIDER_LABEL, PROVIDER_PREFIX } from "@/lib/models";

const PROVIDERS = ["openai", "anthropic", "google", "mistral", "groq", "openrouter"];

// Static gateway-credit chrome (no real per-user gateway credit ledger exists yet).
const GATEWAY_CREDIT_USED = 182;
const GATEWAY_CREDIT_CAP = 250;

export function ApiKeysScreen({ keys }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(null);
  const { t } = useLang();

  const byProvider = useMemo(() => {
    const map = {};
    keys.forEach((k) => { map[k.provider] = k; });
    return map;
  }, [keys]);

  const monthlySpend = keys.reduce((a, k) => a + Number(k.spend_usd || 0), 0);
  const configured = keys.filter((k) => k.active).length;
  const firstUnconfigured = PROVIDERS.find((p) => !byProvider[p]);

  async function saveKey(provider, { key, monthly_cap_usd }) {
    const r = await fetch("/api/apikeys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, key, monthly_cap_usd }),
    });
    setEditing(null);
    if (r.ok) startTransition(() => router.refresh());
    else alert((await r.json()).error || t("apikeys.saveFailed"));
  }

  async function revoke(provider) {
    if (!confirm(t("apikeys.revokeConfirm", { provider: PROVIDER_LABEL[provider] }))) return;
    await fetch(`/api/apikeys?provider=${provider}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  const creditPct = Math.min(100, (GATEWAY_CREDIT_USED / GATEWAY_CREDIT_CAP) * 100);

  return (
    <>
      <NavBar
        title={t("nav.apikeys")}
        sub={t("apikeys.sub")}
        leading={<Icon name="key" size={20} stroke={1.6} style={{ color: "var(--muted)" }} />}
      />

      {/* summary card */}
      <GroupCard style={{ margin: "0 16px 14px", padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="mono" style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>
              {t("apikeys.monthlySpend")}
            </div>
            <div className="tnum" style={{ font: "600 22px/1 var(--font-sans)", marginTop: 8, letterSpacing: "-0.01em" }}>${monthlySpend.toFixed(2)}</div>
            <div style={{ font: "400 11.5px/1.3 var(--font-sans)", color: "var(--muted)", marginTop: 5 }}>
              {t("apikeys.keysConfigured", { n: configured })}
            </div>
          </div>
          <div>
            <div className="mono" style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>
              {t("apikeys.gatewayCredits")}
            </div>
            <div className="tnum" style={{ font: "600 22px/1 var(--font-sans)", marginTop: 8, letterSpacing: "-0.01em" }}>
              ${GATEWAY_CREDIT_USED}<span style={{ color: "var(--muted)", font: "400 14px/1 var(--font-sans)" }}>/{GATEWAY_CREDIT_CAP}</span>
            </div>
            <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden", marginTop: 8 }}>
              <div style={{ width: `${creditPct}%`, height: "100%", background: "var(--accent)" }} />
            </div>
          </div>
        </div>
      </GroupCard>

      {/* providers list */}
      <SectionHeader>{t("apikeys.providers")}</SectionHeader>
      <GroupCard>
        {PROVIDERS.map((p, i) => (
          <ProviderRow
            key={p}
            provider={p}
            row={byProvider[p]}
            last={i === PROVIDERS.length - 1}
            onEdit={() => setEditing(p)}
          />
        ))}
      </GroupCard>

      {/* add provider */}
      {firstUnconfigured && (
        <button type="button" onClick={() => setEditing(firstUnconfigured)} style={{
          margin: "12px 16px 0", width: "calc(100% - 32px)", height: 46, borderRadius: 12,
          appearance: "none", border: "1px dashed var(--line)",
          background: "transparent", color: "var(--accent-ink)",
          font: "600 14px/1 var(--font-sans)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Icon name="plus" size={14} stroke={2} />
          {t("apikeys.addProvider")}
        </button>
      )}

      {/* encryption notice */}
      <SectionHeader>{t("apikeys.notice")}</SectionHeader>
      <div style={{
        margin: "0 16px", padding: "12px 14px", borderRadius: 12,
        background: "var(--bg-2)", border: "0.5px solid var(--line)",
        font: "400 12.5px/1.55 var(--font-sans)", color: "var(--muted)",
      }}>
        {t("apikeys.noticeBody")}
      </div>

      <div style={{ height: 16 }} />

      {editing && (
        <KeyEditModal
          provider={editing}
          existing={byProvider[editing]}
          onClose={() => setEditing(null)}
          onSave={(payload) => saveKey(editing, payload)}
          onRemove={byProvider[editing] ? () => { setEditing(null); revoke(editing); } : null}
        />
      )}
    </>
  );
}

function ProviderRow({ provider, row, last, onEdit }) {
  const { t } = useLang();
  const configured = !!row;
  return (
    <button type="button" onClick={onEdit} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
      borderBottom: last ? "none" : "0.5px solid var(--line-2)",
      appearance: "none", border: 0, background: "transparent", cursor: "pointer", textAlign: "left",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: "var(--bg-2)", border: "0.5px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "center",
        font: "600 13px/1 var(--font-sans)", color: "var(--ink-2)",
      }}>
        {PROVIDER_LABEL[provider][0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ font: "500 14px/1.2 var(--font-sans)" }}>{PROVIDER_LABEL[provider]}</span>
          {configured && (
            <span className="badge badge-accent" style={{ height: 18 }}><span className="dot" /> {t("apikeys.active")}</span>
          )}
        </div>
        <div className="mono" style={{ font: "400 11px/1 var(--font-mono)", color: "var(--muted)", marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {configured ? (
            <>{PROVIDER_PREFIX[provider]}<span style={{ color: "var(--muted-2)" }}>•••••</span>{row.last4 || "fffa"}</>
          ) : (
            t("apikeys.gatewayRouting")
          )}
        </div>
      </div>
      {configured && (
        <div style={{ textAlign: "right", marginRight: 2 }}>
          <div className="mono tnum" style={{ font: "600 13px/1 var(--font-mono)" }}>${Number(row.spend_usd || 0).toFixed(0)}</div>
          <div className="mono tnum" style={{ font: "400 10px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4 }}>/{row.monthly_cap_usd}</div>
        </div>
      )}
      <Icon name="chevright" size={14} stroke={1.5} style={{ color: "var(--muted-2)" }} />
    </button>
  );
}

function KeyEditModal({ provider, existing, onClose, onSave, onRemove }) {
  const { t } = useLang();
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [limit, setLimit] = useState(existing?.monthly_cap_usd || 250);
  const [busy, setBusy] = useState(false);

  return (
    <Modal onClose={onClose} title={existing ? t("apikeys.manageKey", { provider: PROVIDER_LABEL[provider] }) : t("apikeys.addKey", { provider: PROVIDER_LABEL[provider] })} width={520}>
      <div style={{ padding: "0 18px 18px" }}>
        <Field label={t("apikeys.field.key")} hint={t("apikeys.field.keyHint")}>
          <div style={{ position: "relative" }}>
            <input
              className="input mono"
              type={show ? "text" : "password"}
              placeholder={`${PROVIDER_PREFIX[provider]}…`}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              style={{ paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="btn btn-icon btn-ghost btn-sm"
              style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}>
              <Icon name={show ? "eyeoff" : "eye"} size={13} />
            </button>
          </div>
        </Field>

        <div style={{ marginTop: 14 }}>
          <Field label={t("apikeys.field.cap")}>
            <input className="input tnum mono" type="number" min={0} step={10} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
          </Field>
        </div>

        <div style={{
          marginTop: 14, padding: "10px 12px", borderRadius: 8,
          background: "var(--bg-2)", border: "0.5px solid var(--line)",
          font: "400 11.5px/1.55 var(--font-mono)", color: "var(--muted)",
        }}>
          <span style={{ color: "var(--accent-ink)" }}>note · </span>
          {t("apikeys.modalNote")}
        </div>

        <div style={{ display: "flex", justifyContent: existing ? "space-between" : "flex-end", gap: 8, marginTop: 18 }}>
          {existing && onRemove && (
            <button type="button" className="btn btn-ghost" onClick={onRemove} style={{ color: "oklch(0.55 0.18 25)" }}>
              <Icon name="trash" size={12} /> {t("common.remove")}
            </button>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn" onClick={onClose}>{t("common.cancel")}</button>
            <button type="button" className="btn btn-primary" disabled={!key || busy}
              onClick={async () => {
                setBusy(true);
                await onSave({ key, monthly_cap_usd: limit });
                setBusy(false);
              }}>
              {busy ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
