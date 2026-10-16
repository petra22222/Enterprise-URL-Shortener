// FILE: src/lib/mailer.ts
import nodemailer from "nodemailer";

const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    })
  : null;

export async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) {
    // Safe local dev mode: never silently "succeed" — log clearly instead.
    console.log(`\n[DEV EMAIL - SMTP NOT CONFIGURED]\nTo: ${to}\nSubject: ${subject}\n${html}\n`);
    return { devMode: true };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "LinkNova <no-reply@linknova.local>",
    to,
    subject,
    html,
  });
  return { devMode: false };
}