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

function verifySlackSignature(rawBody: string, signature: string | null, timestamp: string | null, signingSecret: string): boolean {
  if (!signature || !timestamp) return false;
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
  if (parseInt(timestamp) < fiveMinutesAgo) return false;
  const baseString = `v0:${timestamp}:${rawBody}`;
  const expected = "v0=" + crypto.createHmac("sha256", signingSecret).update(baseString).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // Slack URL verification challenge
    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Verify signature if signing secret is set
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (signingSecret) {
      const signature = req.headers.get("x-slack-signature");
      const timestamp = req.headers.get("x-slack-request-timestamp");
      if (!verifySlackSignature(rawBody, signature, timestamp, signingSecret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = body.event;
    if (!event || event.type !== "message" || event.bot_id || event.subtype) {
      return NextResponse.json({ ok: true });
    }

    const channelId = event.channel;
    const text = event.text || "";
    const userId = event.user;
    const messageId = event.ts;

    if (!text || !channelId) return NextResponse.json({ ok: true });

    // Deduplication
    const isNew = await redisConnection.set(`webhook_slack:${messageId}`, "1", "EX", 300, "NX");
    if (!isNew) return NextResponse.json({ ok: true });

    const channel = await prisma.channel.findFirst({
      where: { type: "SLACK", status: "CONNECTED", phoneNumberId: channelId }
    });

    if (!channel) {
      return NextResponse.json({ ok: true });
    }

    await channelQueue.add("process-inbound", {
      type: "inbound",
      chatbotId: channel.chatbotId,
      channel: "slack",
      recipientId: channelId,
      message: text,
      attachments: [],
      platformMetadata: { ts: messageId, userId },
      contactInfo: { contactName: null, contactPhone: null }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SlackWebhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "Slack Webhook" });
}
