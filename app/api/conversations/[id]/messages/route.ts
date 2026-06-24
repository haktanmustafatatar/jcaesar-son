import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addChannelJob } from "@/lib/queue";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user has access to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        chatbot: {
          select: {
            userId: true,
            organizationId: true
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const hasAccess = 
      conversation.chatbot.userId === user.id || 
      (user.organizationId && conversation.chatbot.organizationId === user.organizationId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        chatbot: {
          select: {
            id: true,
            userId: true,
            organizationId: true
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Verify access
    const hasAccess = 
      conversation.chatbot.userId === user.id || 
      (user.organizationId && conversation.chatbot.organizationId === user.organizationId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    // 1. Save manual agent message to Database with role "ASSISTANT"
    const message = await prisma.message.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: content.trim(),
        agentId: user.id
      }
    });

    // Pause AI chatbot for this conversation upon manual agent reply (Handoff Trigger)
    if (conversation.aiEnabled) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { aiEnabled: false }
      });
      
      await prisma.conversationNote.create({
        data: {
          conversationId,
          content: "System paused AI chatbot because a human agent replied.",
          createdBy: clerkId
        }
      });
      console.log(`[InboxManualMessage] Paused AI for conversation ${conversationId} due to manual agent reply.`);
    }

    // 2. If channel is not internal "widget", dispatch the outbound job to the BullMQ worker
    const channelLower = conversation.channel.toLowerCase();
    if (["whatsapp", "instagram", "facebook", "telegram", "slack", "email"].includes(channelLower)) {
      try {
        await addChannelJob({
          type: "send-message",
          channel: channelLower as any,
          recipientId: conversation.channelUserId || "",
          message: content.trim(),
          chatbotId: conversation.chatbotId,
          conversationId: conversationId
        });
        console.log(`[InboxManualMessage] Queued channel worker outbound job for ${conversation.channel}`);
      } catch (err) {
        console.error(`[InboxManualMessage] Failed to queue outbound job:`, err);
      }
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error creating manual agent message:", error);
    return NextResponse.json(
      { error: "Failed to send manual message" },
      { status: 500 }
    );
  }
}
