import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import IORedis from "ioredis";
import { Queue } from "bullmq";

const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const channelQueue = new Queue("channel", { connection: redisConnection });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const event: string = body.event || "";
    const payload = body.payload || {};

    console.log(`[BirdWebhook] Event: ${event}, direction: ${payload.direction}`);

    // Only process incoming messages
    if (payload.direction !== "incoming") {
      return NextResponse.json({ ok: true });
    }

    if (!event.includes(".inbound")) {
      return NextResponse.json({ ok: true });
    }

    let platform: "whatsapp" | "instagram" | "facebook" | null = null;
    if (event.startsWith("whatsapp.")) platform = "whatsapp";
    else if (event.startsWith("instagram.")) platform = "instagram";
    else if (event.startsWith("facebook.")) platform = "facebook";

    if (!platform) return NextResponse.json({ ok: true });

    // Extract sender/receiver from Bird payload structure
    const senderId = payload.sender?.contact?.identifierValue
      || payload.sender?.contact?.id
      || null;

    const receiverConnectorId = payload.receiver?.connector?.id || null;
    const receiverNumber = payload.receiver?.connector?.identifierValue || null;

    const text = payload.body?.text?.text || payload.body?.content || "";
    const messageId = payload.id || null;

    if (!senderId) {
      console.warn("[BirdWebhook] No senderId found");
      return NextResponse.json({ ok: true });
    }

    console.log(`[BirdWebhook] ${platform} from ${senderId}, connectorId: ${receiverConnectorId}, text: "${text}"`);

    // Deduplication
    if (messageId) {
      const isNew = await redisConnection.set(`webhook_bird:${messageId}`, "1", "EX", 300, "NX");
      if (!isNew) {
        console.log(`[BirdWebhook] Duplicate skipped: ${messageId}`);
        return NextResponse.json({ ok: true });
      }
    }

    const channelTypeMap: Record<string, string> = {
      whatsapp: "WHATSAPP",
      instagram: "INSTAGRAM",
      facebook: "FACEBOOK",
    };

    const channelType = channelTypeMap[platform];

    // Try to find channel by Bird connector ID stored in phoneNumberId
    let channel = receiverConnectorId ? await prisma.channel.findFirst({
      where: { type: channelType as any, status: "CONNECTED", phoneNumberId: receiverConnectorId }
    }) : null;

    // Fallback: find by receiver number
    if (!channel && receiverNumber) {
      channel = await prisma.channel.findFirst({
        where: { type: channelType as any, status: "CONNECTED", phoneNumberId: receiverNumber }
      });
    }

    // Fallback: any connected channel of this type
    if (!channel) {
      channel = await prisma.channel.findFirst({
        where: { type: channelType as any, status: "CONNECTED" }
      });
    }

    if (!channel) {
      console.warn(`[BirdWebhook] No ${channelType} channel found in DB`);
      return NextResponse.json({ ok: true });
    }

    // Extract contact info from Bird payload
    const contactName = payload.sender?.contact?.annotations?.name 
      || payload.sender?.contact?.displayName
      || payload.sender?.contact?.name
      || null;
    const contactPhone = platform === "whatsapp" ? senderId : null;

    console.log(`[BirdWebhook] Contact info: name=${contactName}, annotations=${JSON.stringify(payload.sender?.contact?.annotations)}`);
    await channelQueue.add("process-inbound", {
      type: "inbound",
      chatbotId: channel.chatbotId,
      channel: platform,
      recipientId: senderId,
      message: text,
      attachments: [],
      platformMetadata: { messageId, event, birdConnectorId: receiverConnectorId },
      contactInfo: { contactName, contactPhone }
    });

    console.log(`[BirdWebhook] ✅ Enqueued ${platform} message for chatbot ${channel.chatbotId}`);
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("[BirdWebhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "Bird Webhook" });
}
