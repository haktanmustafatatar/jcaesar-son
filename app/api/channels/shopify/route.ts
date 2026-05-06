import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { searchShopifyProducts } from "@/lib/integrations/shopify";

/**
 * POST /api/channels/shopify — Connect a Shopify store to a chatbot
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatbotId, shopDomain, accessToken } = await req.json();

    if (!chatbotId || !shopDomain || !accessToken) {
      return NextResponse.json(
        { error: "chatbotId, shopDomain, and accessToken are required" },
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

    // Test the connection by fetching products
    try {
      const testProducts = await searchShopifyProducts(
        { shopDomain, accessToken },
        "test"
      );
      console.log(`[ShopifyConnect] Test successful — found ${testProducts.length} products`);
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to connect to Shopify. Please check your credentials." },
        { status: 400 }
      );
    }

    // Upsert channel (update if already exists, create if not)
    const existingChannel = await prisma.channel.findFirst({
      where: { chatbotId, type: "SHOPIFY" },
    });

    let channel;
    if (existingChannel) {
      channel = await prisma.channel.update({
        where: { id: existingChannel.id },
        data: {
          config: { shopDomain, accessToken },
          status: "CONNECTED",
          name: `Shopify — ${shopDomain}`,
        },
      });
    } else {
      channel = await prisma.channel.create({
        data: {
          chatbotId,
          type: "SHOPIFY",
          name: `Shopify — ${shopDomain}`,
          config: { shopDomain, accessToken },
          status: "CONNECTED",
        },
      });
    }

    return NextResponse.json({
      success: true,
      channel: { id: channel.id, status: channel.status, name: channel.name },
    });
  } catch (error) {
    console.error("[ShopifyConnect] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/channels/shopify — Disconnect Shopify from a chatbot
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
      where: { chatbotId, type: "SHOPIFY" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ShopifyDisconnect] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
