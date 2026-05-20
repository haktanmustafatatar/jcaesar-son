import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
    const { code, planId, durationDays, maxUses } = body;

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

    const coupon = await prisma.coupon.create({
      data: {
        code: uppercaseCode,
        planId,
        durationDays: Number(durationDays) || 14,
        maxUses: Number(maxUses) || 100,
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
