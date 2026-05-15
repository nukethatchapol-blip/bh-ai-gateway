// AES-256-GCM encryption for BYO provider keys.
// The secret is a 32-byte (base64-encoded) value in $API_KEY_ENC_SECRET.
//
// We store the ciphertext, iv, and auth tag as base64 strings in TEXT
// columns — Supabase REST/JSON can't round-trip Postgres `bytea` cleanly.

import crypto from "node:crypto";

function getKey() {
  const b64 = process.env.API_KEY_ENC_SECRET;
  if (!b64) throw new Error("API_KEY_ENC_SECRET is not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32)
    throw new Error("API_KEY_ENC_SECRET must decode to 32 bytes");
  return key;
}

export function encryptApiKey(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    enc_payload: enc.toString("base64"),
    enc_iv:      iv.toString("base64"),
    enc_tag:     tag.toString("base64"),
  };
}

export function decryptApiKey({ enc_payload, enc_iv, enc_tag }) {
  const iv = Buffer.from(enc_iv,      "base64");
  const tag = Buffer.from(enc_tag,    "base64");
  const payload = Buffer.from(enc_payload, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
}
