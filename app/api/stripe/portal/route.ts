import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      // Try to find customerId in subscriptions
      const subscription = await prisma.subscription.findFirst({
        where: { userId: user.id },
        select: { stripeCustomerId: true }
      });

      if (subscription?.stripeCustomerId) {
        customerId = subscription.stripeCustomerId;
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId }
        });
      }
    }

    // If still no customer ID, create one
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: { userId: user.id }
        });
        customerId = customer.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId }
        });
      } catch (err) {
        console.error("[StripePortal] Failed to create customer:", err);
        return NextResponse.json({ error: "Failed to initialize billing profile" }, { status: 500 });
      }
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[StripePortal] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
