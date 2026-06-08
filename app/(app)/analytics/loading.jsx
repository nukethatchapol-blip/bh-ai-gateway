// Skeleton for /analytics — Branch Performance Insights card + 2 top rows.

export default function AnalyticsLoading() {
  return (
    <div style={{ padding: "8px 16px 24px", animation: "bh-fade 220ms ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: "var(--bg-2)" }} />
        <div style={{ flex: 1, height: 18, background: "var(--bg-2)", borderRadius: 6 }} />
        <div style={{ width: 40, height: 40, borderRadius: 13, background: "var(--bg-2)" }} />
      </div>

      {/* insights card */}
      <div style={{
        background: "var(--panel)", border: "0.5px solid var(--line)",
        borderRadius: 18, padding: 18, marginBottom: 14,
      }}>
        <Bone w={150} h={12} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginTop: 14 }}>
          <div>
            <Bone w={110} h={10} />
            <Bone w={120} h={34} mt={10} />
          </div>
          <Bone w={130} h={28} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <Bone w={40} h={16} />
              <Bone w={50} h={9} mt={6} />
            </div>
          ))}
        </div>
        <Bone w="100%" h={110} mt={14} />
      </div>

      {/* top rows */}
      {[0, 1].map((i) => (
        <div key={i} style={{
          background: "var(--panel)", border: "0.5px solid var(--line)",
          borderRadius: 18, padding: 16, marginBottom: 12,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--bg-2)" }} />
          <div style={{ flex: 1 }}>
            <Bone w={140} h={14} />
            <Bone w={70} h={10} mt={5} />
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <div>
                <Bone w={60} h={13} />
                <Bone w={40} h={9} mt={4} />
              </div>
              <div>
                <Bone w={60} h={13} />
                <Bone w={50} h={9} mt={4} />
              </div>
            </div>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: "var(--bg-2)" }} />
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
