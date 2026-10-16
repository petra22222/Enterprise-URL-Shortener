// FILE: src/app/api/domains/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { domainSchema } from "@/lib/validation";
import { PLANS } from "@/lib/config";
import { isWithinDomainLimit } from "@/lib/plan-limits";
import { jsonError, jsonOk, withErrorHandling, verifySameOrigin } from "@/lib/api-helpers";

export async function GET() {
  return withErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");
    const domains = await prisma.customDomain.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } });
    return jsonOk({ domains });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    if (!verifySameOrigin(req)) return jsonError(403, "Invalid request origin.");
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");

    const plan = PLANS[user.planType];
    if (plan.maxCustomDomains < 1) return jsonError(403, "Custom domains require a Pro or Business plan.");

    const current = await prisma.customDomain.count({ where: { ownerId: user.id } });
    if (!isWithinDomainLimit(plan, current)) return jsonError(403, `Your plan allows up to ${plan.maxCustomDomains} domain(s).`);

    const body = await req.json().catch(() => null);
    const parsed = domainSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid hostname.");

    const existing = await prisma.customDomain.findUnique({ where: { hostname: parsed.data.hostname.toLowerCase() } });
    if (existing) return jsonError(409, "This domain is already registered.");

    const domain = await prisma.customDomain.create({
      data: { ownerId: user.id, hostname: parsed.data.hostname.toLowerCase() },
    });

    return jsonOk(
      {
        domain,
        instructions: {
          txtRecordName: `_linknova-verify.${domain.hostname}`,
          txtRecordValue: domain.verificationToken,
          cnameTarget: process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "your-app.vercel.app",
        },
      },
      201
    );
  });
}