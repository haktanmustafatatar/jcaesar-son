import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummyForBuild", {
  apiVersion: "2024-12-18.acacia" as any,
});

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { planId, interval } = await req.json();

    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    // Use dummy price if stripePriceId is not set
    const priceId = plan.stripePriceId || "price_dummy_123"; 

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId || undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${new URL(req.url).origin}/dashboard?success=true`,
      cancel_url: `${new URL(req.url).origin}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        planId: plan.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[StripeCheckout] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
