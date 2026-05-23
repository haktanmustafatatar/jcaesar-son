import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// GET /api/chatbots/[id] - Get chatbot details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    const { id } = await params;

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });

    const chatbot = await prisma.chatbot.findUnique({
      where: { id },
      include: {
        dataSources: true,
        organization: {
          include: { plan: true }
        },
        _count: {
          select: { conversations: true },
        },
      },
    });

    if (!chatbot || chatbot.userId !== user?.id) {
      return NextResponse.json({ error: "Chatbot not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(chatbot);
  } catch (error) {
    console.error("Error fetching chatbot:", error);
    return NextResponse.json(
      { error: "Failed to fetch chatbot" },
      { status: 500 }
    );
  }
}

// DELETE /api/chatbots/[id] - Delete chatbot
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    const { id } = await params;

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Is current user owner?
    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    const chatbot = await prisma.chatbot.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!chatbot || chatbot.userId !== user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete cascading everything (Prisma usually handles this if relations are set to cascade)
    // But let's be explicit if needed or trust prisma.
    await prisma.chatbot.delete({
      where: { id },
    });

    await createAuditLog({
      userId: user?.id,
      userEmail: user?.email,
      action: "DELETE_CHATBOT",
      entityType: "CHATBOT",
      entityId: id,
      metadata: { id }
    });

    return NextResponse.json({ message: "Chatbot deleted successfully" });
  } catch (error) {
    console.error("Error deleting chatbot:", error);
    return NextResponse.json(
      { error: "Failed to delete chatbot" },
      { status: 500 }
    );
  }
}

// PATCH /api/chatbots/[id] - Update chatbot
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    const { id } = await params;

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    
    // Check ownership
    const existing = await prisma.chatbot.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sanitize body to only include updatable fields
    const updatableFields = [
      "name", "description", "systemPrompt", "welcomeMessage", "avatar", 
      "primaryColor", "model", "temperature", "maxTokens", "isPublic", "showBranding",
      "widgetMode", "position", "fontFamily", "fontSize", "borderRadius", "widgetShadow",
      "userMessageColor", "assistantMessageColor"
    ];
    
    const data: any = {};
    updatableFields.forEach(field => {
      if (body[field] !== undefined) {
        // Handle numeric fields
        if (field === "temperature" || field === "maxTokens") {
          data[field] = Number(body[field]);
        } else {
          data[field] = body[field];
        }
      }
    });

    const chatbot = await prisma.chatbot.update({
      where: { id },
      data,
    });

    await createAuditLog({
      userId: user?.id,
      userEmail: user?.email,
      action: "UPDATE_CHATBOT",
      entityType: "CHATBOT",
      entityId: id,
      metadata: { changedFields: Object.keys(data) }
    });

    return NextResponse.json(chatbot);
  } catch (error) {
    console.error("Error updating chatbot:", error);
    return NextResponse.json(
      { error: "Failed to update chatbot" },
      { status: 500 }
    );
  }
}
