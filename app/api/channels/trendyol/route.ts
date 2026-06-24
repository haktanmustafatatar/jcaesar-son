import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { searchTrendyolProducts } from "@/lib/integrations/trendyol";

/**
 * POST /api/channels/trendyol — Connect a Trendyol supplier account to a chatbot
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatbotId, supplierId, apiKey, apiSecret } = await req.json();

    if (!chatbotId || !supplierId || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "chatbotId, supplierId, apiKey, and apiSecret are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: chatbotId,
        OR: [
          { userId: user.id },
          ...(user.organizationId ? [{ organizationId: user.organizationId }] : []),
        ],
      },
    });
    if (!chatbot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

    // Test the connection
    try {
      await searchTrendyolProducts({ supplierId, apiKey, apiSecret }, "");
    } catch {
      return NextResponse.json(
        { error: "Trendyol credentials test failed. Please verify your Supplier ID, API Key and Secret." },
        { status: 400 }
      );
    }

    const encryptedConfig = encrypt(JSON.stringify({ supplierId, apiKey, apiSecret }));

    // Upsert channel
    const existing = await prisma.channel.findFirst({
      where: { chatbotId, type: "TRENDYOL" as any },
    });

    let channel;
    if (existing) {
      channel = await prisma.channel.update({
        where: { id: existing.id },
        data: {
          config: encryptedConfig as any,
          status: "CONNECTED" as any,
          name: `Trendyol — Supplier ${supplierId}`,
        },
      });
    } else {
      channel = await prisma.channel.create({
        data: {
          chatbotId,
          type: "TRENDYOL" as any,
          name: `Trendyol — Supplier ${supplierId}`,
          config: encryptedConfig as any,
          status: "CONNECTED" as any,
        },
      });
    }

    return NextResponse.json({ success: true, channel: { id: channel.id, name: channel.name } });
  } catch (error) {
    console.error("[TrendyolConnect] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/channels/trendyol — Disconnect Trendyol from a chatbot
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId");
    if (!chatbotId) return NextResponse.json({ error: "chatbotId required" }, { status: 400 });

    await prisma.channel.deleteMany({ where: { chatbotId, type: "TRENDYOL" as any } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TrendyolDisconnect] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
