
 // FILE: src/app/api/links/[id]/route.ts

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  jsonError,
  jsonOk,
  withErrorHandler,
} from "@/lib/api-helpers";
import {
  validateAndNormalizeUrl,
  normalizeDomain,
  DEFAULT_DOMAIN,
} from "@/lib/url-safety";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  return withErrorHandler(async () => {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError(401, "Authentication required.");
    }

    const link = await prisma.link.findUnique({
      where: { id: params.id },
    });

    if (!link || link.ownerId !== user.id) {
      return jsonError(404, "Link not found.");
    }

    const body: unknown = await req.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return jsonError(400, "Invalid request body.");
    }

    const { originalUrl } = body as Record<string, unknown>;

    if (originalUrl !== undefined) {
      if (typeof originalUrl !== "string") {
        return jsonError(400, "originalUrl must be a string.");
      }

      // Prefer the configured canonical application URL.
      // Do not trust the incoming Host header as the canonical domain.
      const appHost = normalizeDomain(DEFAULT_DOMAIN);

      const check = validateAndNormalizeUrl(
        originalUrl,
        appHost
      );

      if (!check.ok) {
        return jsonError(400, check.error);
      }

      const updatedLink = await prisma.link.update({
        where: { id: params.id },
        data: { originalUrl: check.url },
      });

      return jsonOk(updatedLink);
    }

    return jsonError(
      400,
      "No supported field was provided for update."
    );
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
) {
  return withErrorHandler(async () => {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError(401, "Authentication required.");
    }

    const link = await prisma.link.findUnique({
      where: { id: params.id },
    });

    if (!link || link.ownerId !== user.id) {
      return jsonError(404, "Link not found.");
    }

    await prisma.link.delete({
      where: { id: params.id },
    });

    return jsonOk({ success: true });
  });
}
