// FILE: src/app/api/admin/reports/[id]/route.ts
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { jsonError, jsonOk, withErrorHandling, ApiError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ status: z.enum(["REVIEWED", "ACTION_TAKEN", "DISMISSED"]), disableLink: z.boolean().optional() });

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

    const report = await prisma.abuseReport.update({
      where: { id: params.id },
      data: { status: parsed.data.status, reviewedAt: new Date() },
    });

    if (parsed.data.disableLink) {
      await prisma.link.update({ where: { id: report.linkId }, data: { isActive: false } });
    }

    await writeAuditLog(admin.id, "ADMIN_REPORT_REVIEWED", "AbuseReport", report.id, parsed.data);
    return jsonOk({ report });
  });
}