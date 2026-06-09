// Instant skeleton for /access — user picker + branch toggle list.

export default function AccessLoading() {
  return (
    <div style={{ padding: "8px 16px 24px", animation: "bh-fade 220ms ease-out" }}>
      {/* NavBar shell */}
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ width: 37, height: 32, background: "var(--bg-2)", borderRadius: 14, marginBottom: 12 }} />
        <Bone w={120} h={28} />
        <Bone w={180} h={13} mt={6} />
      </div>

      {/* user picker row */}
      <div style={{
        background: "var(--panel)", border: "0.5px solid var(--line)",
        borderRadius: 14, padding: 14, marginBottom: 14, display: "flex",
        alignItems: "center", gap: 12,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: "var(--bg-2)" }} />
        <div style={{ flex: 1 }}>
          <Bone w={140} h={14} />
          <Bone w={100} h={11} mt={5} />
        </div>
        <Bone w={70} h={28} />
      </div>

      {/* select-all bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Bone w="50%" h={38} />
        <Bone w="50%" h={38} />
      </div>

      {/* branch toggle rows */}
      <div style={{
        background: "var(--panel)", border: "0.5px solid var(--line)",
        borderRadius: 14, overflow: "hidden",
      }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", padding: "12px 14px", gap: 12,
            borderBottom: i < 5 ? "0.5px solid var(--line-2)" : "none",
          }}>
            <div style={{ flex: 1 }}>
              <Bone w="60%" h={13} />
              <Bone w="30%" h={10} mt={5} />
            </div>
            <Bone w={44} h={26} />
          </div>
        ))}
      </div>

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
