import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

import { stripe } from "@/lib/stripe";

// Validate admin session
async function isAdmin() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return false;

  const user = await prisma.user.findUnique({
    where: { clerkId }
  });

  return user?.role === "ADMIN" || user?.role === "SUPERADMIN";
}

// GET /api/admin/coupons - List all coupons
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const coupons = await prisma.coupon.findMany({
      include: { plan: true },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(coupons);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

// POST /api/admin/coupons - Create a new coupon
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { code, planId, durationDays, maxUses, discountPercent } = body;

    if (!code || !planId) {
      return NextResponse.json({ error: "Code and Plan are required" }, { status: 400 });
    }

    const uppercaseCode = code.trim().toUpperCase();

    // Check if code already exists
    const existing = await prisma.coupon.findUnique({
      where: { code: uppercaseCode }
    });

    if (existing) {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 400 });
    }

    let stripeCouponId: string | undefined = undefined;
    const pct = discountPercent !== undefined && discountPercent !== "" && discountPercent !== null ? Number(discountPercent) : null;

    if (pct !== null) {
      if (isNaN(pct) || pct < 1 || pct > 100) {
        return NextResponse.json({ error: "Discount percent must be between 1 and 100" }, { status: 400 });
      }

      // Sync coupon with Stripe dynamically!
      try {
        const stripeCoupon = await stripe.coupons.create({
          percent_off: pct,
          duration: "forever",
          name: `${uppercaseCode} - ${pct}% Off`,
          id: uppercaseCode, // Use the code itself as Stripe's Coupon ID
        }).catch(async (err) => {
          // If already exists, retrieve it
          return await stripe.coupons.retrieve(uppercaseCode);
        });
        stripeCouponId = stripeCoupon.id;
      } catch (stripeErr: any) {
        console.error("Stripe Coupon Sync Error:", stripeErr);
        // Fallback to uppercaseCode if Stripe is offline or key is dummy
        stripeCouponId = uppercaseCode;
      }
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: uppercaseCode,
        planId,
        durationDays: Number(durationDays) || 14,
        maxUses: Number(maxUses) || 100,
        discountPercent: pct,
        stripeCouponId,
        isActive: true
      },
      include: {
        plan: true
      }
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}

// DELETE /api/admin/coupons - Delete or toggle coupon status
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    await prisma.coupon.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
