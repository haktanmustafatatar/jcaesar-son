import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { subDays, format, startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "7d";
    const chatbotIdFilter = searchParams.get("chatbotId") || null;

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId as string },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = subDays(new Date(), days);
    const prevStartDate = subDays(startDate, days); // Previous equal period for change% calculation

    // Get all chatbots for the user or their organization
    const allChatbots = await prisma.chatbot.findMany({
      where: {
        OR: [
          { userId: user.id },
          ...(user.organizationId ? [{ organizationId: user.organizationId }] : []),
        ],
      },
      select: { id: true, name: true },
    });

    // Apply optional chatbot filter
    const filteredChatbots = chatbotIdFilter
      ? allChatbots.filter((c) => c.id === chatbotIdFilter)
      : allChatbots;

    const chatbotIds = filteredChatbots.map((c) => c.id);

    // ─────────────────────────────────────────────
    // 1. Total Conversations (current period)
    // ─────────────────────────────────────────────
    const totalConversions = await prisma.conversation.count({
      where: {
        chatbotId: { in: chatbotIds },
        createdAt: { gte: startDate },
      },
    });

    // Previous period count for change%
    const prevConversions = await prisma.conversation.count({
      where: {
        chatbotId: { in: chatbotIds },
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    });

    const conversionsChangePercent =
      prevConversions > 0
        ? parseFloat(((totalConversions - prevConversions) / prevConversions * 100).toFixed(1))
        : null;

    // ─────────────────────────────────────────────
    // 2. Resolution Rate (CLOSED / Total)
    // ─────────────────────────────────────────────
    const closedConversions = await prisma.conversation.count({
      where: {
        chatbotId: { in: chatbotIds },
        status: "CLOSED",
        createdAt: { gte: startDate },
      },
    });
    const resolutionRate =
      totalConversions > 0 ? (closedConversions / totalConversions) * 100 : 0;

    const prevClosed = await prisma.conversation.count({
      where: {
        chatbotId: { in: chatbotIds },
        status: "CLOSED",
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    });
    const prevResolutionRate = prevConversions > 0 ? (prevClosed / prevConversions) * 100 : 0;
    const resolutionChangePercent =
      prevResolutionRate > 0
        ? parseFloat(((resolutionRate - prevResolutionRate) / prevResolutionRate * 100).toFixed(1))
        : null;

    // ─────────────────────────────────────────────
    // 3. Traffic Sources
    // ─────────────────────────────────────────────
    const sourcesRaw = await prisma.conversation.groupBy({
      by: ["channel"],
      where: {
        chatbotId: { in: chatbotIds },
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    const sourceData = sourcesRaw.map((s) => ({
      name: s.channel.charAt(0).toUpperCase() + s.channel.slice(1),
      value: s._count,
      color:
        s.channel === "widget"
          ? "#3b82f6"
          : s.channel === "whatsapp"
          ? "#10b981"
          : s.channel === "instagram"
          ? "#ec4899"
          : s.channel === "telegram"
          ? "#229ED9"
          : "#64748b",
    }));

    // ─────────────────────────────────────────────
    // 4. Sentiment & Satisfaction Score
    // ─────────────────────────────────────────────
    const sentimentRaw = await prisma.conversation.groupBy({
      by: ["sentiment"],
      where: {
        chatbotId: { in: chatbotIds },
        createdAt: { gte: startDate },
        sentiment: { not: null },
      },
      _count: true,
    });

    const sentimentData = sentimentRaw.map((s) => ({
      name: s.sentiment || "NEUTRAL",
      value: s._count,
      color:
        s.sentiment === "POSITIVE"
          ? "#10b981"
          : s.sentiment === "NEGATIVE"
          ? "#ef4444"
          : s.sentiment === "FRUSTRATED"
          ? "#f59e0b"
          : "#64748b",
    }));

    const positiveCount = sentimentRaw.find((s) => s.sentiment === "POSITIVE")?._count || 0;
    const totalSentiment = sentimentRaw.reduce((acc, s) => acc + s._count, 0);
    const satisfactionScore =
      totalSentiment > 0 ? Math.round((positiveCount / totalSentiment) * 100) : null;

    // ─────────────────────────────────────────────
    // 5. Token Usage & Cost
    // ─────────────────────────────────────────────
    const tokenStats = await prisma.tokenUsage.aggregate({
      where: {
        userId: user.id,
        createdAt: { gte: startDate },
      },
      _sum: {
        cost: true,
        tokensUsed: true,
      },
    });

    // ─────────────────────────────────────────────
    // 6. Bot Performance
    // ─────────────────────────────────────────────
    const botPerformance = await Promise.all(
      filteredChatbots.map(async (bot) => {
        const msgCount = await prisma.message.count({
          where: {
            conversation: { chatbotId: bot.id },
            createdAt: { gte: startDate },
          },
        });

        const closed = await prisma.conversation.count({
          where: {
            chatbotId: bot.id,
            status: "CLOSED",
            createdAt: { gte: startDate },
          },
        });

        const total = await prisma.conversation.count({
          where: {
            chatbotId: bot.id,
            createdAt: { gte: startDate },
          },
        });

        const resolution = total > 0 ? Math.round((closed / total) * 100) : 0;

        return {
          id: bot.id,
          name: bot.name,
          msgs: msgCount,
          resolution,
          status:
            resolution > 90 ? "top_perf" : resolution > 70 ? "stable" : "needs_optim",
        };
      })
    );

    // ─────────────────────────────────────────────
    // 7. Trend Data (Day-by-day)
    // ─────────────────────────────────────────────
    const trendData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayLabel = format(date, "MMM dd");

      const count = await prisma.conversation.count({
        where: {
          chatbotId: { in: chatbotIds },
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      });

      trendData.push({
        date: dayLabel,
        conversations: count,
        // Realistic savings: avg 8 min per conversation @ $15/hr agent cost = $2/convo
        saved: Math.round(count * 2),
      });
    }

    // ─────────────────────────────────────────────
    // 8. Handoff Rate
    // ─────────────────────────────────────────────
    const escalatedCount = await prisma.conversation.count({
      where: {
        chatbotId: { in: chatbotIds },
        status: "ESCALATED",
        createdAt: { gte: startDate },
      },
    });
    const handoffRate =
      totalConversions > 0
        ? parseFloat(((escalatedCount / totalConversions) * 100).toFixed(1))
        : 0;

    // ─────────────────────────────────────────────
    // 9. Average Response Time (ms)
    // ─────────────────────────────────────────────
    // Approximate: fetch conversations with their messages and calculate
    // assistant reply latency vs previous user message timestamp
    let avgResponseTimeMs: number | null = null;
    try {
      // Sample last 100 conversations for performance
      const recentConvIds = await prisma.conversation.findMany({
        where: {
          chatbotId: { in: chatbotIds },
          createdAt: { gte: startDate },
        },
        select: { id: true },
        take: 100,
        orderBy: { createdAt: "desc" },
      });

      const convIds = recentConvIds.map((c) => c.id);

      if (convIds.length > 0) {
        const messages = await prisma.message.findMany({
          where: { conversationId: { in: convIds } },
          select: { conversationId: true, role: true, createdAt: true },
          orderBy: [{ conversationId: "asc" }, { createdAt: "asc" }],
        });

        // Group by conversation
        const convMessages: Record<string, typeof messages> = {};
        for (const msg of messages) {
          if (!convMessages[msg.conversationId]) convMessages[msg.conversationId] = [];
          convMessages[msg.conversationId].push(msg);
        }

        const deltas: number[] = [];
        for (const msgs of Object.values(convMessages)) {
          for (let i = 1; i < msgs.length; i++) {
            const prev = msgs[i - 1];
            const curr = msgs[i];
            if (String(prev.role) === "user" && String(curr.role) === "assistant") {
              const diff = curr.createdAt.getTime() - prev.createdAt.getTime();
              if (diff > 0 && diff < 120000) {
                // Cap at 2 minutes to filter stale sessions
                deltas.push(diff);
              }
            }
          }
        }

        if (deltas.length > 0) {
          avgResponseTimeMs = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
        }
      }
    } catch (err) {
      console.warn("[Analytics] Avg response time calculation failed:", err);
    }

    // ─────────────────────────────────────────────
    // 10. Knowledge Gaps (Missing Knowledge notifications)
    // ─────────────────────────────────────────────
    let knowledgeGaps = 0;
    try {
      knowledgeGaps = await (prisma as any).notification.count({
        where: {
          title: { contains: "Missing Knowledge" },
          createdAt: { gte: startDate },
        },
      });
    } catch {
      knowledgeGaps = 0;
    }

    // ─────────────────────────────────────────────
    // 11. AI Savings (realistic formula)
    // avg agent cost: $15/hr, avg convo: 8 min = 0.133 hr → $2/convo
    // ─────────────────────────────────────────────
    const aiSavings = Math.round(totalConversions * 2);

    return NextResponse.json({
      totalConversions,
      conversionsChangePercent,
      resolutionRate: Math.round(resolutionRate),
      resolutionChangePercent,
      satisfactionScore,
      aiSavings,
      handoffRate,
      avgResponseTimeMs,
      knowledgeGaps,
      totalCost: tokenStats._sum.cost || 0,
      totalTokens: tokenStats._sum.tokensUsed || 0,
      sourceData,
      sentimentData,
      trendData,
      botPerformance: botPerformance.sort((a, b) => b.msgs - a.msgs),
      chatbots: allChatbots,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
