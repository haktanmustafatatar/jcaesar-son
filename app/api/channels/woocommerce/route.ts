import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { searchWooProducts } from "@/lib/integrations/woocommerce";

/**
 * POST /api/channels/woocommerce — Connect a WooCommerce store to a chatbot
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatbotId, baseUrl, consumerKey, consumerSecret } = await req.json();

    if (!chatbotId || !baseUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: "chatbotId, baseUrl, consumerKey, and consumerSecret are required" },
        { status: 400 }
      );
    }

    // Verify the chatbot belongs to this user
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
    if (!chatbot || chatbot.userId !== user.id) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Test the connection
    try {
      const testProducts = await searchWooProducts(
        { baseUrl, consumerKey, consumerSecret },
        "test"
      );
      console.log(`[WooConnect] Test successful — found ${testProducts.length} products`);
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to connect to WooCommerce. Please check your credentials." },
        { status: 400 }
      );
    }

    // Upsert channel
    const existingChannel = await prisma.channel.findFirst({
      where: { chatbotId, type: "WOOCOMMERCE" },
    });

    let channel;
    if (existingChannel) {
      channel = await prisma.channel.update({
        where: { id: existingChannel.id },
        data: {
          config: { baseUrl, consumerKey, consumerSecret },
          status: "CONNECTED",
          name: `WooCommerce — ${new URL(baseUrl).hostname}`,
        },
      });
    } else {
      channel = await prisma.channel.create({
        data: {
          chatbotId,
          type: "WOOCOMMERCE",
          name: `WooCommerce — ${new URL(baseUrl).hostname}`,
          config: { baseUrl, consumerKey, consumerSecret },
          status: "CONNECTED",
        },
      });
    }

    return NextResponse.json({
      success: true,
      channel: { id: channel.id, status: channel.status, name: channel.name },
    });
  } catch (error) {
    console.error("[WooConnect] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/channels/woocommerce — Disconnect WooCommerce from a chatbot
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId");

    if (!chatbotId) {
      return NextResponse.json({ error: "chatbotId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.channel.deleteMany({
      where: { chatbotId, type: "WOOCOMMERCE" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WooDisconnect] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
