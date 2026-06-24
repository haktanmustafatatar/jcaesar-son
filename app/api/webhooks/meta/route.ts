import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import IORedis from "ioredis";
import { Queue } from "bullmq";
import crypto from "crypto";

const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const channelQueue = new Queue("channel", { connection: redisConnection });

function verifyMetaSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!secret) return false;
  if (!signature) return false;
  const parts = signature.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") return false;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("[MetaWebhook] META_WEBHOOK_VERIFY_TOKEN not configured");
    return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      console.error("[MetaWebhook] Failed to parse JSON body:", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error("[MetaWebhook] META_APP_SECRET not configured.");
      return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
    }
    if (!verifyMetaSignature(rawBody, signature, appSecret)) {
      console.error("[MetaWebhook] Signature verification failed.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const entry = body.entry?.[0];
    if (!entry) return NextResponse.json({ ok: true });

    // --- WHATSAPP ---
    if (body.object === "whatsapp_business_account") {
      const change = entry.changes?.[0]?.value;
      const message = change?.messages?.[0];
      const metadata = change?.metadata;

      if (message && (message.type === "text" || message.type === "image") && metadata) {
        const messageId = message.id;
        const from = message.from;
        const text = message.type === "text" ? message.text.body : (message.image?.caption || "");
        const attachments = message.type === "image" ? [{
          type: "image",
          url: `whatsapp_media_id:${message.image.id}`
        }] : [];
        const phoneNumberId = metadata.phone_number_id;

        const cacheKey = `webhook_meta:msg:${messageId}`;
        const isNew = await redisConnection.set(cacheKey, "1", "EX", 300, "NX");
        if (!isNew) {
          console.log(`[MetaWebhook] WhatsApp Duplicate skipped: ${messageId}`);
          return NextResponse.json({ ok: true });
        }

        const channel = await prisma.channel.findFirst({
          where: { type: "WHATSAPP", phoneNumberId, status: "CONNECTED" }
        });

        if (channel) {
          await enqueueInboundMessage({
            chatbotId: channel.chatbotId,
            channel: "whatsapp",
            senderId: from,
            message: text,
            attachments,
            platformMetadata: { message_id: messageId }
          });
        } else {
          console.warn(`[MetaWebhook] No WHATSAPP channel found for phoneNumberId: ${phoneNumberId}`);
        }
      }
    }

    // --- MESSENGER / INSTAGRAM ---
    else if (body.object === "page" || body.object === "instagram") {
      const messaging = entry.messaging?.[0];

      if (messaging && messaging.message && !messaging.message.is_echo) {
        const platform = body.object === "instagram" ? "instagram" : "facebook";
        const senderId = messaging.sender.id;
        const receiverId = messaging.recipient.id;
        const text = messaging.message.text;
        const messageId = messaging.message.mid;
        const attachments = messaging.message.attachments?.map((att: any) => ({
          type: att.type,
          url: att.payload?.url
        })) || [];

        console.log(`[MetaWebhook] ${platform.toUpperCase()} message from ${senderId} to ${receiverId}`);

        if (messageId) {
          const cacheKey = `webhook_meta:msg:${messageId}`;
          const isNew = await redisConnection.set(cacheKey, "1", "EX", 300, "NX");
          if (!isNew) {
            console.log(`[MetaWebhook] ${platform.toUpperCase()} Duplicate skipped: ${messageId}`);
            return NextResponse.json({ ok: true });
          }
        }

        const channelType = body.object === "page" ? "FACEBOOK" : "INSTAGRAM";

        const channel = await prisma.channel.findFirst({
          where: {
            type: channelType as any,
            status: "CONNECTED",
            phoneNumberId: receiverId
          }
        });

        console.log(`[MetaWebhook] Channel lookup: type=${channelType}, receiverId=${receiverId}, found=${!!channel}`);

        if (channel && (text || attachments.length > 0)) {
          await enqueueInboundMessage({
            chatbotId: channel.chatbotId,
            channel: platform,
            senderId,
            message: text || "",
            attachments,
            platformMetadata: { mid: messageId }
          });
          console.log(`[MetaWebhook] Enqueued ${platform} message for chatbot ${channel.chatbotId}`);
        } else if (!channel) {
          console.warn(`[MetaWebhook] No ${channelType} channel found for receiverId: ${receiverId}`);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[MetaWebhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function enqueueInboundMessage({
  chatbotId, channel, senderId, message, attachments = [], platformMetadata
}: {
  chatbotId: string;
  channel: string;
  senderId: string;
  message: string;
  attachments?: Array<{ type: string; url: string }>;
  platformMetadata: any;
}) {
  await channelQueue.add("process-inbound", {
    type: "inbound",
    chatbotId,
    channel,
    recipientId: senderId,
    message,
    attachments,
    platformMetadata
  });
}
