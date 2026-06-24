import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId }
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;

    const contact = await prisma.crmContact.findUnique({
      where: { id },
      include: {
        chatbot: {
          select: { name: true, userId: true, organizationId: true }
        }
      }
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Verify ownership
    const hasAccess = 
      contact.chatbot.userId === dbUser.id || 
      (dbUser.organizationId && contact.chatbot.organizationId === dbUser.organizationId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // Fetch related appointments
    const appointments = await prisma.appointment.findMany({
      where: { contactId: id },
      include: { staff: true },
      orderBy: { startTime: "desc" }
    });

    // Fetch related conversations
    const conversations = await prisma.conversation.findMany({
      where: {
        chatbotId: contact.chatbotId,
        OR: [
          ...(contact.email ? [{ contactEmail: contact.email }] : []),
          ...(contact.externalId ? [{ channelUserId: contact.externalId }] : []),
          ...(contact.phone ? [{ contactPhone: contact.phone }] : [])
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json({
      contact,
      appointments,
      conversations
    });
  } catch (error) {
    console.error("[CRMContactDetailAPI] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
