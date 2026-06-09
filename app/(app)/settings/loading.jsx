// Instant skeleton for /settings — fires the moment the tab is tapped, before
// the server fetches profile + theme cookie. Eliminates the perceived "tap
// freeze" on slow networks. Mirrors the real screen's vertical card stack.

export default function SettingsLoading() {
  return (
    <div style={{ padding: "8px 16px 24px", animation: "bh-fade 220ms ease-out" }}>
      {/* NavBar shell */}
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ width: 37, height: 32, background: "var(--bg-2)", borderRadius: 14, marginBottom: 12 }} />
        <Bone w={120} h={28} />
      </div>

      {[80, 120, 90].map((labelW, sec) => (
        <div key={sec} style={{ marginBottom: 14 }}>
          <Bone w={labelW} h={11} mt={8} />
          <div style={{
            marginTop: 8, background: "var(--panel)", border: "0.5px solid var(--line)",
            borderRadius: 14, overflow: "hidden",
          }}>
            {[0, 1, 2].slice(0, sec === 0 ? 1 : sec === 1 ? 2 : 3).map((i, _, arr) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", padding: "13px 14px", gap: 12,
                borderBottom: i < arr.length - 1 ? "0.5px solid var(--line-2)" : "none",
              }}>
                <Bone w={20} h={20} />
                <Bone w="60%" h={14} />
                <div style={{ flex: 1 }} />
                <Bone w={28} h={20} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <style>{`@keyframes bh-fade { from { opacity: 0.4 } to { opacity: 1 } }`}</style>
    </div>
  );
}

function Bone({ w = "60%", h = 12, mt = 0 }) {
  return (
    <div style={{
      width: w, height: h, marginTop: mt, borderRadius: 4,
      background: "linear-gradient(90deg, var(--bg-2) 0%, var(--line-2) 50%, var(--bg-2) 100%)",
      backgroundSize: "200% 100%",
      animation: "bh-shimmer 1.5s infinite",
    }} />
  );
}
