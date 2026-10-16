// FILE: src/app/api/links/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonError, jsonOk, withErrorHandler } from "@/lib/api-helpers";
import { validateAndNormalizeUrl, normalizeDomain, DEFAULT_DOMAIN } from "@/lib/url-safety";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandler(async () => {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");

    const link = await prisma.link.findUnique({ where: { id: params.id } });
    if (!link || link.ownerId !== user.id) return jsonError(404, "Link not found.");

    const body = await req.json();
    const { originalUrl, ...updateData } = body;

    if (originalUrl) {
      const host = normalizeDomain(req.headers.get("host") || DEFAULT_DOMAIN);
      const check = validateAndNormalizeUrl(originalUrl, host);
      if (!check.ok) return jsonError(400, (check as any).error || "Invalid URL");
      updateData.originalUrl = check.url;
    }

    const updatedLink = await prisma.link.update({
      where: { id: params.id },
      data: updateData,
    });

    return jsonOk(updatedLink);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandler(async () => {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");

    const link = await prisma.link.findUnique({ where: { id: params.id } });
    if (!link || link.ownerId !== user.id) return jsonError(404, "Link not found.");

    await prisma.link.delete({ where: { id: params.id } });

    return jsonOk({ success: true });
  });
}
