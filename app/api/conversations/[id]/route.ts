import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { triggerWebhook } from "@/lib/webhook";

/**
 * PATCH /api/conversations/[id]
 * Updates conversation status, assignment, or AI autonomy (handoff)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { aiEnabled, status, assignedTo, tags, note } = body;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { chatbot: true }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasAccess = 
      conversation.chatbot.userId === user.id || 
      (user.organizationId && conversation.chatbot.organizationId === user.organizationId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update conversation
    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        ...(aiEnabled !== undefined && { aiEnabled }),
        ...(status && { status }),
        ...(assignedTo && { assignedTo }),
        ...(tags !== undefined && { tags })
      }
    });

    // Trigger conversation.updated webhook event
    triggerWebhook(updated.chatbotId, "conversation.updated", updated);

    // Create note if provided
    if (note && typeof note === "string" && note.trim() !== "") {
      await prisma.conversationNote.create({
        data: {
          conversationId: id,
          content: note.trim(),
          createdBy: clerkId
        }
      });
    }

    // If manual takeover, record it in notes
    if (aiEnabled === false) {
      await prisma.conversationNote.create({
        data: {
          conversationId: id,
          content: "Human agent took over the conversation manually.",
          createdBy: clerkId
        }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ConversationUpdate] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/conversations/[id]
 * Permanently deletes a conversation and its messages
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { chatbot: true }
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

    await prisma.conversation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ConversationDelete] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
