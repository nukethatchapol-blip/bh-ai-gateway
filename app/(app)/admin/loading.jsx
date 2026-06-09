// Instant skeleton for /admin — segmented tab strip + pending request cards
// shape. Shown while the server fetches profiles + skills + audit log.

export default function AdminLoading() {
  return (
    <div style={{ padding: "8px 16px 24px", animation: "bh-fade 220ms ease-out" }}>
      {/* NavBar shell */}
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ width: 37, height: 32, background: "var(--bg-2)", borderRadius: 14 }} />
          <div style={{ width: 70, height: 24, background: "var(--bg-2)", borderRadius: 12 }} />
        </div>
        <Bone w={100} h={28} mt={10} />
        <Bone w={140} h={13} mt={6} />
      </div>

      {/* segmented tab bar shell */}
      <div style={{
        display: "flex", padding: 3, background: "var(--bg-2)",
        borderRadius: 10, gap: 3, marginBottom: 16,
      }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            flex: 1, height: 28, borderRadius: 7,
            background: i === 0 ? "var(--panel)" : "transparent",
          }} />
        ))}
      </div>

      {/* request cards */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          background: "var(--panel)", border: "0.5px solid var(--line)",
          borderRadius: 14, padding: 14, marginBottom: 10,
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, borderRadius: 999, background: "var(--bg-2)" }} />
            <div style={{ flex: 1 }}>
              <Bone w={140} h={14} />
              <Bone w={180} h={11} mt={6} />
            </div>
            <Bone w={56} h={20} />
          </div>
          <Bone w="100%" h={36} mt={12} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Bone w="50%" h={38} />
            <Bone w="50%" h={38} />
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
