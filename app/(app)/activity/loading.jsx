// Skeleton for /activity — peach hero + two stat cards + connected grid.

export default function ActivityLoading() {
  return (
    <div style={{ padding: "8px 16px", animation: "bh-fade 220ms ease-out" }}>
      {/* NavBar shell */}
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ width: 38, height: 32, background: "var(--bg-2)", borderRadius: 6, marginBottom: 12 }} />
        <Bone w={140} h={28} />
        <Bone w={180} h={14} mt={8} />
      </div>

      {/* hero card shell — peach tint so the perceived swap is smooth */}
      <div style={{
        position: "relative", height: 158, marginBottom: 14,
        background: "var(--peach-stack-1)", borderRadius: 18,
        border: "0.5px solid var(--peach-stack-2)",
      }}>
        <div style={{ padding: 18 }}>
          <Bone w={120} h={12} />
          <Bone w={160} h={36} mt={16} />
          <Bone w={210} h={11} mt={10} />
        </div>
      </div>

      {/* two stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{
            background: "var(--panel)", border: "0.5px solid var(--line)",
            borderRadius: 14, padding: 14,
          }}>
            <Bone w={70} h={10} />
            <Bone w={80} h={22} mt={10} />
            <Bone w="100%" h={5} mt={12} />
            <Bone w={90} h={10} mt={9} />
          </div>
        ))}
      </div>

      {/* connected branches card */}
      <Bone w={140} h={12} />
      <div style={{
        marginTop: 8, padding: 16, background: "var(--panel)",
        border: "0.5px solid var(--line)", borderRadius: 14,
      }}>
        <Bone w={120} h={22} />
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              aspectRatio: "1", borderRadius: 10,
              background: "var(--peach-stack-1)",
            }} />
          ))}
        </div>
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
