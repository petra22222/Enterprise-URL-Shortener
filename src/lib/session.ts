// FILE: src/lib/session.ts
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./db";
import { ApiError } from "./api-helpers";

// Re-fetches role/suspension/plan fresh from the database on every call.
// This is deliberate: JWT claims can be stale, and admin/suspension status
// must always be verified server-side, not trusted from a cached token.
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.isSuspended) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required.");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ApiError(403, "Admin access required.");
  return user;
}