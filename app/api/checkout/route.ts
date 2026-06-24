export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimit(`checkout:${clerkId}`, 5, 60);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { planId } = await req.json();

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan || !plan.stripePriceId) {
      return NextResponse.json({ error: "Invalid plan or missing Stripe Price ID" }, { status: 400 });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        planId: plan.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: plan.id,
        }
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 });
  }
}
