import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Replace double quotes with double double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
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
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    // Create CSV content
    const headers = ["id", "contactName", "channel", "status", "lastMessage", "messageCount", "createdAt"];
    const rows = conversations.map(conv => {
      const lastMessage = conv.messages[0]?.content || "";
      const contactName = conv.contactName || "Ziyaretçi";
      return [
        conv.id,
        contactName,
        conv.channel,
        conv.status,
        lastMessage,
        conv.messages.length,
        conv.createdAt.toISOString()
      ].map(escapeCSVValue).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const dateStr = new Date().toISOString().split("T")[0];

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=conversations-${dateStr}.csv`,
      },
    });
  } catch (error) {
    console.error("Error exporting conversations:", error);
    return new NextResponse("Failed to export conversations", { status: 500 });
  }
}
