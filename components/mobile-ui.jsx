"use client";
import React from "react";
import { Icon } from "./ui";

export const SAFE_TOP = 8;

export function NavBar({ title, sub, leading, trailing }) {
  return (
    <div style={{ padding: "8px 20px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 32 }}>
        {leading || <span style={{ width: 32 }} />}
        {trailing || <span style={{ width: 32 }} />}
      </div>
      <div style={{ marginTop: 6 }}>
        <h1 style={{ font: "700 30px/1.15 var(--font-sans)", letterSpacing: "-0.02em", margin: 0, color: "var(--ink)" }}>{title}</h1>
        {sub && <div style={{ font: "400 13px/1.3 var(--font-sans)", color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

export function SectionHeader({ children }) {
  return (
    <div style={{
      padding: "18px 20px 8px", display: "flex", alignItems: "center", gap: 5,
      font: "500 11px/1 var(--font-mono)", color: "var(--muted)",
      letterSpacing: ".08em", textTransform: "uppercase",
    }}>{children}</div>
  );
}

export function GroupCard({ children, style }) {
  return (
    <div style={{
      margin: "0 16px", background: "var(--panel)", borderRadius: 14,
      border: "0.5px solid var(--line)", overflow: "hidden", ...style,
    }}>{children}</div>
  );
}

export function MToggle({ on, onChange }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={on} style={{
      appearance: "none", border: 0, padding: 2, cursor: "pointer",
      width: 44, height: 26, borderRadius: 999,
      background: on ? "var(--accent)" : "var(--line)",
      display: "inline-flex", alignItems: "center", flexShrink: 0,
      transition: "background 120ms ease",
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 999, background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,.25)",
        marginLeft: on ? 18 : 0, transition: "margin-left 120ms ease",
      }} />
    </button>
  );
}

export function roundBtn() {
  return {
    width: 32, height: 32, borderRadius: 999, border: "0.5px solid var(--line)",
    background: "var(--panel)", color: "var(--ink)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
}

export function Sheet({ title, onClose, footer, children }) {
  return (
    <div className="m-sheet-scrim" onClick={onClose}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--line)" }} />
        </div>
        <div style={{ padding: "12px 20px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {footer?.left || <span style={{ width: 48 }} />}
          <div style={{ font: "600 17px/1.2 var(--font-sans)", color: "var(--ink)" }}>{title}</div>
          <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: "var(--accent-ink)", font: "600 14px/1 var(--font-sans)", cursor: "pointer" }}>
            {footer?.right || "Done"}
          </button>
        </div>
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
