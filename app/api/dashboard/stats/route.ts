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

    const chatbotFilter = {
      OR: [
        { userId },
        ...(user.organizationId ? [{ organizationId: user.organizationId }] : [])
      ]
    };

    // Fetch stats in parallel
    const [
      totalChatbots,
      totalConversations,
      totalMessages,
      activeUsersRaw,
      recentChatbots,
      recentConversationsRaw
    ] = await Promise.all([
      prisma.chatbot.count({ where: chatbotFilter }),
      prisma.conversation.count({ where: { chatbot: chatbotFilter } }),
      prisma.message.count({ where: { conversation: { chatbot: chatbotFilter } } }),
      prisma.conversation.groupBy({
        by: ['channelUserId'],
        where: { chatbot: chatbotFilter, channelUserId: { not: null } },
      }),
      prisma.chatbot.findMany({
        where: chatbotFilter,
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
        where: { chatbot: chatbotFilter },
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

    // Fetch CRM contacts for recent conversations
    const chatbotIds = (await prisma.chatbot.findMany({
      where: chatbotFilter,
      select: { id: true }
    })).map(c => c.id);

    const contacts = await (prisma as any).crmContact.findMany({
      where: {
        chatbotId: { in: chatbotIds }
      }
    });

    const contactMap = new Map();
    for (const contact of contacts) {
      if (contact.externalId) {
        contactMap.set(`${contact.chatbotId}_${contact.externalId}`, contact);
      }
    }

    // Format recent conversations
    const recentConversations = recentConversationsRaw.map(conv => {
      const lastMessage = conv.messages[0];
      const contactKey = `${conv.chatbotId}_${conv.channelUserId}`;
      const contact = conv.channelUserId ? contactMap.get(contactKey) : null;

      return {
        user: contact?.name || conv.channelUserId || "Guest User",
        avatar: contact?.profilePic || null,
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
