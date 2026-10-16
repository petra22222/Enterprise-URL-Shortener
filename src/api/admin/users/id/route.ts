// FILE: src/app/api/admin/users/[id]/route.ts
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { jsonError, jsonOk, withErrorHandling, ApiError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  isSuspended: z.boolean().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  planType: z.enum(["FREE", "PRO", "BUSINESS"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    let admin;
    try {
      admin = await requireAdmin();
    } catch (e) {
      if (e instanceof ApiError) return jsonError(e.status, e.message);
      throw e;
    }

    if (params.id === admin.id) return jsonError(400, "You cannot modify your own admin account through this endpoint.");

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(400, "Invalid request.");

    const updated = await prisma.user.update({ where: { id: params.id }, data: parsed.data });
    await writeAuditLog(admin.id, "ADMIN_USER_UPDATED", "User", params.id, parsed.data);

    return jsonOk({ user: { ...updated, passwordHash: undefined } });
  });
}