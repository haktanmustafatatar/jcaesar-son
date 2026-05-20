import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. General Stats
    const totalUsers = await prisma.user.count();
    const totalChatbots = await prisma.chatbot.count();
    const totalTokens = await prisma.tokenUsage.aggregate({
      _sum: { tokensUsed: true }
    });

    // 2. Token Usage by Day (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyUsage = await prisma.tokenUsage.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _sum: { tokensUsed: true, cost: true }
    });

    // 3. Top Users by Usage
    const topUsers = await prisma.user.findMany({
      include: {
        _count: { select: { chatbots: true } },
        tokenUsages: {
          select: { tokensUsed: true, cost: true }
        }
      },
      take: 10
    });

    const formattedTopUsers = topUsers.map(u => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
      botCount: u._count.chatbots,
      totalTokens: u.tokenUsages.reduce((sum, t) => sum + t.tokensUsed, 0),
      totalCost: u.tokenUsages.reduce((sum, t) => sum + t.cost, 0),
      role: u.role
    })).sort((a, b) => b.totalTokens - a.totalTokens);

    return NextResponse.json({
      overview: {
        totalUsers,
        totalChatbots,
        totalTokens: totalTokens._sum.tokensUsed || 0,
        totalRevenue: formattedTopUsers.reduce((sum, u) => sum + u.totalCost, 0) * 1.5 // Multiplier for profit
      },
      topUsers: formattedTopUsers,
      dailyUsage
    });
  } catch (error) {
    console.error("[AdminStats] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
