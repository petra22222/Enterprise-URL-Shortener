// FILE: src/app/api/links/unlock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeDomain } from "@/lib/config";
import { getLinkRedirectStatus } from "@/lib/link-eligibility";
import { verifyPassword } from "@/lib/password";
import { signUnlockToken } from "@/lib/unlock-token";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({ code: z.string().min(1).max(32), password: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { code, password } = parsed.data;

  // Brute-force protection: 5 attempts per 15 minutes per IP+code.
  const rl = rateLimit(`unlock:${ip}:${code}`, 5, 15 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const host = normalizeDomain(req.headers.get("host") || "");
  const link = await prisma.link.findUnique({ where: { domain_shortCode: { domain: host, shortCode: code } } });
  if (!link || !link.passwordHash) return NextResponse.json({ error: "Link not found." }, { status: 404 });

  const status = getLinkRedirectStatus(link);
  if (status === "disabled" || status === "expired") {
    return NextResponse.json({ error: "This link is no longer available." }, { status: 410 });
  }

  const valid = await verifyPassword(password, link.passwordHash);
  if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

  const token = signUnlockToken(code);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(`unlock_${code}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3600,
    path: "/",
  });
  return res;
}