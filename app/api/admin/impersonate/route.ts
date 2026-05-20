import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId: adminClerkId } = await auth();
    if (!adminClerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { clerkId: adminClerkId } });
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    // Find the target user's clerkId
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser || !targetUser.clerkId) {
      return NextResponse.json({ error: "Target user not found or has no Clerk ID" }, { status: 404 });
    }

    // Create a sign-in token using Clerk
    const client = await clerkClient();
    const token = await client.signInTokens.createSignInToken({
      userId: targetUser.clerkId,
      expiresInSeconds: 60 * 5, // 5 minutes to click the link
    });

    return NextResponse.json({ url: token.url });
  } catch (error: any) {
    console.error("[AdminImpersonate] Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
