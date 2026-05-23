import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Invalid coupon code format" }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find active coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { plan: true }
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: "Coupon is invalid or has expired." }, { status: 400 });
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "Coupon has reached its maximum usage limit." }, { status: 400 });
    }

    // If it's a percentage discount coupon, do not activate a trial subscription.
    // Instead, return coupon validation details so it can be passed to Stripe Checkout.
    if (coupon.discountPercent !== null && coupon.discountPercent > 0) {
      return NextResponse.json({
        message: `Kupon başarıyla uygulandı! ${coupon.plan.name} planında %${coupon.discountPercent} indirim kazandınız.`,
        discountPercent: coupon.discountPercent,
        code: coupon.code,
        planId: coupon.planId
      });
    }

    // Check if user already has an active subscription to avoid abuse
    const existingActiveSub = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "TRIALING"] }
      }
    });

    if (existingActiveSub) {
      return NextResponse.json({ error: "You already have an active subscription." }, { status: 400 });
    }

    // Apply Coupon: Create trial subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + coupon.durationDays);

    const subscription = await prisma.$transaction([
      prisma.subscription.create({
        data: {
          userId: user.id,
          planId: coupon.planId,
          status: "TRIALING",
          stripeSubscriptionId: `coupon_${coupon.code}_${Date.now()}`,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
        }
      }),
      prisma.coupon.update({
        where: { id: coupon.id },
        data: {
          usedCount: {
            increment: 1
          }
        }
      })
    ]);

    return NextResponse.json({
      message: `Success! You have activated a ${coupon.durationDays}-day trial of the ${coupon.plan.name} plan.`,
      subscription: subscription[0]
    });
  } catch (error: any) {
    console.error("Error redeeming coupon:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
