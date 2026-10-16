// FILE: src/lib/link-eligibility.ts
export type RedirectStatus = "ok" | "disabled" | "expired" | "password_required";

export function getLinkRedirectStatus(
  link: { isActive: boolean; expiresAt: Date | null; passwordHash: string | null },
  now: Date = new Date()
): RedirectStatus {
  if (!link.isActive) return "disabled";
  if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) return "expired";
  if (link.passwordHash) return "password_required";
  return "ok";
}