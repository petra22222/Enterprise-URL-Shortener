// FILE: src/lib/visitor-hash.ts
import { createHash } from "crypto";

// Produces a daily-rotating, salted hash — never stores raw IP addresses.
// Used only to estimate unique visitors, not to identify individuals.
export function computeVisitorHash(ip: string, ua: string, linkId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const secret = process.env.ANALYTICS_SALT || "dev-salt-change-me";
  return createHash("sha256").update(`${ip}|${ua}|${linkId}|${day}|${secret}`).digest("hex");
}