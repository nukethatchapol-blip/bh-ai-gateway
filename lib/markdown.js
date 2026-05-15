// Minimal markdown → block parser for streaming assistant prose.
// Block types consumed by components/chat-screen.jsx MessageBlock.

export function parseMarkdown(src) {
  const text = (src || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;

  const flushPara = (buf) => {
    const joined = buf.join(" ").trim();
    if (joined) blocks.push({ type: "p", text: joined });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || "";
      const body = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { body.push(lines[i]); i++; }
      i++;
      blocks.push({ type: "code", lang, text: body.join("\n") });
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { blocks.push({ type: "heading", level: h[1].length, text: h[2].trim() }); i++; continue; }

    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const splitRow = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const cols = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      blocks.push({ type: "table", cols, rows });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const buf = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^```/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\|.*\|\s*$/.test(lines[i])
    ) { buf.push(lines[i]); i++; }
    flushPara(buf);
  }

  return blocks;
}
