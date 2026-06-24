import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      return NextResponse.json([]);
    }

    // Get all chatbots for the user or their organization
    const chatbots = await prisma.chatbot.findMany({
      where: { 
        OR: [
          { userId: user.id },
          ...(user.organizationId ? [{ organizationId: user.organizationId }] : [])
        ]
      },
      select: { id: true }
    });

    const chatbotIds = chatbots.map(c => c.id);

    // Get all conversations for those chatbots
    const conversations = await prisma.conversation.findMany({
      where: { 
        chatbotId: { in: chatbotIds }
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        user: true,
        notes: {
          orderBy: { createdAt: "desc" }
        },
        chatbot: {
          select: {
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    // Get all CRM contacts for these chatbots to map them to conversations
    const contacts = await (prisma as any).crmContact.findMany({
      where: {
        chatbotId: { in: chatbotIds }
      }
    });

    // Map by chatbotId_externalId
    const contactMap = new Map();
    for (const contact of contacts) {
      if (contact.externalId) {
        contactMap.set(`${contact.chatbotId}_${contact.externalId}`, contact);
      }
    }

    const enrichedConversations = conversations.map(conv => {
      const contactKey = `${conv.chatbotId}_${conv.channelUserId}`;
      const contact = conv.channelUserId ? contactMap.get(contactKey) : null;
      
      return {
        ...conv,
        contactName: contact?.name || null,
        contactEmail: contact?.email || null,
        contactPhone: contact?.phone || null,
        contactNotes: contact?.notes || null,
        contactProfilePic: contact?.profilePic || null,
      };
    });

    return NextResponse.json(enrichedConversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

