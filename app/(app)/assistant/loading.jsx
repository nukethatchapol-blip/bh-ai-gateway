// Skeleton for /assistant — Smart AI Assistant card.

export default function AssistantLoading() {
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "var(--bg-2)", padding: "8px 0",
      animation: "bh-fade 220ms ease-out",
    }}>
      {/* top bar shell */}
      <div style={{ padding: "0 16px 10px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: "var(--bg-2)" }} />
        <div style={{ flex: 1, height: 18, background: "var(--bg-2)", borderRadius: 6, maxWidth: 200, margin: "0 auto" }} />
        <div style={{ width: 40, height: 40, borderRadius: 999, background: "var(--bg-2)" }} />
      </div>

      {/* chat card shell */}
      <div style={{
        flex: 1, margin: "0 12px",
        background: "var(--panel)",
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        border: "0.5px solid var(--line)", borderBottom: 0,
        padding: 16,
      }}>
        {/* card header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingBottom: 14, marginBottom: 14,
          borderBottom: "0.5px solid var(--line-2)",
        }}>
          <Bone w={150} h={14} />
          <Bone w={14} h={14} />
        </div>

        {/* user message */}
        <Bone w={140} h={28} />
        <Bone w="85%" h={11} mt={10} />
        <Bone w="60%" h={11} mt={5} />
        <Bone w={200} h={50} mt={12} />

        {/* AI message */}
        <Bone w={120} h={28} mt={28} />
        <Bone w="80%" h={11} mt={10} />
        <Bone w="100%" h={11} mt={5} />
        {[0, 1, 2].map((i) => (
          <Bone key={i} w="100%" h={16} mt={10} />
        ))}
        <Bone w="100%" h={8} mt={12} />
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
