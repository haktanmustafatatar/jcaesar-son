import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch contacts for all chatbots belonging to the user
    const contacts = await (prisma as any).crmContact.findMany({
      where: {
        chatbot: {
          userId: userId
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

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const contact = await (prisma as any).crmContact.findUnique({
      where: { id },
      include: { chatbot: true }
    });

    if (!contact || contact.chatbot.userId !== userId) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await (prisma as any).crmContact.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Contact Error:", error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
