// FILE: src/app/api/links/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createLinkSchema } from "@/lib/validation";
import { validateAndNormalizeUrl } from "@/lib/url-safety";
import { generateShortCode, validateAliasFormat } from "@/lib/short-code";
import { getCurrentUser } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { DEFAULT_DOMAIN, PLANS, ANONYMOUS_SHORTENING_ENABLED, normalizeDomain, APP_URL } from "@/lib/config";
import { isWithinLinkLimit } from "@/lib/plan-limits";
import { hashPassword } from "@/lib/password";
import { checkUrlReputation } from "@/lib/reputation";
import { jsonError, jsonOk, withErrorHandling, verifySameOrigin } from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

function buildShortUrl(domain: string, code: string) {
  const protocol = domain.includes("localhost") ? "http" : "https";
  return `${protocol}://${domain}/${code}`;
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    if (!verifySameOrigin(req)) return jsonError(403, "Invalid request origin.");

    const ip = getClientIp(req);
    const user = await getCurrentUser();

    const body = await req.json().catch(() => null);
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message || "Invalid request.");
    }
    const input = parsed.data;

    if (!user) {
      if (!ANONYMOUS_SHORTENING_ENABLED) return jsonError(401, "Please sign in to create links.");
      if (input.alias || input.password || input.expiresAt || input.customDomainId) {
        return jsonError(401, "Sign in to use custom aliases, passwords, expiration, or custom domains.");
      }
      const rl = rateLimit(`create:anon:${ip}`, 10, 24 * 60 * 60_000);
      if (!rl.allowed) return jsonError(429, "Daily link limit reached for anonymous users. Please sign in for a higher limit.");
    } else {
      const rl = rateLimit(`create:user:${user.id}`, 60, 60 * 60_000);
      if (!rl.allowed) return jsonError(429, "You're creating links too quickly. Please slow down.");

      const plan = PLANS[user.planType];
      const currentCount = await prisma.link.count({ where: { ownerId: user.id } });
      if (!isWithinLinkLimit(plan, currentCount)) {
        return jsonError(403, `You've reached the ${plan.name} plan limit of ${plan.maxLinks} links. Upgrade to create more.`);
      }
      if (input.alias && !plan.customAliases) return jsonError(403, "Custom aliases require a Pro or Business plan.");
      if (input.password && !plan.passwordProtection) return jsonError(403, "Password protection requires a Pro or Business plan.");
      if (input.expiresAt && !plan.linkExpiration) return jsonError(403, "Link expiration requires a Pro or Business plan.");
    }

    const host = normalizeDomain(req.headers.get("host") || DEFAULT_DOMAIN);
    const urlCheck = validateAndNormalizeUrl(input.originalUrl, host);
    if (!urlCheck.ok) return jsonError(400, urlCheck.error);

    const reputation = await checkUrlReputation(urlCheck.url);
    if (reputation.flagged) return jsonError(400, "This URL was flagged as potentially unsafe and cannot be shortened.");

    let domain = DEFAULT_DOMAIN;
    let customDomainId: string | undefined;
    if (user && input.customDomainId) {
      const plan = PLANS[user.planType];
      if (plan.maxCustomDomains < 1) return jsonError(403, "Custom domains require a Pro or Business plan.");
      const cd = await prisma.customDomain.findFirst({
        where: { id: input.customDomainId, ownerId: user.id, status: "VERIFIED" },
      });
      if (!cd) return jsonError(400, "Selected domain is not verified or not owned by you.");
      domain = cd.hostname;
      customDomainId = cd.id;
    }

    let alias: string | undefined;
    if (input.alias) {
      const aliasCheck = validateAliasFormat(input.alias);
      if (!aliasCheck.ok) return jsonError(400, aliasCheck.error);
      alias = input.alias;
    }

    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;

    let link;
    if (alias) {
      const existing = await prisma.link.findUnique({ where: { domain_shortCode: { domain, shortCode: alias } } });
      if (existing) return jsonError(409, "This alias is already taken. Please choose another.");
      try {
        link = await prisma.link.create({
          data: {
            ownerId: user?.id,
            originalUrl: urlCheck.url,
            domain,
            shortCode: alias,
            customDomainId,
            title: input.title,
            passwordHash,
            expiresAt,
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          return jsonError(409, "This alias is already taken. Please choose another.");
        }
        throw e;
      }
    } else {
      // Retry on collision — DB unique constraint is the real guarantee,
      // this loop just handles the rare case gracefully instead of erroring.
      let attempts = 0;
      while (attempts < 5 && !link) {
        attempts++;
        const code = generateShortCode();
        try {
          link = await prisma.link.create({
            data: {
              ownerId: user?.id,
              originalUrl: urlCheck.url,
              domain,
              shortCode: code,
              customDomainId,
              title: input.title,
              passwordHash,
              expiresAt,
            },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
          throw e;
        }
      }
      if (!link) return jsonError(503, "Could not generate a unique short code. Please try again.");
    }

    return jsonOk(
      { link: { ...link, shortUrl: buildShortUrl(link.domain, link.shortCode), passwordHash: undefined } },
      201
    );
  });
}

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 10)));
    const search = searchParams.get("search")?.trim();
    const statusFilter = searchParams.get("status"); // active | expired | disabled | password

    const where: Prisma.LinkWhereInput = { ownerId: user.id };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { originalUrl: { contains: search, mode: "insensitive" } },
        { shortCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const now = new Date();
    if (statusFilter === "active") {
      where.isActive = true;
      where.OR = [...(where.OR || []), ]; // keep search OR intact
      where.AND = [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }];
    } else if (statusFilter === "expired") {
      where.expiresAt = { lte: now };
    } else if (statusFilter === "disabled") {
      where.isActive = false;
    } else if (statusFilter === "password") {
      where.passwordHash = { not: null };
    }

    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.link.count({ where }),
    ]);

    return jsonOk({
      links: links.map((l) => ({ ...l, shortUrl: buildShortUrl(l.domain, l.shortCode), passwordHash: undefined })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  });
}