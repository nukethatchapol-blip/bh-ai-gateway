// Renders INSTANTLY while the dashboard server component fetches data.
// Next.js automatically swaps this out when the real page is ready.
// Reuses the same MobileShell layout so the swap feels seamless.

export default function DashboardLoading() {
  return (
    <div style={{ padding: "8px 16px", animation: "bh-fade 220ms ease-out" }}>
      {/* NavBar shell */}
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ width: 38, height: 32, background: "var(--bg-2)", borderRadius: 6, marginBottom: 12 }} />
        <Bone w={140} h={28} />
        <Bone w={180} h={14} mt={8} />
      </div>

      {/* date range button shell */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Bone w="100%" h={38} />
        <Bone w={38} h={38} />
      </div>

      {/* 4 KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            background: "var(--panel)", border: "0.5px solid var(--line)",
            borderRadius: 14, padding: 14,
          }}>
            <Bone w={80} h={10} />
            <Bone w={90} h={22} mt={12} />
            <Bone w="100%" h={20} mt={10} />
          </div>
        ))}
      </div>

      {/* chart card */}
      <div style={{
        background: "var(--panel)", border: "0.5px solid var(--line)",
        borderRadius: 14, padding: 16, marginBottom: 16,
      }}>
        <Bone w={120} h={16} />
        <Bone w={200} h={11} mt={6} />
        <Bone w="100%" h={130} mt={14} />
      </div>

      {/* leaderboard skeleton */}
      <Bone w={140} h={12} mt={4} />
      <div style={{ marginTop: 8, background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", padding: "12px 14px", gap: 12,
            borderBottom: i < 4 ? "0.5px solid var(--line-2)" : "none",
          }}>
            <Bone w={20} h={12} />
            <div style={{ flex: 1 }}>
              <Bone w="60%" h={13} />
              <Bone w="35%" h={10} mt={5} />
            </div>
            <Bone w={50} h={13} />
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
