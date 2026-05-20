import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { subDays, format, startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "7d";
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId as string }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = subDays(new Date(), days);

    // Get all chatbots for the user or their organization
    const chatbots = await prisma.chatbot.findMany({
      where: { 
        OR: [
          { userId: user.id },
          { organizationId: user.organizationId }
        ]
      },
      select: { id: true, name: true }
    });

    const chatbotIds = chatbots.map(c => c.id);

    // 1. Total Conversions
    const totalConversions = await prisma.conversation.count({
      where: { 
        chatbotId: { in: chatbotIds },
        createdAt: { gte: startDate }
      }
    });

    // 2. Resolution Rate (CLOSED / Total)
    const closedConversions = await prisma.conversation.count({
      where: { 
        chatbotId: { in: chatbotIds },
        status: "CLOSED",
        createdAt: { gte: startDate }
      }
    });
    const resolutionRate = totalConversions > 0 ? (closedConversions / totalConversions) * 100 : 0;

    // 3. Traffic Sources
    const sourcesRaw = await prisma.conversation.groupBy({
      by: ['channel'],
      where: {
        chatbotId: { in: chatbotIds },
        createdAt: { gte: startDate }
      },
      _count: true
    });

    const sourceData = sourcesRaw.map(s => ({
      name: s.channel.charAt(0).toUpperCase() + s.channel.slice(1),
      value: s._count,
      color: s.channel === 'widget' ? '#3b82f6' : s.channel === 'whatsapp' ? '#10b981' : s.channel === 'instagram' ? '#ec4899' : '#64748b'
    }));

    // 4. Sentiment Analysis
    const sentimentRaw = await prisma.conversation.groupBy({
      by: ['sentiment'],
      where: {
        chatbotId: { in: chatbotIds },
        createdAt: { gte: startDate },
        sentiment: { not: null }
      },
      _count: true
    });

    const sentimentData = sentimentRaw.map(s => ({
      name: s.sentiment || "NEUTRAL",
      value: s._count,
      color: s.sentiment === 'POSITIVE' ? '#10b981' : s.sentiment === 'NEGATIVE' ? '#ef4444' : s.sentiment === 'FRUSTRATED' ? '#f59e0b' : '#64748b'
    }));

    // 4. Token Usage & Cost
    const tokenStats = await prisma.tokenUsage.aggregate({
      where: {
        userId: user.id,
        createdAt: { gte: startDate }
      },
      _sum: {
        cost: true,
        tokensUsed: true
      }
    });

    // 5. Bot Performance
    const botPerformance = await Promise.all(chatbots.map(async (bot) => {
      const msgCount = await prisma.message.count({
        where: {
          conversation: { chatbotId: bot.id },
          createdAt: { gte: startDate }
        }
      });

      const closed = await prisma.conversation.count({
        where: {
          chatbotId: bot.id,
          status: "CLOSED",
          createdAt: { gte: startDate }
        }
      });

      const total = await prisma.conversation.count({
        where: {
          chatbotId: bot.id,
          createdAt: { gte: startDate }
        }
      });

      const resolution = total > 0 ? Math.round((closed / total) * 100) : 0;

      return {
        id: bot.id,
        name: bot.name,
        msgs: msgCount,
        resolution,
        status: resolution > 90 ? "top_perf" : resolution > 70 ? "stable" : "needs_optim"
      };
    }));

    // 6. Trend Data (Last X days)
    const trendData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayLabel = format(date, "MMM dd");

      const count = await prisma.conversation.count({
        where: {
          chatbotId: { in: chatbotIds },
          createdAt: { gte: dayStart, lt: dayEnd }
        }
      });

      trendData.push({
        date: dayLabel,
        conversations: count,
        saved: Math.floor(count * 0.12) // Each conversation saves approx 7-8 mins (0.12 hours)
      });
    }

    return NextResponse.json({
      totalConversions,
      resolutionRate: Math.round(resolutionRate),
      totalCost: tokenStats._sum.cost || 0,
      totalTokens: tokenStats._sum.tokensUsed || 0,
      sourceData,
      sentimentData,
      trendData,
      botPerformance: botPerformance.sort((a, b) => b.msgs - a.msgs)
    });

  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
