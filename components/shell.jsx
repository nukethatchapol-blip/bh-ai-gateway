"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar, BearLogo, Icon } from "./ui";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { useLang } from "./lang-context";

const NAV = [
  { id: "chat",      labelKey: "nav.chat",      icon: "chat",      href: "/chat" },
  { id: "dashboard", labelKey: "nav.dashboard", icon: "dashboard", href: "/dashboard" },
  { id: "apikeys",   labelKey: "nav.apikeys",   icon: "key",       href: "/apikeys" },
  { id: "admin",     labelKey: "nav.admin",     icon: "shield",    href: "/admin",  adminOnly: true },
  { id: "access",    labelKey: "nav.access",    icon: "store",     href: "/access", adminOnly: true },
];

export function AppShell({ children }) {
  return (
    <SidebarProvider>
      <div className="app-shell">{children}</div>
      <Backdrop />
    </SidebarProvider>
  );
}

function Backdrop() {
  const { open, close } = useSidebar();
  return (
    <div className={`sidebar-backdrop ${open ? "open" : ""}`} onClick={close} aria-hidden />
  );
}

export function Sidebar({ user, recents = [] }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { open, close } = useSidebar();
  const { t, lang, setLang } = useLang();
  const w = collapsed ? 60 : 248;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside
      className={`app-sidebar ${open ? "open" : ""}`}
      style={{
        width: w,
        transition: "width 180ms ease",
        height: "100%",
        borderRight: "0.5px solid var(--line)",
        background: "var(--panel-2)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: collapsed ? "16px 14px 14px" : "16px 16px 14px",
        height: 60, flexShrink: 0,
      }}>
        <BearLogo size={32} radius={9} />
        {!collapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="mono" style={{ font: "600 11px/1 var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>BEARHOUSE</div>
            <div style={{ font: "600 13px/1.2 var(--font-sans)", marginTop: 2 }}>{t("brand.tagline")}</div>
          </div>
        )}
        {/* close button visible only on mobile drawer */}
        <button
          className="btn btn-ghost btn-icon btn-sm sidebar-close-btn"
          onClick={close}
          aria-label="Close menu"
          type="button"
          style={{ display: "none", color: "var(--muted)" }}
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <nav className="scroll-y" style={{ flex: 1, padding: "8px 8px 12px" }}>
        {!collapsed && <div style={{ padding: "8px 10px 6px" }} className="eyebrow">{t("nav.workspace")}</div>}
        {NAV.filter((n) => !n.adminOnly || user.role === "admin").map((item) => {
          const active = pathname?.startsWith(item.href);
          const label = t(item.labelKey);
          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? label : ""}
              onClick={close}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: collapsed ? "9px 12px" : "8px 10px", height: 36, borderRadius: 8,
                background: active ? "var(--panel)" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-2)",
                font: `${active ? 500 : 400} 13px/1 var(--font-sans)`,
                marginBottom: 2, textAlign: "left",
                boxShadow: active ? "var(--shadow-sm)" : "none",
                border: active ? "0.5px solid var(--line)" : "0.5px solid transparent",
                justifyContent: collapsed ? "center" : "flex-start",
                textDecoration: "none",
              }}
            >
              <Icon name={item.icon} size={15} stroke={1.5}
                style={{ color: active ? "var(--accent)" : "var(--muted)" }} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}

        {!collapsed && recents.length > 0 && (
          <>
            <div style={{ padding: "16px 10px 6px" }} className="eyebrow">{t("nav.recents")}</div>
            {recents.slice(0, 5).map((c) => (
              <RecentItem key={c.id} chat={c} onNavigate={close} t={t} />
            ))}
          </>
        )}
      </nav>

      <div style={{ padding: 8, borderTop: "0.5px solid var(--line)", flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: collapsed ? "8px 6px" : "8px 10px", borderRadius: 8,
        }}>
          <Avatar name={user.full_name || user.email} size={26} />
          {!collapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ font: "500 12.5px/1.2 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.full_name || user.email}
              </div>
              <div className="mono" style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: ".06em" }}>{user.role}</div>
            </div>
          )}
          {!collapsed && (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={logout} title="Sign out" type="button" style={{ color: "var(--muted)" }}>
              <Icon name="ext" size={13} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <button
            className="btn btn-ghost btn-sm sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            type="button"
            style={{ flex: 1, color: "var(--muted)", justifyContent: collapsed ? "center" : "flex-start" }}
          >
            <Icon name={collapsed ? "side_expand" : "side_collapse"} size={13} />
            {!collapsed && <span>{t("nav.collapse")}</span>}
          </button>
          {!collapsed && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setLang(lang === "th" ? "en" : "th")}
              title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              style={{ color: "var(--muted)", padding: "0 10px" }}
            >
              <Icon name="globe" size={12} />
              <span className="mono" style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                {lang === "th" ? "TH" : "EN"}
              </span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function RecentItem({ chat, onNavigate, t }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isActive = searchParams.get("c") === chat.id;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(chat.title || "");
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  async function saveRename() {
    const next = name.trim();
    if (!next || next === chat.title) { setEditing(false); setName(chat.title || ""); return; }
    setBusy(true);
    const r = await fetch(`/api/chats/${chat.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    setBusy(false);
    setEditing(false);
    if (r.ok) router.refresh();
    else setName(chat.title || "");
  }

  async function remove() {
    if (!window.confirm(t("recents.deleteConfirm"))) return;
    setBusy(true);
    const r = await fetch(`/api/chats/${chat.id}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) {
      if (isActive) router.push("/chat");
      router.refresh();
    }
  }

  async function togglePin() {
    setBusy(true);
    const r = await fetch(`/api/chats/${chat.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: !chat.pinned }),
    });
    setBusy(false);
    if (r.ok) router.refresh();
  }

  if (editing) {
    return (
      <div style={{ padding: "2px 6px" }}>
        <input
          ref={inputRef}
          className="input"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveRename();
            if (e.key === "Escape") { setEditing(false); setName(chat.title || ""); }
          }}
          onBlur={saveRename}
          style={{ height: 28, font: "400 12.5px/1 var(--font-sans)" }}
        />
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        borderRadius: 6, paddingRight: 4,
        background: hover ? "var(--hover)" : "transparent",
      }}
    >
      {chat.pinned && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex", paddingLeft: 8, flexShrink: 0,
            color: "var(--accent)",
          }}
        >
          <Icon name="pin" size={11} fill="currentColor" stroke={1.25} />
        </span>
      )}
      <Link
        href={`/chat?c=${chat.id}`}
        onClick={onNavigate}
        title={chat.title}
        style={{
          flex: 1, minWidth: 0, display: "block",
          padding: chat.pinned ? "6px 10px 6px 6px" : "6px 10px", height: 28,
          color: isActive ? "var(--ink)" : "var(--muted)",
          font: `${isActive ? 500 : 400} 12.5px/1.4 var(--font-sans)`,
          textAlign: "left", overflow: "hidden", textDecoration: "none",
          whiteSpace: "nowrap", textOverflow: "ellipsis",
        }}
      >
        {chat.title}
      </Link>
      {hover && (
        <>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={togglePin}
            title={chat.pinned ? t("recents.unpin") : t("recents.pin")}
            disabled={busy}
            style={{ width: 22, height: 22, color: chat.pinned ? "var(--accent)" : "var(--muted)" }}
          >
            <Icon name="pin" size={11} fill={chat.pinned ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => { setName(chat.title || ""); setEditing(true); }}
            title={t("recents.rename")}
            disabled={busy}
            style={{ width: 22, height: 22, color: "var(--muted)" }}
          >
            <Icon name="edit" size={11} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={remove}
            title={t("recents.delete")}
            disabled={busy}
            style={{ width: 22, height: 22, color: "var(--muted)" }}
          >
            <Icon name="trash" size={11} />
          </button>
        </>
      )}
    </div>
  );
}

export function PageHeader({ title, crumb, children }) {
  const { toggle } = useSidebar();
  return (
    <div className="page-hd">
      <div className="page-hd-l">
        <button
          className="btn btn-ghost btn-icon btn-sm hamburger"
          onClick={toggle}
          aria-label="Open menu"
          type="button"
          style={{ marginRight: 2, color: "var(--muted)" }}
        >
          <Icon name="menu" size={16} />
        </button>
        <h1>{title}</h1>
        {crumb && <span className="crumb">{crumb}</span>}
      </div>
      <div className="page-hd-r" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {children}
      </div>
    </div>
  );
}
