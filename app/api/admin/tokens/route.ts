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

    const tokenLogs = await prisma.tokenUsage.findMany({
      orderBy: { createdAt: "desc" },
      take: 100, // Limit for performance
      include: {
        chatbot: {
          select: { name: true }
        }
      }
    });

    const firecrawlLogs = await prisma.dataSourceUrl.findMany({
      where: { status: "COMPLETED" },
      orderBy: { lastCrawledAt: "desc" },
      take: 100,
      include: {
        dataSource: {
          include: {
            chatbot: { select: { name: true } }
          }
        }
      }
    });

    return NextResponse.json({
      tokenLogs,
      firecrawlLogs
    });
  } catch (error) {
    console.error("[AdminTokens] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
