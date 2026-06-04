// Redis client + helpers (rate limit, cached fetch).
//
// Vercel serverless functions reuse warm instances, so a module-level
// singleton client keeps the TCP connection alive across invocations on
// the same instance. Cold-start pays ~50-100ms once.
//
// Failure semantics: every helper FAILS OPEN. If Redis is unreachable,
// rate limiting returns "allowed" and cache returns "miss → fall through".
// Better to serve stale traffic than to error the user out for an infra hiccup.

import Redis from "ioredis";

let client = null;
let connectAttempted = false;

function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;
  if (connectAttempted) return null; // previous attempt errored — don't loop
  try {
    connectAttempted = true;
    client = new Redis(process.env.REDIS_URL, {
      // Don't queue commands forever if Redis is down; fail fast.
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      // Lazy connect — opens TCP on first command, not on import.
      lazyConnect: true,
      // Reasonable timeouts for serverless.
      connectTimeout: 3000,
      commandTimeout: 2000,
    });
    client.on("error", (err) => {
      // Swallow — helpers below check and fail open.
      console.error("[redis]", err.message || err);
    });
    return client;
  } catch (e) {
    console.error("[redis] init failed:", e?.message || e);
    client = null;
    return null;
  }
}

/**
 * Sliding-window rate limit using INCR + EXPIRE on a windowed bucket.
 * Returns { allowed, remaining, reset } — never throws.
 *
 * @param {string} key  — e.g. `chat:${userId}`
 * @param {number} max  — requests allowed per window
 * @param {number} windowSec — window length in seconds
 */
export async function rateLimit(key, max, windowSec) {
  const r = getRedis();
  if (!r) return { allowed: true, remaining: max, reset: 0, skipped: "no-redis" };
  try {
    const now = Math.floor(Date.now() / 1000);
    const bucket = Math.floor(now / windowSec);
    const k = `rl:${key}:${bucket}`;
    const count = await r.incr(k);
    if (count === 1) await r.expire(k, windowSec + 5);
    const reset = (bucket + 1) * windowSec;
    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      reset,
    };
  } catch (e) {
    // Fail open on any error.
    return { allowed: true, remaining: max, reset: 0, skipped: e?.message || "err" };
  }
}

/**
 * Cache wrapper: serve from Redis if present, otherwise compute and store.
 * Values are JSON-stringified. Returns the value (cached or fresh).
 *
 * @param {string} key  — full cache key (caller decides scoping)
 * @param {number} ttlSec  — TTL in seconds
 * @param {() => Promise<any>} compute  — fallback to compute on miss
 */
export async function cached(key, ttlSec, compute) {
  const r = getRedis();
  if (!r) return compute();
  try {
    const hit = await r.get(`c:${key}`);
    if (hit !== null && hit !== undefined) {
      try { return JSON.parse(hit); } catch { /* corrupt entry — fall through */ }
    }
  } catch { /* read error — fall through */ }
  const value = await compute();
  try {
    // setex = SET with TTL; ignore if redis is unreachable.
    await r.setex(`c:${key}`, ttlSec, JSON.stringify(value));
  } catch { /* write error — silent; just won't be cached */ }
  return value;
}

/** Invalidate a specific cache key. */
export async function invalidate(key) {
  const r = getRedis();
  if (!r) return;
  try { await r.del(`c:${key}`); } catch { /* swallow */ }
}
