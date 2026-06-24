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
    const contacts = await prisma.crmContact.findMany({
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
    const idsParam = url.searchParams.get("ids");

    if (!id && !idsParam) {
      return NextResponse.json({ error: "ID or IDs required" }, { status: 400 });
    }

    // Handle bulk deletion
    if (idsParam) {
      const ids = idsParam.split(",");
      const contactsToDelete = await prisma.crmContact.findMany({
        where: {
          id: { in: ids },
          chatbot: {
            OR: [
              { userId: dbUser.id },
              ...(dbUser.organizationId ? [{ organizationId: dbUser.organizationId }] : [])
            ]
          }
        }
      });

      const verifiedIds = contactsToDelete.map(c => c.id);

      const deletedCount = await prisma.crmContact.deleteMany({
        where: { id: { in: verifiedIds } }
      });

      return NextResponse.json({ success: true, count: deletedCount.count });
    }

    // Handle single deletion
    const contact = await (prisma as any).crmContact.findUnique({
      where: { id },
    });

    if (!contact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify ownership via chatbot
    const chatbot = await prisma.chatbot.findUnique({ where: { id: contact.chatbotId } });
    if (!chatbot || (chatbot.userId !== dbUser.id && (!dbUser.organizationId || chatbot.organizationId !== dbUser.organizationId))) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await (prisma as any).crmContact.delete({ where: { id: id as string } });

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
      existingContact = await prisma.crmContact.findFirst({
        where: { chatbotId, email }
      });
    } else if (externalId) {
      existingContact = await prisma.crmContact.findFirst({
        where: { chatbotId, externalId }
      });
    }

    if (existingContact) {
      // Update existing contact
      const updated = await prisma.crmContact.update({
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
        email: email ?? undefined,
        phone: phone ?? undefined,
        notes: notes ?? undefined,
        sourceChannel: sourceChannel || "WIDGET",
        externalId: externalId ?? undefined,
        status: "NEW"
      }
    });

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error("Create CRM Contact Error:", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { id, name, email, phone, notes, status, ids, bulkStatus } = body;

    // Handle Bulk Status Update
    if (ids && Array.isArray(ids) && bulkStatus) {
      const contactsToUpdate = await prisma.crmContact.findMany({
        where: {
          id: { in: ids },
          chatbot: {
            OR: [
              { userId: dbUser.id },
              ...(dbUser.organizationId ? [{ organizationId: dbUser.organizationId }] : [])
            ]
          }
        }
      });

      const verifiedIds = contactsToUpdate.map(c => c.id);

      const updatedCount = await prisma.crmContact.updateMany({
        where: { id: { in: verifiedIds } },
        data: { status: bulkStatus }
      });

      return NextResponse.json({ success: true, count: updatedCount.count });
    }

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Verify ownership
    const contact2 = await (prisma as any).crmContact.findUnique({
      where: { id },
    });

    if (!contact2) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const chatbot2 = await prisma.chatbot.findUnique({ where: { id: contact2.chatbotId } });
    if (!chatbot2 || (chatbot2.userId !== dbUser.id && (!dbUser.organizationId || chatbot2.organizationId !== dbUser.organizationId))) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const updated = await (prisma as any).crmContact.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      }
    });

    return NextResponse.json({ success: true, contact: updated });
  } catch (error) {
    console.error("Update Contact Error:", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}
