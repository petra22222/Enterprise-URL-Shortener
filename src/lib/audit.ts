// FILE: src/lib/audit.ts
import { prisma } from "./db";

export async function writeAuditLog(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, targetType, targetId, metadata: metadata as any },
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}