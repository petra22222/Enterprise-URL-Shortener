// FILE: src/app/api/domains/[id]/verify/route.ts
import { resolveTxt } from "dns/promises";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs"; // dns module requires the Node runtime, not edge

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");

    const domain = await prisma.customDomain.findFirst({ where: { id: params.id, ownerId: user.id } });
    if (!domain) return jsonError(404, "Domain not found.");

    try {
      const records = await resolveTxt(`_linknova-verify.${domain.hostname}`);
      const flat = records.map((r) => r.join(""));
      const verified = flat.includes(domain.verificationToken);

      if (!verified) {
        await prisma.customDomain.update({ where: { id: domain.id }, data: { status: "FAILED" } });
        return jsonError(
          400,
          `TXT record not found or doesn't match. Add a TXT record for _linknova-verify.${domain.hostname} with value ${domain.verificationToken} and try again.`
        );
      }

      const updated = await prisma.customDomain.update({
        where: { id: domain.id },
        data: { status: "VERIFIED", verifiedAt: new Date() },
      });
      return jsonOk({ domain: updated });
    } catch (err) {
      await prisma.customDomain.update({ where: { id: domain.id }, data: { status: "FAILED" } });
      return jsonError(400, "Could not resolve DNS records for this domain yet. DNS changes can take time to propagate — please try again shortly.");
    }
  });
}