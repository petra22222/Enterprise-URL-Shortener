// FILE: src/app/api/admin/links/[id]/route.ts
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { jsonError, jsonOk, withErrorHandling, ApiError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    let admin;
    try {
      admin = await requireAdmin();
    } catch (e) {
      if (e instanceof ApiError) return jsonError(e.status, e.message);
      throw e;
    }
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(400, "Invalid request.");

    const link = await prisma.link.update({ where: { id: params.id }, data: { isActive: parsed.data.isActive } });
    await writeAuditLog(admin.id, parsed.data.isActive ? "ADMIN_LINK_ENABLED" : "ADMIN_LINK_DISABLED", "Link", link.id);

    return jsonOk({ link });
  });
}