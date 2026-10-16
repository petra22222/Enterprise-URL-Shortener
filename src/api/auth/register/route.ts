// FILE: src/app/api/auth/register/route.ts
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { sendMail } from "@/lib/mailer";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api-helpers";
import { APP_URL } from "@/lib/config";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const ip = getClientIp(req);
    const rl = rateLimit(`register:${ip}`, 5, 60 * 60_000);
    if (!rl.allowed) return jsonError(429, "Too many registration attempts. Please try again later.");

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid request.");

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return jsonError(409, "An account with this email already exists.");

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({ data: { name: parsed.data.name, email, passwordHash } });

    const token = randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires: new Date(Date.now() + 24 * 60 * 60_000) },
    });

    const link = `${APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    const mailResult = await sendMail(email, "Verify your LinkNova account", `<p>Click to verify: <a href="${link}">${link}</a></p>`);

    return jsonOk(
      {
        ok: true,
        message: "Account created. Please check your email to verify your account.",
        devVerificationLink: mailResult.devMode ? link : undefined,
      },
      201
    );
  });
}