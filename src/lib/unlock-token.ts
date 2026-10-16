// FILE: src/lib/unlock-token.ts
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "dev-secret-change-me";

export function signUnlockToken(code: string, ttlMs = 60 * 60_000) {
  const expiry = Date.now() + ttlMs;
  const sig = createHmac("sha256", SECRET).update(`${code}.${expiry}`).digest("hex");
  return `${expiry}.${sig}`;
}

export function verifyUnlockToken(token: string | undefined, code: string): boolean {
  if (!token) return false;
  const [expiryStr, sig] = token.split(".");
  if (!expiryStr || !sig) return false;
  const expiry = Number(expiryStr);
  if (!expiry || expiry < Date.now()) return false;
  const expected = createHmac("sha256", SECRET).update(`${code}.${expiry}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}