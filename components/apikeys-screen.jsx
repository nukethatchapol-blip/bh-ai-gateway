"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon, Field, Modal, Segmented } from "./ui";
import { PageHeader } from "./shell";
import { MODELS, PROVIDER_LABEL, PROVIDER_PREFIX } from "@/lib/models";

const PROVIDERS = ["openai", "anthropic", "google", "mistral", "groq", "openrouter"];

export function ApiKeysScreen({ keys }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(null);

  const byProvider = useMemo(() => {
    const map = {};
    keys.forEach((k) => { map[k.provider] = k; });
    return map;
  }, [keys]);

  const monthlySpend = keys.reduce((a, k) => a + Number(k.spend_usd || 0), 0);
  const configured = keys.filter((k) => k.active).length;

  async function saveKey(provider, { key, monthly_cap_usd }) {
    const r = await fetch("/api/apikeys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, key, monthly_cap_usd }),
    });
    setEditing(null);
    if (r.ok) startTransition(() => router.refresh());
    else alert((await r.json()).error || "Save failed");
  }

  async function revoke(provider) {
    if (!confirm(`Revoke ${PROVIDER_LABEL[provider]} key?`)) return;
    await fetch(`/api/apikeys?provider=${provider}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="pageframe">
      <PageHeader title="API Keys" crumb="/ settings · api">
        <span className="badge">
          <span className="dot" style={{ color: "var(--accent)" }} /> {configured} configured
        </span>
      </PageHeader>

      <div className="page-body scroll-y">
        <div style={{ padding: "20px 28px 40px", maxWidth: 920, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card apikeys-summary" style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            <SummaryStat label="Monthly spend (BYO)" value={`$${monthlySpend.toFixed(2)}`} sub="across your own keys" />
            <SummaryStat label="Gateway credits" value="$182.40" sub="of $250 monthly allowance" pct={73} />
            <SummaryStat label="Providers" value={`${configured}/${PROVIDERS.length}`} sub="configured" />
          </div>

          <div style={{
            padding: "12px 14px", border: "0.5px solid var(--line)", borderRadius: 10,
            background: "var(--panel-2)", display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <Icon name="key" size={14} stroke={1.5} style={{ color: "var(--accent)", marginTop: 2 }} />
            <div style={{ font: "400 12.5px/1.6 var(--font-sans)", color: "var(--ink-2)" }}>
              <b>Bring your own key</b> for isolated billing or enterprise contracts. Otherwise the gateway proxies to the team's pooled credentials — usage still counts against your monthly quota. Keys are AES-256 encrypted at rest and never visible to other users or in audit logs.
            </div>
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="h-3">Providers</h3>
            </div>
            {PROVIDERS.map((p, i) => (
              <ProviderRow
                key={p}
                provider={p}
                row={byProvider[p]}
                last={i === PROVIDERS.length - 1}
                onEdit={() => setEditing(p)}
                onRemove={() => revoke(p)}
              />
            ))}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <h3 className="h-2">Model routing</h3>
                <p className="muted" style={{ font: "400 12.5px/1.5 var(--font-sans)", margin: "4px 0 0" }}>
                  For each model, the gateway uses your key when configured, else the team key.
                </p>
              </div>
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {MODELS.map((m) => {
                const canBYO = !!byProvider[m.provider];
                return (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--line)",
                    background: "var(--panel-2)",
                  }}>
                    <span className="mono" style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase", width: 80 }}>
                      {PROVIDER_LABEL[m.provider]}
                    </span>
                    <span style={{ font: "500 13px/1 var(--font-sans)", flex: 1 }}>{m.label}</span>
                    <span className="mono tnum muted" style={{ font: "400 11px/1 var(--font-mono)" }}>{m.cost} · {m.ctx}</span>
                    <Segmented
                      value={canBYO ? "byo" : "gateway"}
                      onChange={() => {}}
                      options={[
                        { value: "byo", label: canBYO ? "My key" : "—" },
                        { value: "gateway", label: "Gateway" },
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <KeyEditModal
          provider={editing}
          existing={byProvider[editing]}
          onClose={() => setEditing(null)}
          onSave={(payload) => saveKey(editing, payload)}
        />
      )}
    </div>
  );
}

function SummaryStat({ label, value, sub, pct }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="tnum" style={{ font: "500 28px/1 var(--font-sans)", letterSpacing: "-0.01em", marginTop: 8 }}>{value}</div>
      <div className="muted" style={{ font: "400 12px/1.4 var(--font-sans)", marginTop: 6 }}>{sub}</div>
      {pct != null && (
        <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden", marginTop: 10 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
        </div>
      )}
    </div>
  );
}

function ProviderRow({ provider, row, last, onEdit, onRemove }) {
  const configured = !!row;
  return (
    <div className="apikeys-provider-row" style={{
      display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
      borderBottom: last ? "none" : "0.5px solid var(--line-2)",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 8, flexShrink: 0,
        background: "var(--bg-2)", border: "0.5px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "center",
        font: "600 13px/1 var(--font-sans)", color: "var(--ink-2)",
      }}>
        {PROVIDER_LABEL[provider][0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: "500 14px/1.2 var(--font-sans)" }}>{PROVIDER_LABEL[provider]}</span>
          {configured ? (
            <span className="badge badge-accent"><span className="dot" /> active</span>
          ) : (
            <span className="badge"><span className="dot" /> gateway</span>
          )}
        </div>
        <div className="mono" style={{ font: "400 11.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 6 }}>
          {configured ? (
            <>{PROVIDER_PREFIX[provider]}<span style={{ color: "var(--muted-2)" }}>•••••••••••••</span>{row.last4 || "fffa"}</>
          ) : (
            <>{PROVIDER_PREFIX[provider]}… not configured</>
          )}
        </div>
      </div>
      {configured && (
        <div className="apikeys-provider-stats" style={{ display: "flex", gap: 24, marginRight: 8 }}>
          <div>
            <div className="mono" style={{ font: "400 10px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>Spend</div>
            <div className="tnum" style={{ font: "500 13px/1 var(--font-sans)", marginTop: 4 }}>${Number(row.spend_usd || 0).toFixed(2)}</div>
          </div>
          <div>
            <div className="mono" style={{ font: "400 10px/1 var(--font-mono)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>Cap</div>
            <div className="tnum" style={{ font: "500 13px/1 var(--font-sans)", marginTop: 4 }}>${row.monthly_cap_usd}</div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 4 }}>
        <button className="btn btn-sm" type="button" onClick={onEdit}>
          {configured ? <><Icon name="edit" size={12} /> Manage</> : <><Icon name="plus" size={12} /> Add key</>}
        </button>
        {configured && <button className="btn btn-sm btn-ghost" type="button" onClick={onRemove}><Icon name="trash" size={12} /></button>}
      </div>
    </div>
  );
}

function KeyEditModal({ provider, existing, onClose, onSave }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [limit, setLimit] = useState(existing?.monthly_cap_usd || 250);
  const [busy, setBusy] = useState(false);

  return (
    <Modal onClose={onClose} title={`${existing ? "Manage" : "Add"} ${PROVIDER_LABEL[provider]} key`} width={520}>
      <div style={{ padding: "0 18px 18px" }}>
        <Field label="API key" hint="Stored AES-256 encrypted. Never visible to other users.">
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
          <Field label="Monthly cap (USD)">
            <input className="input tnum mono" type="number" min={0} step={10} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
          </Field>
        </div>

        <div style={{
          marginTop: 14, padding: "10px 12px", borderRadius: 8,
          background: "var(--bg-2)", border: "0.5px solid var(--line)",
          font: "400 11.5px/1.55 var(--font-mono)", color: "var(--muted)",
        }}>
          <span style={{ color: "var(--accent-ink)" }}>note · </span>
          Your key bills directly against your provider account. The gateway only proxies requests and writes audit metadata (no message content).
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!key || busy}
            onClick={async () => {
              setBusy(true);
              await onSave({ key, monthly_cap_usd: limit });
              setBusy(false);
            }}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
