import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
});

/**
 * POST /api/stripe/sync-subscription
 * Called after successful Stripe Checkout to sync subscription to DB.
 * This bypasses webhook dependency — works even without STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Find the latest completed checkout session for this user's email
    const sessions = await stripe.checkout.sessions.list({
      limit: 5,
      expand: ["data.subscription"],
    });

    const completedSession = sessions.data.find(
      (s) =>
        s.status === "complete" &&
        (s.customer_email === user.email ||
          s.metadata?.userId === user.id) &&
        s.mode === "subscription"
    );

    if (!completedSession) {
      return NextResponse.json({ synced: false, reason: "No completed session found" });
    }

    const planId = completedSession.metadata?.planId;
    if (!planId) {
      return NextResponse.json({ synced: false, reason: "No planId in session metadata" });
    }

    const subscription = completedSession.subscription as Stripe.Subscription;
    const stripeCustomerId = completedSession.customer as string;
    const stripeSubscriptionId = typeof subscription === "string" ? subscription : subscription?.id;

    // Save stripeCustomerId on user for future checkouts
    if (stripeCustomerId && !user.stripeCustomerId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // Upsert subscription — avoid duplicate on repeated calls
    const existingSub = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId },
    });

    if (!existingSub) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId,
          status: "ACTIVE",
          stripeCustomerId,
          stripeSubscriptionId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return NextResponse.json({ synced: true });
  } catch (error: any) {
    console.error("[SyncSubscription] Error:", error);
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
