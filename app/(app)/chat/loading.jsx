// Skeleton for /chat (home + conversation). Next.js shows this while the
// server component fetches profile + skills + branches + chat list.

export default function ChatLoading() {
  return (
    <div style={{ padding: "8px 16px", animation: "bh-fade 220ms ease-out" }}>
      {/* NavBar shell */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 16px" }}>
        <Bone w={28} h={28} round />
        <Bone w={70} h={26} />
      </div>

      <Bone w={120} h={28} />
      <Bone w={180} h={13} mt={6} />

      {/* search bar */}
      <Bone w="100%" h={38} mt={14} />

      {/* skill chips row */}
      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        {[40, 80, 90, 70].map((w, i) => <Bone key={i} w={w} h={28} />)}
      </div>

      {/* chat rows */}
      <div style={{ marginTop: 18 }}>
        <Bone w={80} h={11} />
        <div style={{ marginTop: 8, background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", padding: "13px 14px", gap: 12,
              borderBottom: i < 3 ? "0.5px solid var(--line-2)" : "none",
            }}>
              <Bone w={38} h={38} round />
              <div style={{ flex: 1 }}>
                <Bone w="70%" h={14} />
                <Bone w="40%" h={11} mt={5} />
              </div>
              <Bone w={28} h={11} />
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes bh-fade { from { opacity: 0.4 } to { opacity: 1 } }`}</style>
    </div>
  );
}

function Bone({ w = "60%", h = 12, mt = 0, round = false }) {
  return (
    <div style={{
      width: w, height: h, marginTop: mt,
      borderRadius: round ? 999 : 6,
      background: "linear-gradient(90deg, var(--bg-2) 0%, var(--line-2) 50%, var(--bg-2) 100%)",
      backgroundSize: "200% 100%",
      animation: "bh-shimmer 1.5s infinite",
    }} />
  );
}
