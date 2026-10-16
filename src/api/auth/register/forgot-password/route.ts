// FILE: src/app/api/auth/forgot-password/route.ts
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { jsonOk, withErrorHandling } from "@/lib/api-helpers";
import { APP_URL } from "@/lib/config";
import { randomBytes } from "crypto";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const ip = getClientIp(req);
    rateLimit(`forgot:${ip}`, 5, 60 * 60_000);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    // Always return a generic success message, even if the email doesn't
    // exist — prevents account enumeration.
    if (!parsed.success) return jsonOk({ ok: true, message: "If that email exists, a reset link has been sent." });

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    let devResetLink: string | undefined;
    if (user) {
      const token = randomBytes(32).toString("hex");
      await prisma.verificationToken.create({
        data: { identifier: `reset:${email}`, token, expires: new Date(Date.now() + 60 * 60_000) },
      });
      const link = `${APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      const result = await sendMail(email, "Reset your LinkNova password", `<p><a href="${link}">${link}</a></p>`);
      if (result.devMode) devResetLink = link;
    }

    return jsonOk({ ok: true, message: "If that email exists, a reset link has been sent.", devResetLink });
  });
}