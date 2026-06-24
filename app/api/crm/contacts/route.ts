import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch contacts for all chatbots belonging to the user
    const contacts = await (prisma as any).crmContact.findMany({
      where: {
        chatbot: {
          OR: [
            { userId: dbUser.id },
            ...(dbUser.organizationId ? [{ organizationId: dbUser.organizationId }] : [])
          ]
        }
      },
      include: {
        chatbot: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("CRM Contacts API Error:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const contact = await (prisma as any).crmContact.findUnique({
      where: { id },
      include: { chatbot: true }
    });

    if (!contact || (contact.chatbot.userId !== dbUser.id && (!dbUser.organizationId || contact.chatbot.organizationId !== dbUser.organizationId))) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await (prisma as any).crmContact.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Contact Error:", error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { chatbotId, name, email, phone, notes, sourceChannel, externalId } = await req.json();

    if (!chatbotId || !name) {
      return NextResponse.json({ error: "chatbotId and name are required" }, { status: 400 });
    }

    // Verify user owns the chatbot
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId }
    });

    if (!chatbot || (chatbot.userId !== dbUser.id && (!dbUser.organizationId || chatbot.organizationId !== dbUser.organizationId))) {
      return NextResponse.json({ error: "Chatbot not found or unauthorized" }, { status: 404 });
    }

    // Check if contact already exists in this chatbot CRM by email or externalId
    let existingContact = null;
    if (email) {
      existingContact = await (prisma as any).crmContact.findFirst({
        where: { chatbotId, email }
      });
    } else if (externalId) {
      existingContact = await (prisma as any).crmContact.findFirst({
        where: { chatbotId, externalId }
      });
    }

    if (existingContact) {
      // Update existing contact
      const updated = await (prisma as any).crmContact.update({
        where: { id: existingContact.id },
        data: {
          name,
          ...(phone && { phone }),
          ...(notes && { notes }),
          ...(sourceChannel && { sourceChannel }),
          ...(externalId && { externalId })
        }
      });
      return NextResponse.json({ success: true, contact: updated, updated: true });
    }

    const contact = await (prisma as any).crmContact.create({
      data: {
        chatbotId,
        name,
        email,
        phone,
        notes,
        sourceChannel: sourceChannel || "WIDGET",
        externalId,
        status: "NEW"
      }
    });

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error("Create CRM Contact Error:", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
