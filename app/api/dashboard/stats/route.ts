import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user.id;

    // Fetch stats in parallel
    const [
      totalChatbots,
      totalConversations,
      totalMessages,
      activeUsersRaw,
      recentChatbots,
      recentConversationsRaw
    ] = await Promise.all([
      prisma.chatbot.count({ where: { userId } }),
      prisma.conversation.count({ where: { chatbot: { userId } } }),
      prisma.message.count({ where: { conversation: { chatbot: { userId } } } }),
      prisma.conversation.groupBy({
        by: ['channelUserId'],
        where: { chatbot: { userId }, channelUserId: { not: null } },
      }),
      prisma.chatbot.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: {
          name: true,
          status: true,
          _count: {
            select: { conversations: true }
          }
        }
      }),
      prisma.conversation.findMany({
        where: { chatbot: { userId } },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 3
      })
    ]);

    const activeUsers = activeUsersRaw.length;

    // Format recent conversations
    const recentConversations = recentConversationsRaw.map(conv => {
      const lastMessage = conv.messages[0];
      return {
        user: conv.channelUserId || "Guest User",
        message: lastMessage?.content || "No messages yet",
        time: lastMessage ? lastMessage.createdAt : conv.createdAt
      };
    });

    return NextResponse.json({
      overview: {
        totalChatbots,
        totalConversations,
        totalMessages,
        activeUsers
      },
      recentChatbots: recentChatbots.map(bot => ({
        name: bot.name,
        status: bot.status,
        conversations: bot._count.conversations
      })),
      recentConversations
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
