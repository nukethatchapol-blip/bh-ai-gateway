// PII redaction helpers — applied to assistant output before it's persisted
// to `messages`. This protects against the chat re-opening (or being shared)
// later and exposing phone numbers / emails that the model echoed back from a
// tool-result row. Per PDPA the user's BRANCH access decides what data they
// can ASK for; redaction adds a second-layer protection on what's PERSISTED.
//
// Conservative pattern set: we'd rather over-redact than leak. The unredacted
// version is still sent down the SSE stream (the live user is already
// authenticated and may legitimately need to see e.g. their own phone), but
// the saved record is masked.

// Thai mobile + landline patterns + generic international. Matches both
// hyphenated (081-234-5678) and unhyphenated (0812345678) forms.
const PHONE = /(?:(?:\+?66|0)\s?\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4}|\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b)/g;

// Standard email.
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function maskPhone(s) {
  const digits = s.replace(/\D/g, "");
  if (digits.length < 4) return "***-***-****";
  return "***-***-" + digits.slice(-4);
}

function maskEmail(s) {
  const [local, domain] = s.split("@");
  const head = (local || "")[0] || "*";
  return `${head}***@${domain || ""}`;
}

export function redactPII(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(PHONE, maskPhone).replace(EMAIL, maskEmail);
}

// Recursively redact all string values inside arrays/objects (tables, charts,
// tool result blocks). Non-string leaves are passed through unchanged.
export function redactDeep(value) {
  if (typeof value === "string") return redactPII(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactDeep(v);
    return out;
  }
  return value;
}
