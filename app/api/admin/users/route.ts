import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role in DB (Privilege Escalation Remedy)
    const adminUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!adminUser || (adminUser.role !== "ADMIN" && adminUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: {
        chatbots: { select: { id: true } },
        subscriptions: { include: { plan: true } },
        tokenUsages: { select: { tokensUsed: true, cost: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[AdminUsersAPI] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Update user role or organization plan
export async function PATCH(req: Request) {
  try {
    const { userId: adminClerkId } = await auth();
    if (!adminClerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role in DB (Privilege Escalation Remedy)
    const adminUser = await prisma.user.findUnique({ where: { clerkId: adminClerkId } });
    if (!adminUser || (adminUser.role !== "ADMIN" && adminUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, role, planId } = await req.json();

    if (role) {
      // Validate that only SUPERADMIN can assign SUPERADMIN role
      if (role === "SUPERADMIN" && adminUser.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Only SUPERADMIN can promote other users to SUPERADMIN" }, { status: 403 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { role }
      });
    }

    if (planId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true }
      });

      if (user?.organizationId) {
        await prisma.organization.update({
          where: { id: user.organizationId },
          data: { planId }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminUsersAPI] PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
