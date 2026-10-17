// FILE: src/lib/rate-limit.ts
// In-memory token bucket limiter. Suitable for a single server instance
// or local development. For multi-instance production deployments,
// replace this with Upstash Redis (env vars documented in .env.example)
// — the function signature is kept intentionally simple to make that swap easy.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// basic cleanup so the map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  buckets.forEach((b, key) => {
    if (b.resetAt < now) {
      buckets.delete(key);
    }
  });
}, 5 * 60_000).unref?.();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "0.0.0.0";
}