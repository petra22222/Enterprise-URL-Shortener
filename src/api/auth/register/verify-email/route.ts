// FILE: src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { APP_URL } from "@/lib/config";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  if (!token || !email) return NextResponse.redirect(`${APP_URL}/login?error=invalid_verification`);

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.identifier !== email.toLowerCase() || record.expires < new Date()) {
    return NextResponse.redirect(`${APP_URL}/login?error=expired_verification`);
  }

  await prisma.user.update({ where: { email: email.toLowerCase() }, data: { emailVerified: new Date() } });
  await prisma.verificationToken.delete({ where: { token } });

  return NextResponse.redirect(`${APP_URL}/login?verified=1`);
}