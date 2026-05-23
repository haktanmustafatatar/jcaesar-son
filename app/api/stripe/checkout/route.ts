import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
});

/**
 * Ensure the plan has a valid Stripe Price ID.
 * If not, automatically create a Stripe Product + recurring Price and
 * persist the new price ID back to the database.
 */
async function ensureStripePriceId(plan: {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  stripePriceId: string | null;
}): Promise<string> {
  // Already has a valid price ID — nothing to do
  if (plan.stripePriceId && plan.stripePriceId.startsWith("price_")) {
    return plan.stripePriceId;
  }

  // 1. Create (or reuse) a Stripe Product
  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description || undefined,
    metadata: { planId: plan.id },
  });

  // 2. Create a recurring monthly Price (Stripe expects smallest currency unit → kuruş)
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.priceMonthly * 100, // DB stores full TL (e.g. 49), Stripe needs kuruş (4900)
    currency: "try",
    recurring: { interval: "month" },
    metadata: { planId: plan.id },
  });

  // 3. Persist the new price ID so we don't recreate it next time
  await prisma.plan.update({
    where: { id: plan.id },
    data: { stripePriceId: price.id },
  });

  console.log(`[Stripe] Auto-created price ${price.id} for plan "${plan.name}"`);
  return price.id;
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { planId, interval, couponCode } = await req.json();

    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    // Auto-create Stripe Product/Price if not yet set — never use a dummy ID
    const priceId = await ensureStripePriceId(plan);

    // Resolve coupon → Stripe coupon ID
    let stripeCouponId: string | undefined = undefined;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });
      if (coupon && coupon.isActive && coupon.discountPercent) {
        stripeCouponId = coupon.stripeCouponId || coupon.code;
        await prisma.coupon
          .update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } })
          .catch((err) => console.error("Failed to increment coupon usedCount:", err));
      }
    }

    // Use NEXT_PUBLIC_APP_URL to avoid Docker-internal 0.0.0.0 address in Stripe redirects
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://jcaesars.com").replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId || undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
      mode: "subscription",
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        planId: plan.id,
        couponCode: couponCode || "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[StripeCheckout] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
