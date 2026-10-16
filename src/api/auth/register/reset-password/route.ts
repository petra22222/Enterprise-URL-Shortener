// FILE: src/app/api/auth/reset-password/route.ts
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api-helpers";
import { z } from "zod";

const schema = z.object({ token: z.string(), email: z.string().email(), password: z.string().min(8).max(100) });

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(400, "Invalid request.");

    const identifier = `reset:${parsed.data.email.toLowerCase()}`;
    const record = await prisma.verificationToken.findUnique({ where: { token: parsed.data.token } });
    if (!record || record.identifier !== identifier || record.expires < new Date()) {
      return jsonError(400, "This reset link is invalid or has expired.");
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({ where: { email: parsed.data.email.toLowerCase() }, data: { passwordHash } });
    await prisma.verificationToken.delete({ where: { token: parsed.data.token } });

    return jsonOk({ ok: true, message: "Password updated. You can now log in." });
  });
}