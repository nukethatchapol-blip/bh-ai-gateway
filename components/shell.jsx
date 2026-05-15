"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
              <Link
                key={c.id}
                href={`/chat?c=${c.id}`}
                onClick={close}
                style={{
                  width: "100%", display: "block", padding: "6px 10px", height: 28,
                  background: "transparent", color: "var(--muted)",
                  font: "400 12.5px/1 var(--font-sans)",
                  textAlign: "left", overflow: "hidden", textDecoration: "none",
                  whiteSpace: "nowrap", textOverflow: "ellipsis", borderRadius: 6,
                }}
              >
                {c.title}
              </Link>
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
