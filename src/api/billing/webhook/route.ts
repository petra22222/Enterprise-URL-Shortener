// FILE: src/app/api/billing/webhook/route.ts
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Billing not configured", { status: 501 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    if (userId && plan) {
      await prisma.user.update({ where: { id: userId }, data: { planType: plan } });
      await prisma.subscription.upsert({
        where: { userId },
        update: { planType: plan, status: "ACTIVE", stripeCustomerId: session.customer, stripeSubscriptionId: session.subscription },
        create: { userId, planType: plan, status: "ACTIVE", stripeCustomerId: session.customer, stripeSubscriptionId: session.subscription },
      });
      await writeAuditLog(null, "SUBSCRIPTION_ACTIVATED", "User", userId, { plan });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as any;
    const subscription = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (subscription) {
      await prisma.user.update({ where: { id: subscription.userId }, data: { planType: "FREE" } });
      await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELED", planType: "FREE" } });
    }
  }

  return new Response("ok", { status: 200 });
}