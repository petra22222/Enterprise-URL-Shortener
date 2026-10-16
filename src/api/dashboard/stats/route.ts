// FILE: src/app/api/dashboard/stats/route.ts
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api-helpers";

export async function GET() {
  return withErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");

    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60_000);

    const [totalLinks, totalClicksAgg, clicks7d, clicks30d, recentLinks, topLinks] = await Promise.all([
      prisma.link.count({ where: { ownerId: user.id } }),
      prisma.link.aggregate({ where: { ownerId: user.id }, _sum: { clickCount: true } }),
      prisma.clickEvent.count({ where: { link: { ownerId: user.id }, occurredAt: { gte: d7 }, isBot: false } }),
      prisma.clickEvent.count({ where: { link: { ownerId: user.id }, occurredAt: { gte: d30 }, isBot: false } }),
      prisma.link.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.link.findMany({ where: { ownerId: user.id }, orderBy: { clickCount: "desc" }, take: 5 }),
    ]);

    return jsonOk({
      totalLinks,
      totalClicks: totalClicksAgg._sum.clickCount || 0,
      clicks7d,
      clicks30d,
      recentLinks,
      topLinks,
    });
  });
}