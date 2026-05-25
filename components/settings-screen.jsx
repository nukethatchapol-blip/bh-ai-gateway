"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, Icon, RoleBadge } from "./ui";
import { NavBar, GroupCard, SectionHeader, MToggle } from "./mobile-ui";
import { useLang } from "./lang-context";
import { EXTERNAL_APPS } from "@/lib/apps";

function Row({ icon, label, href, external, right, onClick }) {
  const inner = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", cursor: "pointer" }}>
      <Icon name={icon} size={16} stroke={1.6} style={{ color: "var(--muted)" }} />
      <span style={{ flex: 1, font: "400 15px/1 var(--font-sans)", color: "var(--ink)" }}>{label}</span>
      {right}
      {(href || external) && <Icon name={external ? "ext" : "chevright"} size={13} style={{ color: "var(--muted-2)" }} />}
    </div>
  );
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", borderBottom: "0.5px solid var(--line-2)" }}>{inner}</a>;
  if (href) return <Link href={href} style={{ textDecoration: "none", display: "block", borderBottom: "0.5px solid var(--line-2)" }}>{inner}</Link>;
  return <div onClick={onClick} style={{ borderBottom: "0.5px solid var(--line-2)" }}>{inner}</div>;
}

export function SettingsScreen({ profile }) {
  const router = useRouter();
  const { t, lang, setLang } = useLang();
  const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `theme=${next}; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`;
    router.refresh();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/"); router.refresh();
  }

  return (
    <>
      <NavBar title={t("nav.settings")} />
      <SectionHeader>{t("settings.account")}</SectionHeader>
      <GroupCard>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
          <Avatar name={profile.full_name || profile.email} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "600 15px/1.2 var(--font-sans)" }}>{profile.full_name || profile.email}</div>
            <div className="mono" style={{ font: "400 11.5px/1 var(--font-mono)", color: "var(--muted)", marginTop: 4 }}>{profile.email}</div>
          </div>
          <RoleBadge role={profile.role} />
        </div>
      </GroupCard>

      <SectionHeader>{t("settings.workspace")}</SectionHeader>
      <GroupCard>
        <Row icon="key" label={t("nav.apikeys")} href="/apikeys" />
        {profile.role === "admin" && <Row icon="store" label={t("nav.access")} href="/access" />}
      </GroupCard>

      <SectionHeader>{t("apps.group")}</SectionHeader>
      <GroupCard>
        {EXTERNAL_APPS.map((app) => (
          <Row key={app.id} icon={app.icon} label={t(app.labelKey)} href={app.url} external />
        ))}
      </GroupCard>

      <SectionHeader>{t("settings.appearance")}</SectionHeader>
      <GroupCard>
        <Row icon="sparkles" label={t("settings.darkMode")} right={<MToggle on={isDark} onChange={toggleTheme} label={t("settings.darkMode")} />} />
        <Row icon="globe" label={t("settings.language")} right={
          <button type="button" onClick={() => setLang(lang === "th" ? "en" : "th")}
            className="mono" style={{ border: 0, background: "var(--bg-2)", color: "var(--ink-2)", padding: "4px 10px", borderRadius: 6, font: "500 11px/1 var(--font-mono)", cursor: "pointer" }}>
            {lang === "th" ? "ไทย" : "EN"}
          </button>
        } />
      </GroupCard>

      <div style={{ padding: "20px 16px 8px" }}>
        <button type="button" onClick={logout} style={{
          width: "100%", height: 46, borderRadius: 12, border: "0.5px solid var(--line)",
          background: "var(--panel)", color: "oklch(0.55 0.18 25)", font: "600 14px/1 var(--font-sans)", cursor: "pointer",
        }}>{t("nav.signout")}</button>
      </div>
    </>
  );
}
