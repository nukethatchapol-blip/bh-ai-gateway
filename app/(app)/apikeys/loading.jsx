// Instant skeleton for /apikeys — spend summary + provider rows.

export default function ApiKeysLoading() {
  return (
    <div style={{ padding: "8px 16px 24px", animation: "bh-fade 220ms ease-out" }}>
      {/* NavBar shell */}
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ width: 37, height: 32, background: "var(--bg-2)", borderRadius: 14, marginBottom: 12 }} />
        <Bone w={120} h={28} />
        <Bone w={200} h={13} mt={6} />
      </div>

      {/* spend summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{
            background: "var(--panel)", border: "0.5px solid var(--line)",
            borderRadius: 14, padding: 14,
          }}>
            <Bone w={90} h={10} />
            <Bone w={100} h={22} mt={10} />
            <Bone w={140} h={11} mt={8} />
          </div>
        ))}
      </div>

      <Bone w={100} h={12} />
      <div style={{
        marginTop: 8, background: "var(--panel)", border: "0.5px solid var(--line)",
        borderRadius: 14, overflow: "hidden",
      }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", padding: "13px 14px", gap: 12,
            borderBottom: i < 3 ? "0.5px solid var(--line-2)" : "none",
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--bg-2)" }} />
            <div style={{ flex: 1 }}>
              <Bone w="55%" h={14} />
              <Bone w="35%" h={10} mt={5} />
            </div>
            <Bone w={48} h={22} />
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
