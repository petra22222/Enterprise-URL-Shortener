// FILE: src/app/api/billing/checkout/route.ts
import { getCurrentUser } from "@/lib/session";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api-helpers";
import { APP_URL } from "@/lib/config";

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Authentication required.");

    if (!process.env.STRIPE_SECRET_KEY) {
      return jsonError(501, "Billing is not configured in this environment. Set STRIPE_SECRET_KEY to enable upgrades.");
    }

    const { plan } = await req.json();
    const priceId = plan === "BUSINESS" ? process.env.STRIPE_PRICE_BUSINESS : process.env.STRIPE_PRICE_PRO;
    if (!priceId) return jsonError(400, "Unknown plan or missing Stripe price ID configuration.");

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/dashboard/billing?success=1`,
      cancel_url: `${APP_URL}/dashboard/billing?canceled=1`,
      metadata: { userId: user.id, plan },
    });

    return jsonOk({ url: session.url });
  });
}