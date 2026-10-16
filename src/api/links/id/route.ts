// FILE: src/app/api/links/[id]/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { updateLinkSchema } from "@/lib/validation";
import { validateAndNormalizeUrl } from "@/lib/url-safety";
import { hashPassword } from "@/lib/password";
import { normalizeDomain, DEFAULT_DOMAIN, PLANS } from "@/lib/config";
import { jsonError, jsonOk, withErrorHandling, verifySameOrigin } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";

async function getOwnedLink(id: string, userId: string) {
  const link = await prisma.link.findUnique({ where: { id } });
  if (!link || link.ownerId !== userId) return null;
  return link;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");
    const link = await getOwnedLink(params.id, user.id);
    if (!link) return jsonError(404, "Link not found.");
    return jsonOk({ link: { ...link, passwordHash: undefined, hasPassword: !!link.passwordHash } });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    if (!verifySameOrigin(req)) return jsonError(403, "Invalid request origin.");
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");
    const link = await getOwnedLink(params.id, user.id);
    if (!link) return jsonError(404, "Link not found.");

    const body = await req.json().catch(() => null);
    const parsed = updateLinkSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid request.");
    const input = parsed.data;

    const plan = PLANS[user.planType];
    const data: Record<string, unknown> = {};

    if (input.title !== undefined) data.title = input.title;

    if (input.originalUrl !== undefined) {
      const host = normalizeDomain(req.headers.get("host") || DEFAULT_DOMAIN);
      const check = validateAndNormalizeUrl(input.originalUrl, host);
      if (!check.ok) return jsonError(400, check.error);
      data.originalUrl = check.url;
    }

    if (input.expiresAt !== undefined) {
      if (input.expiresAt && !plan.linkExpiration) return jsonError(403, "Link expiration requires a Pro or Business plan.");
      data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    }

    if (input.isActive !== undefined) data.isActive = input.isActive;

    if (input.password !== undefined) {
      if (input.password && !plan.passwordProtection) return jsonError(403, "Password protection requires a Pro or Business plan.");
      data.passwordHash = input.password ? await hashPassword(input.password) : null;
    }

    const updated = await prisma.link.update({ where: { id: link.id }, data });
    await writeAuditLog(user.id, "LINK_UPDATED", "Link", link.id, { fields: Object.keys(data) });

    return jsonOk({ link: { ...updated, passwordHash: undefined, hasPassword: !!updated.passwordHash } });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    if (!verifySameOrigin(req)) return jsonError(403, "Invalid request origin.");
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");
    const link = await getOwnedLink(params.id, user.id);
    if (!link) return jsonError(404, "Link not found.");

    await prisma.link.delete({ where: { id: link.id } }); // cascades to ClickEvent
    await writeAuditLog(user.id, "LINK_DELETED", "Link", link.id);

    return jsonOk({ ok: true });
  });
}