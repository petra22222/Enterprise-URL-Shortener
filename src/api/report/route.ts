// FILE: src/app/api/report/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { reportSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { DEFAULT_DOMAIN, normalizeDomain } from "@/lib/config";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const ip = getClientIp(req);
    const rl = rateLimit(`report:${ip}`, 5, 60 * 60_000);
    if (!rl.allowed) return jsonError(429, "Too many reports submitted. Please try again later.");

    const body = await req.json().catch(() => null);
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid request.");

    let code = parsed.data.shortCodeOrUrl.trim();
    try {
      const url = new URL(code);
      code = url.pathname.replace(/^\//, "");
    } catch {
      /* not a full URL, assume it's already a code */
    }

    const link = await prisma.link.findUnique({ where: { domain_shortCode: { domain: DEFAULT_DOMAIN, shortCode: code } } });
    if (!link) return jsonError(404, "We couldn't find a link matching that URL or code.");

    const user = await getCurrentUser();
    await prisma.abuseReport.create({
      data: { linkId: link.id, reporterId: user?.id, reason: parsed.data.reason, details: parsed.data.details },
    });

    return jsonOk({ ok: true, message: "Thank you — our team will review this link." }, 201);
  });
}