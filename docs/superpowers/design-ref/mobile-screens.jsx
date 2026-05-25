// mobile-screens.jsx — Mobile (iOS) views of every BEARHOUSE AI Gateway screen.
// Renders content INSIDE <IOSDevice>; no shared chrome, each frame is fully self-contained.

const { useState: useStateM, useMemo: useMemoM } = React;

// ─────────────────────────────────────────────────────────────
// Local design tokens (mirrors the desktop warm palette) — light + dark
// ─────────────────────────────────────────────────────────────
const M_LIGHT = {
  bg: "#faf7f1",
  bg2: "#f3ede0",
  panel: "#ffffff",
  ink: "#1c1611",
  ink2: "#44372a",
  muted: "#8a7a63",
  muted2: "#b4a387",
  line: "#ece3d0",
  line2: "#f4ecdb",
  cream: "#f7e9c5",
  cream2: "#fbf2dc",
  accent: "oklch(0.58 0.11 60)",
  accentSoft: "oklch(0.58 0.11 60 / 0.13)",
  accentInk: "oklch(0.36 0.09 55)",
  brownDark: "#1c1308",
  tabBg: "rgba(250,247,241,0.88)",
  composerBg: "rgba(250,247,241,0.92)",
  scrim: "rgba(0,0,0,0.4)",
  toggleOff: "#dcd2bb",
  font: '-apple-system, "SF Pro Display", system-ui, sans-serif',
  mono: '"SF Mono", ui-monospace, Menlo, monospace',
  isDark: false,
};

const M_DARK = {
  bg: "#14100b",
  bg2: "#1c1610",
  panel: "#1f1812",
  ink: "#faf2dc",
  ink2: "#e0d2b3",
  muted: "#a99576",
  muted2: "#766651",
  line: "#2a2118",
  line2: "#221a13",
  cream: "#f7e9c5",
  cream2: "#fbf2dc",
  accent: "oklch(0.72 0.13 65)",
  accentSoft: "oklch(0.72 0.13 65 / 0.18)",
  accentInk: "oklch(0.84 0.11 70)",
  brownDark: "#0d0805",
  tabBg: "rgba(20,16,11,0.85)",
  composerBg: "rgba(20,16,11,0.92)",
  scrim: "rgba(0,0,0,0.6)",
  toggleOff: "#3a2f23",
  font: '-apple-system, "SF Pro Display", system-ui, sans-serif',
  mono: '"SF Mono", ui-monospace, Menlo, monospace',
  isDark: true,
};

// Mutable current-theme reference + Proxy so every `M.foo` lookup
// reads the live token. Re-renders of MobileApp drive UI updates.
let _BHM_CUR = M_LIGHT;
function setMobileTheme(name) { _BHM_CUR = name === "dark" ? M_DARK : M_LIGHT; }
const M = new Proxy({}, { get: (_, k) => _BHM_CUR[k] });

// shared safe-area top: 56px clears status bar / dynamic island
const SAFE_TOP = 56;
// home-indicator clearance for bottom-fixed elements
const SAFE_BOTTOM = 34;

// ─────────────────────────────────────────────────────────────
// Tiny shared atoms
// ─────────────────────────────────────────────────────────────
function MIcon({ name, size = 16, stroke = 1.6 }) {
  const paths = {
    chat:      "M2.5 7.5a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H5.5L2.5 14V7.5z",
    dash:      "M3 3h4v6H3z M9 3h4v3H9z M3 11h4v2H3z M9 8h4v5H9z",
    settings:  "M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M8 1v1.5 M8 13.5V15 M1 8h1.5 M13.5 8H15 M3 3l1 1 M12 12l1 1 M3 13l1-1 M12 4l1-1",
    shield:    "M8 1.5 2.5 4v4.5C2.5 12 5 13.8 8 14.5c3-.7 5.5-2.5 5.5-6V4L8 1.5z",
    sparkles:  "M8 2v3 M8 11v3 M2 8h3 M11 8h3 M4 4l2 2 M12 12l-2-2 M4 12l2-2 M12 4l-2 2",
    plus:      "M8 3v10 M3 8h10",
    chev:      "M6 4l4 4-4 4",
    chevdown:  "M4 6l4 4 4-4",
    chevup:    "M4 10l4-4 4 4",
    send:      "M2.5 8 14 3 9 14l-2-5-4.5-1z",
    search:    "M11 11 14 14 M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
    paperclip: "M11.5 7.5 7 12a3 3 0 1 1-4.2-4.2L8 2.6a2 2 0 1 1 2.8 2.8L5.6 10.6a1 1 0 1 1-1.4-1.4L9 4.4",
    check:     "M3 8.5 6.5 12 13 4.5",
    close:     "M4 4l8 8 M12 4l-8 8",
    store:     "M2 6h12 M2.5 6 4 2.5h8L13.5 6 M3 6v8h10V6 M6.5 14v-4h3v4",
    bolt:      "M9 2 3 9h4l-1 5 6-7H8l1-5z",
    key:       "M10.5 3a3 3 0 1 1-2.7 4.3L3 12v2h2l.5-.5V12H7v-1.5L8.5 9 M11 5.5h.01",
    arrow_up:  "M8 13V3 M3.5 7.5 8 3l4.5 4.5",
    arrow_down:"M8 3v10 M3.5 8.5 8 13l4.5-4.5",
    google:    "M8 6.7V9.2h3.5c-.15.9-.6 1.65-1.3 2.15v1.8h2.1C13.55 12 14.3 10.4 14.3 8.4c0-.55-.05-1.1-.15-1.6z M8 14.5c1.75 0 3.2-.6 4.3-1.55l-2.1-1.65c-.6.4-1.35.65-2.2.65-1.7 0-3.1-1.15-3.6-2.7H2.25v1.7A6.5 6.5 0 0 0 8 14.5z M4.4 9.2c-.15-.4-.2-.85-.2-1.3s.05-.9.2-1.3v-1.7H2.25C1.85 5.7 1.6 6.85 1.6 8s.25 2.3.65 3.1L4.4 9.2z M8 4.7c1 0 1.9.35 2.6 1l1.95-1.95C11.2 2.6 9.75 2 8 2A6.5 6.5 0 0 0 2.25 5.6L4.4 7.3c.5-1.55 1.9-2.6 3.6-2.6z",
    download:  "M8 2v8 M4.5 7 8 10.5 11.5 7 M3 13.5h10",
    filter:    "M2 3.5h12 M4 7.5h8 M6 11.5h4",
    bell:      "M3 12V8a5 5 0 0 1 10 0v4l1 1H2l1-1z M7 14a1.5 1.5 0 0 0 2 0",
    user:      "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2.5 14a5.5 5.5 0 0 1 11 0",
    pin:       "M9.5 1.5 14.5 6.5 12 9l-1 4-3-3-4 4 4-4-3-3 4-2.5z",
    pin_fill:  "M9.5 1.5 14.5 6.5 12 9l-1 4-3-3-4 4 4-4-3-3 4-2.5z",
    unpin:     "M2 2l12 12 M9.5 1.5 14.5 6.5 12 9l-1 4-3-3-4 4 4-4-3-3 4-2.5z",
  };
  const d = paths[name] || "";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={name === "google" ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth={name === "google" ? 0 : stroke}
      strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

function MAvatar({ name = "?", size = 30 }) {
  const initials = name.split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = [12, 35, 68, 110, 155, 195, 225, 265, 305, 340][h % 10];
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0,
      background: `oklch(0.92 0.06 ${hue})`, color: `oklch(0.32 0.1 ${hue})`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      font: `600 ${Math.round(size * 0.4)}px/1 ${M.font}`,
    }}>{initials}</div>
  );
}

function BearChip({ size = 36, radius = 10 }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: M.cream, overflow: "hidden",
    }}>
      <img src="assets/bearhouse-logo.png" width={Math.round(size * 1.05)} height={Math.round(size * 1.05)} alt="" style={{ display: "block" }} />
    </span>
  );
}

function MSparkline({ data, w = 60, h = 22, color = M.accent }) {
  const min = Math.min(...data), max = Math.max(...data);
  const dy = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / dy) * (h - 4) - 2]);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={color} opacity="0.15" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Pill
function MPill({ children, accent, mono, style }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, height: 22, padding: "0 9px",
      borderRadius: 999, font: `${mono ? "500" : "500"} 11px/1 ${mono ? M.mono : M.font}`,
      background: accent ? M.accentSoft : M.bg2, color: accent ? M.accentInk : M.ink2,
      ...style,
    }}>{children}</span>
  );
}

function MSafeBody({ children, pad = true, style }) {
  return (
    <div style={{
      height: "100%", paddingTop: SAFE_TOP, background: M.bg,
      color: M.ink, font: `400 15px/1.4 ${M.font}`, overflow: "hidden",
      display: "flex", flexDirection: "column",
      ...style,
    }}>
      {children}
    </div>
  );
}

// Bottom tab bar — iOS style
function MTabBar({ active = "chat", onChange = () => {}, admin = false }) {
  const tabs = [
    { id: "chat",      label: "Chat",      icon: "chat" },
    { id: "dash",      label: "Dashboard", icon: "dash" },
    ...(admin ? [{ id: "admin", label: "Admin", icon: "shield" }] : []),
    { id: "settings",  label: "Settings",  icon: "settings" },
  ];
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 30,
      paddingBottom: SAFE_BOTTOM, background: M.tabBg,
      backdropFilter: "blur(20px) saturate(180%)",
      borderTop: `0.5px solid ${M.line}`,
    }}>
      <div style={{ display: "flex", padding: "8px 8px 4px" }}>
        {tabs.map(t => {
          const a = t.id === active;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "6px 0", border: 0, background: "transparent",
              color: a ? M.accentInk : M.muted, cursor: "default",
            }}>
              <MIcon name={t.icon} size={22} stroke={1.5} />
              <span style={{ font: `${a ? 600 : 500} 10.5px/1 ${M.font}` }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Top large-title bar with optional trailing action
function MNavBar({ title, sub, trailing, leading, large = true }) {
  return (
    <div style={{ padding: "8px 20px 8px", position: "relative", zIndex: 5, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 32 }}>
        {leading || <span style={{ width: 32 }} />}
        {!large && (
          <div style={{ font: `600 17px/1.2 ${M.font}`, color: M.ink, textAlign: "center", flex: 1 }}>
            {title}{sub && <div style={{ font: `400 11px/1 ${M.font}`, color: M.muted, marginTop: 3 }}>{sub}</div>}
          </div>
        )}
        {trailing || <span style={{ width: 32 }} />}
      </div>
      {large && (
        <div style={{ marginTop: 6 }}>
          <h1 style={{ font: `700 30px/1.15 ${M.font}`, letterSpacing: "-0.02em", margin: 0, color: M.ink }}>{title}</h1>
          {sub && <div style={{ font: `400 13px/1.3 ${M.font}`, color: M.muted, marginTop: 4 }}>{sub}</div>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1) LOGIN
// ─────────────────────────────────────────────────────────────
function MLogin() {
  return (
    <div style={{
      height: "100%", background: M.brownDark, color: M.cream2,
      font: `400 15px/1.4 ${M.font}`, paddingTop: SAFE_TOP,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <BearChip size={36} />
        <div className="mono" style={{ font: `600 11px/1 ${M.mono}`, letterSpacing: ".1em", textTransform: "uppercase", opacity: .7 }}>BEARHOUSE</div>
      </div>

      <div style={{ flex: 1, padding: "0 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h1 style={{ font: `500 38px/1.05 ${M.font}`, letterSpacing: "-0.025em", margin: 0, color: M.cream2 }}>
          ai-store<br /><span style={{ color: "#e2a55a" }}>assistant.</span>
        </h1>
      </div>

      <div style={{ padding: "0 20px", paddingBottom: SAFE_BOTTOM + 18, display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={{
          appearance: "none", border: 0, height: 52, borderRadius: 14,
          background: M.cream2, color: M.brownDark, font: `600 16px/1 ${M.font}`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "default",
        }}>
          <MIcon name="google" size={18} stroke={0} />
          Continue with Google
        </button>
        <button style={{
          appearance: "none", height: 52, borderRadius: 14,
          background: "transparent", color: M.cream2,
          border: "1px solid rgba(251,242,220,.18)", font: `500 16px/1 ${M.font}`, cursor: "default",
        }}>
          Sign in with email
        </button>
        <div style={{ textAlign: "center", marginTop: 6, font: `400 13px/1 ${M.font}`, color: "rgba(251,242,220,.55)" }}>
          New? <span style={{ color: "#e2a55a", fontWeight: 500 }}>Request access</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2) CHAT LIST (Home) — with pin system
// ─────────────────────────────────────────────────────────────
function MChatList() {
  // demo state: c1 and c3 are pinned, c5 shows a peeked swipe action
  const [pinned, setPinned] = useStateM(new Set(["c1", "c3"]));
  const togglePin = (id) => {
    const next = new Set(pinned);
    next.has(id) ? next.delete(id) : next.add(id);
    setPinned(next);
  };
  const pinnedChats = CHATS.filter(c => pinned.has(c.id));
  const recentChats = CHATS.filter(c => !pinned.has(c.id));

  return (
    <MSafeBody>
      <MNavBar title="Chats" sub="5 branches in scope · Manager"
        leading={<MAvatar name="Nicha Phongthep" size={32} />}
        trailing={<button style={btnRound()}><MIcon name="plus" size={18} stroke={1.8} /></button>} />

      {/* search */}
      <div style={{ padding: "4px 16px 12px", flexShrink: 0 }}>
        <div style={{
          height: 36, borderRadius: 10, background: M.bg2, display: "flex", alignItems: "center",
          padding: "0 12px", gap: 8,
        }}>
          <MIcon name="search" size={15} stroke={1.5} />
          <span style={{ color: M.muted, font: `400 15px/1 ${M.font}` }}>Search chats</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 0 100px" }}>
        {/* skills chips */}
        <div style={{ padding: "0 16px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <SkillChip active>All</SkillChip>
          <SkillChip>Data Analyst</SkillChip>
          <SkillChip>Strategy</SkillChip>
        </div>

        {/* PINNED section */}
        {pinnedChats.length > 0 && (
          <>
            <SectionHeader>
              <MIcon name="pin_fill" size={11} stroke={0} style={{ transform: "rotate(45deg)" }} />
              <span>Pinned · {pinnedChats.length}</span>
            </SectionHeader>
            <div style={{
              margin: "0 16px",
              background: M.panel, borderRadius: 14, overflow: "hidden",
              border: `0.5px solid ${M.line}`,
              boxShadow: M.isDark ? "none" : "0 1px 0 rgba(180,140,80,.04)",
            }}>
              {pinnedChats.map((c, i) => (
                <ChatRow key={c.id} c={c} pinned
                  last={i === pinnedChats.length - 1}
                  onUnpin={() => togglePin(c.id)} />
              ))}
            </div>
          </>
        )}

        {/* RECENT section */}
        <SectionHeader>
          <span>Recent · {recentChats.length}</span>
          <span style={{ marginLeft: "auto", color: M.muted2 }}>swipe → to pin</span>
        </SectionHeader>
        <div style={{
          margin: "0 16px",
          background: M.panel, borderRadius: 14, overflow: "hidden",
          border: `0.5px solid ${M.line}`,
        }}>
          {recentChats.map((c, i) => (
            <ChatRow key={c.id} c={c}
              swipeRevealed={i === 0}
              last={i === recentChats.length - 1}
              onPin={() => togglePin(c.id)} />
          ))}
        </div>

        <SectionHeader>Quick start</SectionHeader>
        <div style={{ margin: "0 16px", background: M.panel, borderRadius: 14, border: `0.5px solid ${M.line}`, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: M.accentSoft, color: M.accentInk, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MIcon name="sparkles" size={14} />
            </div>
            <div style={{ font: `600 14px/1 ${M.font}`, color: M.ink }}>Ask the analyst</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["How did matcha sales trend last week?", "Which branch had the biggest jump?", "Inventory at risk in next 3 days?"].map((q, i) => (
              <button key={i} style={{
                appearance: "none", border: `0.5px solid ${M.line}`, background: M.bg2,
                borderRadius: 10, padding: "10px 12px", textAlign: "left",
                font: `400 13.5px/1.35 ${M.font}`, color: M.ink2, cursor: "default",
              }}>{q}</button>
            ))}
          </div>
        </div>
      </div>

      <MTabBar active="chat" admin />
    </MSafeBody>
  );
}

// Section header (uppercase mono) — used by chat list groups
function SectionHeader({ children }) {
  return (
    <div style={{
      padding: "18px 20px 8px", display: "flex", alignItems: "center", gap: 5,
      font: `500 11px/1 ${M.mono}`, color: M.muted,
      letterSpacing: ".08em", textTransform: "uppercase",
    }}>{children}</div>
  );
}

// Chat list row — supports pinned glyph + swipe-revealed pin action
function ChatRow({ c, pinned, last, swipeRevealed, onPin, onUnpin }) {
  const skill = SKILLS.find(s => s.id === c.skill);
  const branch = BRANCHES.find(b => b.id === c.branch);
  const isStrategy = c.skill === "strategy";

  // When swipeRevealed, the row is shifted left to expose a pin button on the right.
  const shift = swipeRevealed ? -72 : 0;

  return (
    <div style={{ position: "relative", borderBottom: last ? "none" : `0.5px solid ${M.line2}` }}>
      {/* revealed action behind */}
      {swipeRevealed && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", justifyContent: "flex-end", alignItems: "stretch",
          background: M.accent, color: "#fff",
        }}>
          <div style={{
            width: 72, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <MIcon name="pin_fill" size={20} stroke={0} style={{ transform: "rotate(45deg)" }} />
            <span style={{ font: `600 11px/1 ${M.font}` }}>Pin</span>
          </div>
        </div>
      )}

      {/* row body */}
      <div onClick={pinned ? onUnpin : onPin} style={{
        position: "relative", background: M.panel,
        display: "flex", gap: 12, padding: "12px 16px",
        transform: `translateX(${shift}px)`,
        transition: "transform 150ms cubic-bezier(.4,.1,.3,1)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: isStrategy ? "oklch(0.92 0.05 25 / 0.6)" : M.accentSoft,
          color: isStrategy
            ? (M.isDark ? "oklch(0.8 0.13 25)" : "oklch(0.42 0.16 25)")
            : M.accentInk,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <MIcon name="sparkles" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }}>
              {pinned && (
                <span style={{ color: M.accent, flexShrink: 0, display: "inline-flex" }}>
                  <MIcon name="pin_fill" size={11} stroke={0} style={{ transform: "rotate(45deg)" }} />
                </span>
              )}
              <div style={{
                font: `600 14.5px/1.25 ${M.font}`, color: M.ink,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{c.title}</div>
            </div>
            <div style={{ font: `400 11.5px/1 ${M.font}`, color: M.muted, flexShrink: 0 }}>{c.time}</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 5, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ font: `400 12.5px/1 ${M.font}`, color: M.muted }}>{skill.name}</span>
            <span style={{ color: M.muted2 }}>·</span>
            <span style={{ font: `500 11.5px/1 ${M.mono}`, color: M.muted }}>{branch ? branch.id : c.branch}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillChip({ children, active }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", height: 28, padding: "0 12px",
      borderRadius: 999, font: `500 12.5px/1 ${M.font}`,
      background: active ? M.ink : "transparent",
      color: active ? M.bg : M.ink2,
      border: active ? "0.5px solid transparent" : `0.5px solid ${M.line}`,
    }}>{children}</span>
  );
}

function btnRound() {
  return {
    width: 32, height: 32, borderRadius: 999, border: `0.5px solid ${M.line}`,
    background: M.panel, color: M.ink, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "default",
  };
}

// ─────────────────────────────────────────────────────────────
// 3) ACTIVE CHAT (conversation + composer)
// ─────────────────────────────────────────────────────────────
function MChatConversation() {
  return (
    <MSafeBody>
      {/* compact nav */}
      <div style={{ padding: "8px 14px 10px", display: "flex", alignItems: "center", gap: 10, borderBottom: `0.5px solid ${M.line2}`, flexShrink: 0 }}>
        <button style={btnRound()}><MIcon name="chev" size={14} stroke={2} style={{ transform: "scaleX(-1)" }} /></button>
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <div style={{ font: `600 14px/1.2 ${M.font}`, color: M.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Q2 brown sugar boba…</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4, padding: "2px 8px", borderRadius: 999, background: M.accentSoft, color: M.accentInk, font: `500 10.5px/1 ${M.mono}` }}>
            <MIcon name="store" size={10} stroke={1.6} />
            BKK-002 · Siam Square
          </div>
        </div>
        <button style={btnRound()}><MIcon name="search" size={14} /></button>
      </div>

      {/* messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 16px 200px" }}>
        {/* user bubble */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <div style={{
            maxWidth: "84%", padding: "10px 14px", borderRadius: 18, borderBottomRightRadius: 5,
            background: M.ink, color: M.bg2, font: `400 14.5px/1.4 ${M.font}`,
          }}>How did brown sugar boba do at Siam Square last week vs the prior week?</div>
        </div>

        {/* assistant header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 999, background: M.accentSoft, color: M.accentInk,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><MIcon name="sparkles" size={12} /></div>
          <div style={{ font: `600 12px/1 ${M.font}` }}>Data Analyst</div>
          <div style={{ font: `400 11px/1 ${M.mono}`, color: M.muted }}>· Claude Sonnet 4.5</div>
        </div>

        {/* tool call */}
        <div style={{
          marginBottom: 10, padding: "8px 11px", borderRadius: 10,
          background: M.bg2, border: `0.5px solid ${M.line2}`,
          display: "flex", alignItems: "center", gap: 7,
          font: `400 11.5px/1.4 ${M.mono}`, color: M.muted,
        }}>
          <MIcon name="bolt" size={11} stroke={1.6} />
          <span style={{ color: M.ink2, fontWeight: 500 }}>supabase.query</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>WHERE branch_id = 'BKK-002'</span>
          <span style={{ color: M.accentInk }}>412ms</span>
        </div>

        <div style={{ font: `400 14.5px/1.55 ${M.font}`, color: M.ink2, marginBottom: 10 }}>
          Brown Sugar Boba at <span style={{ background: M.accentSoft, color: M.accentInk, padding: "1px 6px", borderRadius: 5, font: `500 12.5px/1 ${M.font}` }}>BKK-002</span> was up <b>+11.4%</b> WoW — driven mostly by weekday afternoons (2-4pm).
        </div>

        {/* mini table */}
        <div style={{ borderRadius: 10, border: `0.5px solid ${M.line}`, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px", padding: "8px 12px",
            font: `500 10.5px/1 ${M.mono}`, color: M.muted, textTransform: "uppercase",
            letterSpacing: ".06em", background: M.bg2, borderBottom: `0.5px solid ${M.line}` }}>
            <span>Window</span><span style={{ textAlign: "right" }}>Units</span><span style={{ textAlign: "right" }}>Δ</span>
          </div>
          {[["This week", "1,284", "+11.4%"], ["Prev week", "1,153", "—"], ["4-wk avg", "1,167", "+9.6%"]].map((r, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 80px 60px", padding: "9px 12px",
              font: `400 13.5px/1 ${M.font}`, color: M.ink2,
              borderBottom: i < 2 ? `0.5px solid ${M.line2}` : "none",
            }}>
              <span style={{ fontWeight: 500, color: M.ink }}>{r[0]}</span>
              <span className="mono" style={{ textAlign: "right", fontFamily: M.mono }}>{r[1]}</span>
              <span className="mono" style={{ textAlign: "right", fontFamily: M.mono, color: r[2].startsWith("+") ? M.accentInk : M.muted }}>{r[2]}</span>
            </div>
          ))}
        </div>

        <div style={{ font: `400 14.5px/1.55 ${M.font}`, color: M.ink2 }}>
          Want me to run the same cut for <span style={{ background: M.bg2, font: `500 12.5px/1 ${M.mono}`, padding: "1px 5px", borderRadius: 4 }}>Matcha Latte</span> or compare against CentralWorld?
        </div>

        {/* action row */}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {["arrow_up", "arrow_down", "download"].map((i, j) => (
            <button key={j} style={{ ...btnRound(), width: 30, height: 30 }}><MIcon name={i} size={13} /></button>
          ))}
        </div>
      </div>

      {/* composer */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 20,
        paddingBottom: SAFE_BOTTOM + 6, paddingTop: 10, paddingLeft: 12, paddingRight: 12,
        background: M.composerBg, backdropFilter: "blur(20px)",
        borderTop: `0.5px solid ${M.line}`,
      }}>
        <div style={{
          background: M.panel, border: `0.5px solid ${M.line}`, borderRadius: 22,
          boxShadow: "0 4px 16px rgba(0,0,0,.04)",
        }}>
          <div style={{ padding: "12px 16px 4px", font: `400 14px/1.4 ${M.font}`, color: M.muted2 }}>
            Ask the analyst about BKK-002…
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px 6px 10px" }}>
            <button style={pill()}><MIcon name="paperclip" size={13} /></button>
            <button style={pill()}>
              <MIcon name="sparkles" size={12} /><span style={{ color: M.accentInk }}>Analyst</span>
            </button>
            <button style={pill()}>
              <span style={{ font: `500 10.5px/1 ${M.mono}`, color: M.muted }}>CLAU</span>
              <span>Sonnet 4.5</span>
              <MIcon name="chevdown" size={10} />
            </button>
            <div style={{ flex: 1 }} />
            <button style={{
              width: 32, height: 32, borderRadius: 999, border: 0,
              background: M.ink, color: M.bg, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "default", opacity: 0.4,
            }}><MIcon name="send" size={14} /></button>
          </div>
        </div>
      </div>
    </MSafeBody>
  );
}

function pill() {
  return {
    display: "inline-flex", alignItems: "center", gap: 5, height: 28, padding: "0 10px",
    borderRadius: 999, border: 0, background: "transparent",
    color: M.ink2, font: `500 12px/1 ${M.font}`, cursor: "default",
  };
}

// ─────────────────────────────────────────────────────────────
// 4) BOTTOM SHEET — SKILL / MODEL / BRANCH PICKER (variant)
// ─────────────────────────────────────────────────────────────
function MChatPicker() {
  return (
    <MSafeBody style={{ background: M.scrim }}>
      {/* dimmed faux chat behind */}
      <div style={{ flex: 1, opacity: .35, pointerEvents: "none", filter: "blur(1px)" }}>
        <div style={{ height: "100%", background: M.bg, padding: "10px 16px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 16, background: M.ink, color: M.bg2, font: `400 14px/1.35 ${M.font}` }}>How did brown sugar boba do?</div>
          </div>
          <div style={{ padding: "8px 0", font: `400 13.5px/1.4 ${M.font}`, color: M.ink2 }}>Brown Sugar Boba at BKK-002 was up +11.4%…</div>
        </div>
      </div>

      {/* sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 50,
        background: M.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: SAFE_BOTTOM + 4, boxShadow: "0 -20px 60px rgba(0,0,0,.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: M.line }} />
        </div>
        <div style={{ padding: "12px 20px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ font: `600 17px/1.2 ${M.font}` }}>Skill</div>
          <button style={{ appearance: "none", border: 0, background: "transparent", color: M.accentInk, font: `500 14px/1 ${M.font}` }}>Done</button>
        </div>
        <div style={{ font: `400 12.5px/1.4 ${M.font}`, color: M.muted, padding: "0 20px 12px" }}>System prompts maintained by your admin.</div>

        {SKILLS.map((s, i) => {
          const active = i === 0;
          return (
            <div key={s.id} style={{
              margin: "0 16px 8px", padding: 14, borderRadius: 14,
              background: active ? M.accentSoft : M.panel,
              border: active ? "0.5px solid transparent" : `0.5px solid ${M.line}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: active ? "rgba(255,255,255,.55)" : M.bg2,
                  color: active ? M.accentInk : M.muted,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><MIcon name="sparkles" size={14} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `600 14.5px/1.2 ${M.font}`, color: active ? M.accentInk : M.ink }}>{s.name}</div>
                  <div style={{ font: `400 12.5px/1.45 ${M.font}`, color: active ? M.accentInk : M.muted, marginTop: 3, opacity: active ? 0.8 : 1 }}>{s.desc}</div>
                </div>
                {active && <MIcon name="check" size={16} stroke={2} />}
              </div>
              <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                {s.tools.map(t => (
                  <span key={t} style={{
                    font: `500 10.5px/1 ${M.mono}`, padding: "3px 7px", borderRadius: 5,
                    background: active ? "rgba(255,255,255,.45)" : M.bg2, color: M.muted,
                  }}>{t}</span>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{
          margin: "8px 16px 4px", padding: "10px 14px", borderRadius: 12,
          background: M.bg2, border: `0.5px dashed ${M.line}`,
          font: `400 11.5px/1.5 ${M.font}`, color: M.muted, display: "flex", alignItems: "center", gap: 8,
        }}>
          <MIcon name="shield" size={13} />
          Only skills you've been granted appear here.
        </div>
      </div>
    </MSafeBody>
  );
}

// ─────────────────────────────────────────────────────────────
// 5) DASHBOARD
// ─────────────────────────────────────────────────────────────
function MDashboard() {
  return (
    <MSafeBody>
      <MNavBar title="Dashboard" sub="5 of 20 branches in scope"
        leading={<MAvatar name="Nicha Phongthep" size={32} />}
        trailing={<button style={btnRound()}><MIcon name="filter" size={14} /></button>} />

      {/* date range button */}
      <div style={{ padding: "4px 16px 10px", display: "flex", gap: 8, flexShrink: 0 }}>
        <button style={{
          flex: 1, height: 38, borderRadius: 10, border: `0.5px solid ${M.line}`,
          background: M.panel, color: M.ink, font: `500 13.5px/1 ${M.font}`,
          display: "flex", alignItems: "center", gap: 8, padding: "0 12px", cursor: "default",
        }}>
          <MIcon name="dash" size={13} stroke={1.6} style={{ color: M.muted }} />
          <span>May 19 – May 25</span>
          <span style={{
            marginLeft: 4, padding: "2px 6px", borderRadius: 4, background: M.accentSoft,
            color: M.accentInk, font: `500 10.5px/1 ${M.mono}`,
          }}>Last 7d</span>
          <span style={{ flex: 1 }} />
          <MIcon name="chevdown" size={12} stroke={1.6} style={{ color: M.muted }} />
        </button>
        <button style={btnRound()}><MIcon name="download" size={13} /></button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 0 100px" }}>
        {/* scope banner */}
        <div style={{
          margin: "0 16px 12px", padding: "10px 12px", borderRadius: 10,
          background: M.accentSoft, color: M.accentInk,
          display: "flex", alignItems: "center", gap: 8,
          font: `400 12px/1.4 ${M.font}`,
        }}>
          <MIcon name="shield" size={13} />
          Showing data for 5 authorized branches. Others are hidden, not filtered.
        </div>

        {/* KPI cards grid */}
        <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { l: "Revenue", v: "฿1.02M", d: "+8.4%", neg: false, data: [50, 56, 48, 62, 70, 64, 78, 84, 80, 92] },
            { l: "Customers", v: "3,454", d: "+6.2%", neg: false, data: [60, 64, 58, 70, 68, 76, 72, 84, 88, 92] },
            { l: "Avg ticket", v: "฿296", d: "+3.1%", neg: false, data: [50, 52, 55, 53, 58, 60, 62, 65, 64, 68] },
            { l: "Inventory", v: "92.4%", d: "-1.8%", neg: true,  data: [88, 92, 90, 94, 89, 87, 85, 86, 84, 92] },
          ].map((k, i) => (
            <div key={i} style={{
              background: M.panel, border: `0.5px solid ${M.line}`, borderRadius: 14,
              padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ font: `500 10.5px/1 ${M.mono}`, color: M.muted, letterSpacing: ".06em", textTransform: "uppercase" }}>{k.l}</span>
                <span style={{
                  font: `500 10px/1 ${M.mono}`, padding: "2px 5px", borderRadius: 4,
                  background: k.neg ? "oklch(0.95 0.04 25 / 0.5)" : M.accentSoft,
                  color: k.neg ? "oklch(0.55 0.18 25)" : M.accentInk,
                }}>{k.d}</span>
              </div>
              <div style={{ font: `600 22px/1 ${M.font}`, marginTop: 10, letterSpacing: "-0.01em" }}>{k.v}</div>
              <div style={{ marginTop: 8, color: k.neg ? "oklch(0.55 0.18 25)" : M.accent }}>
                <MSparkline data={k.data} w={130} h={20} color="currentColor" />
              </div>
            </div>
          ))}
        </div>

        {/* revenue chart card */}
        <div style={{
          margin: "12px 16px 0", padding: 16, borderRadius: 14,
          background: M.panel, border: `0.5px solid ${M.line}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ font: `600 15px/1.2 ${M.font}` }}>Revenue</div>
              <div style={{ font: `400 11.5px/1 ${M.font}`, color: M.muted, marginTop: 4 }}>5 branches · last 7 days</div>
            </div>
            <div style={{ font: `500 11px/1 ${M.mono}`, color: M.accentInk }}>+8.4%</div>
          </div>

          <svg viewBox="0 0 320 110" style={{ width: "100%", height: 130, marginTop: 12, overflow: "visible" }}>
            {[0, 0.5, 1].map((g, i) => (
              <line key={i} x1="0" x2="320" y1={100 - g * 90} y2={100 - g * 90}
                stroke={M.line2} strokeWidth="1" strokeDasharray={g === 0 ? "" : "2 4"} />
            ))}
            {(() => {
              const data = [62, 70, 68, 80, 74, 92, 86];
              const max = 100;
              const pts = data.map((v, i) => [(i / (data.length - 1)) * 320, 100 - (v / max) * 90]);
              const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
              return (
                <>
                  <defs><linearGradient id="m-rev" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.2"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
                  <g style={{ color: M.accent }}>
                    <path d={`${path} L320,110 L0,110 Z`} fill="url(#m-rev)" />
                    <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
                    {pts.map(([x, y], i) => (
                      <circle key={i} cx={x} cy={y} r="3" fill={M.panel} stroke="currentColor" strokeWidth="1.5" />
                    ))}
                  </g>
                </>
              );
            })()}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, font: `400 10.5px/1 ${M.mono}`, color: M.muted }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
        </div>

        {/* top branches */}
        <div style={{ padding: "20px 20px 4px", font: `500 11px/1 ${M.mono}`, color: M.muted, letterSpacing: ".08em", textTransform: "uppercase" }}>
          Top branches
        </div>
        <div style={{ margin: "0 16px", background: M.panel, border: `0.5px solid ${M.line}`, borderRadius: 14, overflow: "hidden" }}>
          {[
            { id: "BKK-007", name: "CentralWorld", v: "฿298K", d: "+9.8%" },
            { id: "BKK-006", name: "EmQuartier", v: "฿271K", d: "+14.6%" },
            { id: "BKK-002", name: "Siam Square", v: "฿232K", d: "+12.1%" },
            { id: "BKK-003", name: "Asok Term. 21", v: "฿198K", d: "+5.9%" },
            { id: "BKK-001", name: "Sukhumvit 21", v: "฿184K", d: "+8.4%" },
          ].map((r, i, a) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", padding: "12px 14px",
              borderBottom: i < a.length - 1 ? `0.5px solid ${M.line2}` : "none",
            }}>
              <span style={{ width: 24, font: `500 12px/1 ${M.mono}`, color: M.muted }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `500 13.5px/1.2 ${M.font}` }}>{r.name}</div>
                <div style={{ font: `400 10.5px/1 ${M.mono}`, color: M.muted, marginTop: 3 }}>{r.id}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ font: `600 13px/1 ${M.font}`, fontFamily: M.mono }}>{r.v}</div>
                <div style={{ font: `500 11px/1 ${M.mono}`, color: M.accentInk, marginTop: 4 }}>{r.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MTabBar active="dash" admin />
    </MSafeBody>
  );
}

// ─────────────────────────────────────────────────────────────
// 6) ADMIN APPROVALS
// ─────────────────────────────────────────────────────────────
function MAdmin() {
  return (
    <MSafeBody>
      <MNavBar title="Admin" sub={`${PENDING_USERS.length} pending approvals`}
        leading={<MAvatar name="Praya Lertsuk" size={32} />}
        trailing={<MPill accent style={{ height: 24 }}><MIcon name="shield" size={11} /> admin</MPill>} />

      {/* segmented */}
      <div style={{ padding: "4px 16px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", padding: 3, background: M.bg2, borderRadius: 10, gap: 3 }}>
          {["Approvals", "Users", "Skills", "Audit"].map((t, i) => {
            const a = i === 0;
            return (
              <span key={t} style={{
                flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 7,
                font: `${a ? 600 : 500} 12.5px/1 ${M.font}`,
                background: a ? M.panel : "transparent",
                color: a ? M.ink : M.muted,
                boxShadow: a ? "0 1px 2px rgba(0,0,0,.05)" : "none",
              }}>{t}</span>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 16px 100px" }}>
        {PENDING_USERS.map((p, i) => (
          <div key={p.id} style={{
            background: M.panel, border: `0.5px solid ${M.line}`, borderRadius: 14,
            padding: 14, marginBottom: 10,
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <MAvatar name={p.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ font: `600 14.5px/1.2 ${M.font}` }}>{p.name}</span>
                  <MPill style={{ height: 20, background: "oklch(0.94 0.08 80 / 0.5)", color: "oklch(0.45 0.13 70)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} /> pending
                  </MPill>
                </div>
                <div style={{ font: `400 11.5px/1 ${M.mono}`, color: M.muted, marginTop: 5 }}>{p.email}</div>
              </div>
            </div>

            <div style={{
              marginTop: 10, padding: "9px 11px", borderRadius: 9, background: M.bg2,
              font: `400 12.5px/1.5 ${M.font}`, color: M.ink2,
            }}>
              <div style={{ font: `500 10px/1 ${M.mono}`, color: M.muted, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>Requested</div>
              {p.requested}
            </div>

            {p.note && (
              <div style={{ font: `400 12.5px/1.5 ${M.font}`, color: M.muted, marginTop: 8 }}>"{p.note}"</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={{
                flex: 1, appearance: "none", border: 0, height: 38, borderRadius: 10,
                background: M.accent, color: "#fff", font: `600 13.5px/1 ${M.font}`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "default",
              }}>
                <MIcon name="check" size={14} stroke={2} />
                Approve
              </button>
              <button style={{
                flex: 1, appearance: "none", border: `0.5px solid ${M.line}`, height: 38, borderRadius: 10,
                background: M.panel, color: M.ink2, font: `500 13.5px/1 ${M.font}`, cursor: "default",
              }}>Deny</button>
            </div>
          </div>
        ))}

        <div style={{
          marginTop: 4, padding: "12px 14px", borderRadius: 12,
          background: M.bg2, border: `0.5px dashed ${M.line}`,
          font: `400 12px/1.5 ${M.font}`, color: M.muted,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <MIcon name="bell" size={13} />
          You'll be notified when new requests arrive.
        </div>
      </div>

      <MTabBar active="admin" admin />
    </MSafeBody>
  );
}

// ─────────────────────────────────────────────────────────────
// 7) BRANCH ACCESS (admin · user detail)
// ─────────────────────────────────────────────────────────────
function MAccess() {
  const u = USERS[1]; // Nicha
  const granted = new Set(u.branches);
  return (
    <MSafeBody>
      {/* compact nav */}
      <div style={{ padding: "8px 14px 12px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button style={btnRound()}><MIcon name="chev" size={14} stroke={2} style={{ transform: "scaleX(-1)" }} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ font: `400 11px/1 ${M.mono}`, color: M.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>Branch access</div>
          <div style={{ font: `600 17px/1.2 ${M.font}`, marginTop: 3 }}>{u.name}</div>
        </div>
        <button style={{
          ...btnRound(), width: "auto", padding: "0 12px", borderRadius: 999, background: M.ink, color: M.bg2,
          borderColor: M.ink, font: `600 12.5px/1 ${M.font}`,
        }}>Save</button>
      </div>

      {/* summary card */}
      <div style={{ margin: "0 16px 14px", padding: 14, borderRadius: 14, background: M.panel, border: `0.5px solid ${M.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MAvatar name={u.name} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ font: `600 14.5px/1.2 ${M.font}` }}>{u.name}</span>
              <MPill style={{ height: 20, background: M.accentSoft, color: M.accentInk }}>manager</MPill>
            </div>
            <div style={{ font: `400 11.5px/1 ${M.mono}`, color: M.muted, marginTop: 4 }}>{u.email}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ font: `600 22px/1 ${M.font}`, fontFamily: M.mono }}>{granted.size}<span style={{ color: M.muted, font: `400 13px/1 ${M.font}` }}>/{BRANCHES.length}</span></div>
            <div style={{ font: `400 10px/1 ${M.mono}`, color: M.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>branches</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ font: `500 11px/1 ${M.mono}`, color: M.muted, letterSpacing: ".08em", textTransform: "uppercase" }}>Bangkok · 12</div>
        <span style={{ font: `500 12px/1 ${M.font}`, color: M.accentInk }}>Toggle all</span>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 16px 100px" }}>
        <div style={{ background: M.panel, border: `0.5px solid ${M.line}`, borderRadius: 14, overflow: "hidden" }}>
          {BRANCHES.filter(b => b.region === "Bangkok").slice(0, 10).map((b, i, a) => {
            const on = granted.has(b.id);
            return (
              <div key={b.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderBottom: i < a.length - 1 ? `0.5px solid ${M.line2}` : "none",
              }}>
                <MIcon name="store" size={15} stroke={1.5} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `500 14px/1.2 ${M.font}` }}>{b.name}</div>
                  <div style={{ font: `400 11px/1 ${M.mono}`, color: M.muted, marginTop: 3 }}>{b.id}</div>
                </div>
                <MToggle on={on} />
              </div>
            );
          })}
        </div>

        <div style={{ padding: "16px 4px 4px", font: `500 11px/1 ${M.mono}`, color: M.muted, letterSpacing: ".08em", textTransform: "uppercase" }}>
          Default deny
        </div>
        <div style={{ font: `400 12.5px/1.55 ${M.font}`, color: M.muted, padding: "0 4px" }}>
          Branches not listed above are invisible to Nicha. Queries silently filter; explicit references return a blocked response.
        </div>
      </div>
    </MSafeBody>
  );
}

function MToggle({ on }) {
  return (
    <span style={{
      width: 44, height: 26, borderRadius: 999, padding: 2,
      background: on ? M.accent : M.toggleOff,
      display: "inline-flex", alignItems: "center",
      transition: "background 120ms ease", flexShrink: 0,
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 999, background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,.25)",
        marginLeft: on ? 18 : 0, transition: "margin-left 120ms ease",
      }} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// 8) API KEYS
// ─────────────────────────────────────────────────────────────
function MApiKeys() {
  return (
    <MSafeBody>
      <MNavBar title="API Keys" sub="Bring your own — or use the gateway"
        leading={<button style={btnRound()}><MIcon name="chev" size={14} stroke={2} style={{ transform: "scaleX(-1)" }} /></button>} />

      <div style={{ flex: 1, overflow: "auto", padding: "0 0 100px" }}>
        {/* summary */}
        <div style={{ margin: "0 16px 14px", padding: 14, borderRadius: 14, background: M.panel, border: `0.5px solid ${M.line}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ font: `500 10.5px/1 ${M.mono}`, color: M.muted, letterSpacing: ".06em", textTransform: "uppercase" }}>Monthly spend</div>
              <div style={{ font: `600 22px/1 ${M.font}`, marginTop: 8, letterSpacing: "-0.01em" }}>$252.85</div>
              <div style={{ font: `400 11.5px/1.3 ${M.font}`, color: M.muted, marginTop: 5 }}>3 keys configured</div>
            </div>
            <div>
              <div style={{ font: `500 10.5px/1 ${M.mono}`, color: M.muted, letterSpacing: ".06em", textTransform: "uppercase" }}>Gateway credits</div>
              <div style={{ font: `600 22px/1 ${M.font}`, marginTop: 8, letterSpacing: "-0.01em" }}>$182<span style={{ color: M.muted, font: `400 14px/1 ${M.font}` }}>/250</span></div>
              <div style={{ height: 4, background: M.bg2, borderRadius: 2, overflow: "hidden", marginTop: 8 }}>
                <div style={{ width: "73%", height: "100%", background: M.accent }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 20px 8px", font: `500 11px/1 ${M.mono}`, color: M.muted, letterSpacing: ".08em", textTransform: "uppercase" }}>
          Providers
        </div>

        <div style={{ margin: "0 16px", background: M.panel, border: `0.5px solid ${M.line}`, borderRadius: 14, overflow: "hidden" }}>
          {PROVIDERS.map((p, i, a) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              borderBottom: i < a.length - 1 ? `0.5px solid ${M.line2}` : "none",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: M.bg2, color: M.ink2,
                display: "flex", alignItems: "center", justifyContent: "center",
                font: `600 13px/1 ${M.font}`, border: `0.5px solid ${M.line}`,
              }}>{p.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ font: `500 14px/1.2 ${M.font}` }}>{p.name}</span>
                  {p.user.configured && (
                    <MPill accent style={{ height: 18 }}>
                      <span style={{ width: 5, height: 5, borderRadius: 999, background: "currentColor" }} /> active
                    </MPill>
                  )}
                </div>
                <div style={{ font: `400 11px/1 ${M.mono}`, color: M.muted, marginTop: 4 }}>
                  {p.user.configured ? <>{p.keyPrefix}<span style={{ color: M.muted2 }}>•••••</span>{p.user.last4}</> : "Gateway routing"}
                </div>
              </div>
              {p.user.configured && (
                <div style={{ textAlign: "right", marginRight: 4 }}>
                  <div style={{ font: `600 13px/1 ${M.mono}` }}>${p.user.spend.toFixed(0)}</div>
                  <div style={{ font: `400 10px/1 ${M.mono}`, color: M.muted, marginTop: 4 }}>/{p.user.limit}</div>
                </div>
              )}
              <MIcon name="chev" size={14} stroke={1.5} />
            </div>
          ))}
        </div>

        <button style={{
          margin: "12px 16px 0", width: "calc(100% - 32px)", height: 46, borderRadius: 12,
          appearance: "none", border: `1px dashed ${M.line}`,
          background: "transparent", color: M.accentInk,
          font: `600 14px/1 ${M.font}`, cursor: "default",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <MIcon name="plus" size={14} stroke={2} />
          Add provider
        </button>

        <div style={{ padding: "20px 20px 4px", font: `500 11px/1 ${M.mono}`, color: M.muted, letterSpacing: ".08em", textTransform: "uppercase" }}>
          Notice
        </div>
        <div style={{
          margin: "0 16px", padding: "12px 14px", borderRadius: 12,
          background: M.bg2, border: `0.5px solid ${M.line}`,
          font: `400 12.5px/1.55 ${M.font}`, color: M.muted,
        }}>
          Keys are encrypted at rest. The gateway proxies requests and writes audit metadata only — never message content.
        </div>
      </div>

      <MTabBar active="settings" admin />
    </MSafeBody>
  );
}

// ─────────────────────────────────────────────────────────────
// 9) DATE PICKER (bottom sheet over dashboard)
// ─────────────────────────────────────────────────────────────
function MDatePicker() {
  const presets = [
    { id: "today", label: "Today" },
    { id: "yest",  label: "Yesterday" },
    { id: "7d",    label: "Last 7 days", active: true },
    { id: "14d",   label: "Last 14 days" },
    { id: "30d",   label: "Last 30 days" },
    { id: "tw",    label: "This week" },
    { id: "tm",    label: "This month" },
    { id: "qtd",   label: "Quarter to date" },
  ];
  const monthDays = (() => {
    // May 2026 starts on a Friday (day 5)
    const out = [];
    for (let i = 0; i < 5; i++) out.push(null);
    for (let d = 1; d <= 31; d++) out.push(d);
    while (out.length % 7) out.push(null);
    return out;
  })();
  const inRange = (d) => d >= 19 && d <= 25;
  const today = 25;

  return (
    <MSafeBody style={{ background: M.scrim }}>
      {/* dim faux dashboard behind */}
      <div style={{ flex: 1, opacity: .25, pointerEvents: "none", filter: "blur(1px)" }}>
        <div style={{ height: "100%", background: M.bg }} />
      </div>

      {/* sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 50,
        background: M.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: SAFE_BOTTOM + 4, boxShadow: "0 -20px 60px rgba(0,0,0,.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: M.line }} />
        </div>
        <div style={{ padding: "12px 20px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ appearance: "none", border: 0, background: "transparent", color: M.muted, font: `400 14px/1 ${M.font}` }}>Cancel</span>
          <div style={{ font: `600 17px/1.2 ${M.font}`, color: M.ink }}>Date range</div>
          <span style={{ appearance: "none", border: 0, background: "transparent", color: M.accentInk, font: `600 14px/1 ${M.font}` }}>Apply</span>
        </div>

        {/* from/to chips */}
        <div style={{ display: "flex", gap: 8, padding: "12px 16px 8px" }}>
          {[
            { l: "From", v: "May 19, 2026", active: false },
            { l: "To",   v: "May 25, 2026", active: true },
          ].map((c, i) => (
            <div key={i} style={{
              flex: 1, padding: "10px 12px", borderRadius: 12,
              background: M.panel, border: `1px solid ${c.active ? M.accent : M.line}`,
            }}>
              <div style={{ font: `500 10.5px/1 ${M.mono}`, color: M.muted, letterSpacing: ".06em", textTransform: "uppercase" }}>{c.l}</div>
              <div style={{ font: `600 14.5px/1 ${M.font}`, color: M.ink, marginTop: 6 }}>{c.v}</div>
            </div>
          ))}
        </div>

        {/* preset chips */}
        <div style={{ display: "flex", gap: 6, padding: "6px 16px 12px", overflowX: "auto", flexWrap: "wrap" }}>
          {presets.map(p => (
            <span key={p.id} style={{
              padding: "6px 12px", borderRadius: 999, flexShrink: 0,
              font: `${p.active ? 600 : 500} 12.5px/1 ${M.font}`,
              background: p.active ? M.accent : M.panel,
              color: p.active ? "#fff" : M.ink2,
              border: p.active ? "0.5px solid transparent" : `0.5px solid ${M.line}`,
            }}>{p.label}</span>
          ))}
        </div>

        {/* calendar */}
        <div style={{ padding: "0 16px 12px" }}>
          {/* month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px 10px" }}>
            <span style={btnRound()}><MIcon name="chev" size={13} stroke={2} style={{ transform: "scaleX(-1)" }} /></span>
            <div style={{ font: `600 15px/1 ${M.font}`, color: M.ink }}>May 2026</div>
            <span style={btnRound()}><MIcon name="chev" size={13} stroke={2} /></span>
          </div>

          {/* DOW row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} style={{
                textAlign: "center", padding: "4px 0",
                font: `500 10.5px/1 ${M.mono}`, color: M.muted,
                textTransform: "uppercase", letterSpacing: ".08em",
              }}>{d}</div>
            ))}
          </div>

          {/* days grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {monthDays.map((d, i) => {
              if (!d) return <div key={i} style={{ aspectRatio: "1" }} />;
              const isStart = d === 19;
              const isEnd = d === 25;
              const isMid = d > 19 && d < 25;
              const isToday = d === today;
              const isFuture = d > 25;

              return (
                <div key={i} style={{
                  aspectRatio: "1", position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {(isMid || isStart || isEnd) && (
                    <div style={{
                      position: "absolute", top: 4, bottom: 4,
                      left: isStart ? "50%" : 0,
                      right: isEnd ? "50%" : 0,
                      background: M.accentSoft,
                    }} />
                  )}
                  {(isStart || isEnd) && (
                    <div style={{
                      position: "absolute", top: 4, bottom: 4, left: 4, right: 4,
                      background: M.accent, borderRadius: 10,
                    }} />
                  )}
                  <span style={{
                    position: "relative", zIndex: 1,
                    font: `${isStart || isEnd || isToday ? 600 : 400} 14px/1 ${M.font}`,
                    color: isFuture ? M.muted2
                      : (isStart || isEnd) ? "#fff"
                      : isMid ? M.accentInk
                      : isToday ? M.accent
                      : M.ink2,
                  }}>{d}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 8, padding: "8px 0 0", textAlign: "center",
            font: `400 11.5px/1 ${M.mono}`, color: M.muted, borderTop: `0.5px solid ${M.line}` }}>
            7 days selected · May 19 → May 25, 2026
          </div>
        </div>
      </div>
    </MSafeBody>
  );
}

Object.assign(window, {
  MLogin, MChatList, MChatConversation, MChatPicker,
  MDashboard, MDatePicker, MAdmin, MAccess, MApiKeys,
  setMobileTheme,
});
