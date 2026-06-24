import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import IORedis from "ioredis";
import { Queue } from "bullmq";

const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const channelQueue = new Queue("channel", { connection: redisConnection });

export async function POST(req: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
  try {
    const { channelId } = await params;
    const body = await req.json();
    const message = body.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text;
    const messageId = message.message_id?.toString();
    const fromName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || null;

    // Deduplication
    if (messageId) {
      const isNew = await redisConnection.set(`webhook_tg:${messageId}`, "1", "EX", 300, "NX");
      if (!isNew) return NextResponse.json({ ok: true });
    }

    // Find Telegram channel by dynamic channelId
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, type: "TELEGRAM", status: "CONNECTED" }
    });

    if (!channel) {
      console.warn(`[TelegramWebhook] Connected channel not found for ID: ${channelId}`);
      return NextResponse.json({ ok: true });
    }

    await channelQueue.add("process-inbound", {
      type: "inbound",
      chatbotId: channel.chatbotId,
      channel: "telegram",
      recipientId: chatId,
      message: text,
      attachments: [],
      platformMetadata: { messageId },
      contactInfo: { contactName: fromName, contactPhone: null }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TelegramWebhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "Telegram Webhook" });
}
