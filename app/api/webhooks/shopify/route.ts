import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import IORedis from "ioredis";
import { Queue } from "bullmq";
import crypto from "crypto";

const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const channelQueue = new Queue("channel", { connection: redisConnection });

/**
 * POST /api/webhooks/shopify
 * Handles incoming proactive Shopify webhooks (orders/create, orders/fulfilled)
 * Sends a proactive message to the matching customer's active conversation
 */
export async function POST(req: NextRequest) {
  try {
    const topic = req.headers.get("x-shopify-topic") || "";
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || "";
    const shopDomain = req.headers.get("x-shopify-shop-domain") || "";

    const rawBody = await req.text();

    // --- HMAC Signature Verification ---
    // Find the matching Shopify channel to get its accessToken / secret
    const shopifyChannels = await prisma.channel.findMany({
      where: { type: "SHOPIFY", status: "CONNECTED" },
    });

    // Find the channel that matches this shop's domain
    let matchedChannel = null;
    let matchedConfig: any = null;

    for (const ch of shopifyChannels) {
      try {
        const cfg = typeof ch.config === "string" ? JSON.parse(decrypt(ch.config)) : (ch.config as any);
        if (cfg.shopDomain && shopDomain.includes(cfg.shopDomain.replace("https://", "").replace("http://", ""))) {
          matchedChannel = ch;
          matchedConfig = cfg;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!matchedChannel || !matchedConfig) {
      console.warn(`[ShopifyWebhook] No matching connected channel for shop: ${shopDomain}`);
      return NextResponse.json({ ok: true });
    }

    // Verify HMAC if a webhook secret exists
    if (matchedConfig.webhookSecret && hmacHeader) {
      const hash = crypto
        .createHmac("sha256", matchedConfig.webhookSecret)
        .update(rawBody, "utf8")
        .digest("base64");

      if (hash !== hmacHeader) {
        console.warn("[ShopifyWebhook] HMAC verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const chatbotId = matchedChannel.chatbotId;

    // --- Build proactive message based on event topic ---
    let proactiveMessage = "";
    let customerEmail = payload.email || payload.customer?.email || "";
    let customerPhone = payload.shipping_address?.phone || payload.customer?.phone || "";

    if (topic === "orders/create") {
      const orderName = payload.name || payload.order_number || "";
      const totalPrice = payload.total_price || "0.00";
      const currency = payload.currency || "TRY";
      const items = (payload.line_items || []).map((item: any) => item.title).join(", ");

      proactiveMessage = `🛍️ Yeni siparişiniz alındı!\n\n📦 Sipariş: ${orderName}\n💰 Toplam: ${totalPrice} ${currency}\n🛒 Ürünler: ${items}\n\nSiparişiniz hazırlanmaya başlandı. Herhangi bir sorunuz olursa burada yardımcı olabilirim.`;
    } else if (topic === "orders/fulfilled") {
      const orderName = payload.name || payload.order_number || "";
      const trackingNumber = payload.fulfillments?.[0]?.tracking_number || "";
      const trackingCompany = payload.fulfillments?.[0]?.tracking_company || "";
      const trackingUrl = payload.fulfillments?.[0]?.tracking_url || "";

      proactiveMessage = `📦 Siparişiniz kargoya verildi!\n\n🛒 Sipariş: ${orderName}${trackingCompany ? `\n🚚 Kargo firması: ${trackingCompany}` : ""}${trackingNumber ? `\n📋 Takip numarası: ${trackingNumber}` : ""}${trackingUrl ? `\n🔗 Takip linki: ${trackingUrl}` : ""}\n\nSiparişiniz yolda! Herhangi bir sorunuz olursa burada yardımcı olabilirim.`;
    } else {
      // Unsupported topic — acknowledge without processing
      return NextResponse.json({ ok: true });
    }

    if (!proactiveMessage) {
      return NextResponse.json({ ok: true });
    }

    // --- Find active conversation matching this customer ---
    // Find CrmContact first, then find conversation by chatbotId + channelUserId
    let conversation = null;

    if (customerEmail) {
      const crmContact = await (prisma as any).crmContact.findFirst({
        where: { chatbotId, email: customerEmail },
      });

      if (crmContact?.externalId) {
        conversation = await prisma.conversation.findFirst({
          where: {
            chatbotId,
            channelUserId: crmContact.externalId,
            status: { not: "CLOSED" },
          },
          orderBy: { updatedAt: "desc" },
        });
      }
    }

    if (!conversation && customerPhone) {
      const phoneClean = customerPhone.replace(/\D/g, "").slice(-10);
      const crmContact = await (prisma as any).crmContact.findFirst({
        where: {
          chatbotId,
          phone: { contains: phoneClean },
        },
      });

      if (crmContact?.externalId) {
        conversation = await prisma.conversation.findFirst({
          where: {
            chatbotId,
            channelUserId: crmContact.externalId,
            status: { not: "CLOSED" },
          },
          orderBy: { updatedAt: "desc" },
        });
      }
    }

    if (conversation) {
      // Push the proactive message through the worker queue
      await channelQueue.add("process-outbound", {
        type: "outbound",
        chatbotId,
        conversationId: conversation.id,
        channel: conversation.channel,
        recipientId: conversation.channelUserId,
        message: proactiveMessage,
        attachments: [],
        platformMetadata: { shopifyTopic: topic, shopDomain },
      });

      console.log(`[ShopifyWebhook] Proactive message queued for conversation ${conversation.id} (topic: ${topic})`);
    } else {
      console.info(`[ShopifyWebhook] No active conversation found for customer email=${customerEmail} phone=${customerPhone}. Skipping proactive message.`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ShopifyWebhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "Shopify Webhook" });
}
