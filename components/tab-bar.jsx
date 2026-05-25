"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";
import { useLang } from "./lang-context";

export function TabBar({ role }) {
  const pathname = usePathname();
  const { t } = useLang();
  const tabs = [
    { id: "chat", href: "/chat", icon: "chat", label: t("nav.chat") },
    { id: "dashboard", href: "/dashboard", icon: "dashboard", label: t("nav.dashboard") },
    ...(role === "admin" ? [{ id: "admin", href: "/admin", icon: "shield", label: t("nav.admin") }] : []),
    { id: "settings", href: "/settings", icon: "cog", label: t("nav.settings") },
  ];
  return (
    <div className="m-tabbar">
      <div style={{ display: "flex", padding: "8px 8px 4px" }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          return (
            <Link key={tab.id} href={tab.href} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "6px 0", textDecoration: "none",
              color: active ? "var(--accent-ink)" : "var(--muted)",
            }}>
              <Icon name={tab.icon} size={22} stroke={1.5} />
              <span style={{ font: `${active ? 600 : 500} 10.5px/1 var(--font-sans)` }}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
