import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addNotificationJob } from "@/lib/queue";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { chatbotId, subject, message } = body;

    if (!chatbotId || !message) {
      return NextResponse.json({ error: "Chatbot ve mesaj içeriği zorunludur." }, { status: 400 });
    }

    // Fetch all contacts for this chatbot
    const contacts = await (prisma as any).crmContact.findMany({
      where: {
        chatbotId,
        chatbot: { userId }
      }
    });

    if (contacts.length === 0) {
      return NextResponse.json({ error: "Seçili bot için kayıtlı kişi bulunamadı." }, { status: 404 });
    }

    // Schedule notification for each contact
    let sentCount = 0;
    const { addChannelJob } = await import("@/lib/queue");

    for (const contact of contacts) {
      try {
        const personalizedMsg = message.replace("{name}", contact.name || "Müşterimiz");
        const channel = contact.sourceChannel?.toLowerCase();

        if (channel && channel !== "widget" && contact.externalId) {
          // Send via source channel
          await addChannelJob({
            type: "send-message",
            channel: channel as any,
            recipientId: contact.externalId,
            message: personalizedMsg,
            chatbotId,
            conversationId: ""
          });
          sentCount++;
        } else if (contact.email) {
          // Fallback to email
          await addNotificationJob({
            type: "email",
            to: contact.email,
            subject: subject || "Duyuru",
            body: personalizedMsg,
          });
          sentCount++;
        }
      } catch (err) {
        console.error(`Failed to schedule campaign for ${contact.id}`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${sentCount} kişiye kampanya mesajı planlandı.` 
    });
  } catch (error) {
    console.error("Bulk Campaign Error:", error);
    return NextResponse.json({ error: "Kampanya oluşturulurken hata oluştu." }, { status: 500 });
  }
}
