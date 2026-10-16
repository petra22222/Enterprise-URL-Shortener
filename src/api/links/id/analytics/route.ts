// FILE: src/app/api/links/[id]/analytics/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");

    const link = await prisma.link.findUnique({ where: { id: params.id } });
    if (!link || link.ownerId !== user.id) return jsonError(404, "Link not found.");

    const { searchParams } = new URL(req.url);
    const days = Math.min(365, Math.max(1, Number(searchParams.get("days") || 30)));
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);

    const baseWhere = { linkId: link.id, occurredAt: { gte: since }, isBot: false };

    const [totalClicks, uniqueVisitors, byDay, byReferrer, byCountry, byDevice, byBrowser, byOs] = await Promise.all([
      prisma.clickEvent.count({ where: baseWhere }),
      prisma.clickEvent.findMany({ where: baseWhere, distinct: ["visitorHash"], select: { visitorHash: true } }),
      prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT to_char(date_trunc('day', "occurredAt"), 'YYYY-MM-DD') as day, COUNT(*) as count
        FROM "ClickEvent" WHERE "linkId" = ${link.id} AND "occurredAt" >= ${since} AND "isBot" = false
        GROUP BY day ORDER BY day ASC`,
      prisma.clickEvent.groupBy({ by: ["referrer"], where: baseWhere, _count: true, orderBy: { _count: { referrer: "desc" } }, take: 10 }),
      prisma.clickEvent.groupBy({ by: ["country"], where: { ...baseWhere, country: { not: null } }, _count: true, orderBy: { _count: { country: "desc" } }, take: 10 }),
      prisma.clickEvent.groupBy({ by: ["deviceType"], where: baseWhere, _count: true }),
      prisma.clickEvent.groupBy({ by: ["browser"], where: baseWhere, _count: true }),
      prisma.clickEvent.groupBy({ by: ["os"], where: baseWhere, _count: true }),
    ]);

    return jsonOk({
      totalClicks,
      uniqueVisitors: uniqueVisitors.filter((v) => v.visitorHash).length,
      note: "Unique visitors are an estimate based on a privacy-preserving daily hash, not a precise user count.",
      clicksOverTime: byDay.map((d) => ({ day: d.day, count: Number(d.count) })),
      referrers: byReferrer.map((r) => ({ referrer: r.referrer || "Direct / unknown", count: r._count })),
      countries: byCountry.map((c) => ({ country: c.country, count: c._count })),
      devices: byDevice.map((d) => ({ type: d.deviceType || "Unknown", count: d._count })),
      browsers: byBrowser.map((b) => ({ browser: b.browser || "Unknown", count: b._count })),
      operatingSystems: byOs.map((o) => ({ os: o.os || "Unknown", count: o._count })),
    });
  });
}