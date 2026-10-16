// FILE: src/app/[code]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeDomain, PRODUCT_NAME } from "@/lib/config";
import { getLinkRedirectStatus } from "@/lib/link-eligibility";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { parseUserAgent } from "@/lib/ua";
import { computeVisitorHash } from "@/lib/visitor-hash";
import { verifyUnlockToken } from "@/lib/unlock-token";

export const dynamic = "force-dynamic";

function statusPage(status: number, title: string, message: string, retryAfterSeconds?: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>${title} – ${PRODUCT_NAME}</title><meta name="robots" content="noindex"/>
<style>
body{font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{max-width:440px;padding:2.5rem;border-radius:1rem;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center}
h1{font-size:1.4rem;margin-bottom:.5rem;color:#312e81}
p{color:#475569;line-height:1.5}
a{color:#4f46e5;text-decoration:none;font-weight:600}
</style></head><body><div class="card"><h1>${title}</h1><p>${message}</p>
<p><a href="/">Go to ${PRODUCT_NAME}</a></p></div></body></html>`;
  const headers: Record<string, string> = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };
  if (retryAfterSeconds) headers["Retry-After"] = String(retryAfterSeconds);
  return new NextResponse(html, { status, headers });
}

const SELF_PATHS_TO_BLOCK = ["/api", "/dashboard", "/admin"];

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const ip = getClientIp(req);
  const rl = rateLimit(`redirect:${ip}`, 90, 60_000);
  if (!rl.allowed) {
    return statusPage(429, "Too many requests", "You're clicking a bit too fast. Please try again shortly.", rl.retryAfterSeconds);
  }

  const code = params.code;
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(code)) {
    return statusPage(404, "Link not found", "This short link doesn't exist or was typed incorrectly.");
  }

  const host = normalizeDomain(req.headers.get("host") || "");

  let link;
  try {
    link = await prisma.link.findUnique({
      where: { domain_shortCode: { domain: host, shortCode: code } },
    });
  } catch (err) {
    console.error("Redirect lookup failed:", err);
    return statusPage(503, "Temporarily unavailable", "We're having trouble right now. Please try again in a moment.");
  }

  if (!link) {
    return statusPage(404, "Link not found", "This short link doesn't exist or has been removed.");
  }

  if (SELF_PATHS_TO_BLOCK.some((p) => link!.originalUrl.startsWith(new URL(req.url).origin + p))) {
    return statusPage(400, "Invalid link", "This link cannot be used.");
  }

  const status = getLinkRedirectStatus(link);

  if (status === "disabled") {
    return statusPage(410, "Link disabled", "This link has been disabled by its owner or an administrator.");
  }
  if (status === "expired") {
    return statusPage(410, "Link expired", "This link is no longer active.");
  }
  if (status === "password_required") {
    const cookie = req.cookies.get(`unlock_${code}`)?.value;
    if (!verifyUnlockToken(cookie, code)) {
      return NextResponse.redirect(new URL(`/unlock/${code}`, req.url), 307);
    }
  }

  // Record the click without unnecessarily delaying the redirect:
  // race the DB write against a short timeout. If it loses, the redirect
  // still happens — reliability of the redirect takes priority over
  // guaranteed analytics capture for every single click.
  const ua = req.headers.get("user-agent");
  const referrer = req.headers.get("referer");
  const country = req.headers.get("x-vercel-ip-country") || null; // only real geo data, never invented
  const { browser, os, deviceType, isBot } = parseUserAgent(ua);
  const visitorHash = computeVisitorHash(ip, ua || "", link.id);

  const recordClick = prisma.$transaction([
    prisma.clickEvent.create({
      data: { linkId: link.id, referrer, country, browser, os, deviceType, isBot, visitorHash },
    }),
    prisma.link.update({ where: { id: link.id }, data: { clickCount: { increment: 1 } } }),
  ]);

  await Promise.race([
    recordClick,
    new Promise((resolve) => setTimeout(resolve, 400)),
  ]).catch((err) => console.error("Click recording failed:", err));

  return NextResponse.redirect(link.originalUrl, 302);
}