// FILE: src/app/api/admin/users/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api-helpers";
import { ApiError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    try {
      await requireAdmin();
    } catch (e) {
      if (e instanceof ApiError) return jsonError(e.status, e.message);
      throw e;
    }
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = 20;

    const where = search
      ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }] }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, role: true, isSuspended: true, planType: true, createdAt: true, _count: { select: { links: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return jsonOk({ users, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  });
}