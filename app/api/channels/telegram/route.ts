import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatbotId, botToken, botUsername } = await req.json();
    if (!chatbotId || !botToken) {
      return NextResponse.json({ error: "chatbotId and botToken are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, OR: [{ userId: user.id }, ...(user.organizationId ? [{ organizationId: user.organizationId }] : [])] }
    });
    if (!chatbot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

    // Validate bot token by calling Telegram getMe
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return NextResponse.json({ error: "Invalid bot token. Please check your BotFather token." }, { status: 400 });
    }

    const resolvedUsername = botUsername || meData.result.username;

    // Upsert channel
    const existing = await prisma.channel.findFirst({ where: { chatbotId, type: "TELEGRAM" } });
    const channelData = {
      type: "TELEGRAM" as any,
      name: `Telegram: @${resolvedUsername}`,
      status: "CONNECTED" as any,
      config: { botToken, botUsername: resolvedUsername } as any,
      phoneNumberId: meData.result.id.toString(),
    };

    let channel;
    if (existing) {
      channel = await prisma.channel.update({ where: { id: existing.id }, data: channelData });
    } else {
      channel = await prisma.channel.create({ data: { chatbotId, ...channelData } });
    }

    // Register webhook with Telegram using channel.id
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://jcaesars.com"}/api/webhooks/telegram/${channel.id}`;
    const webhookRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message"] }),
    });
    const webhookData = await webhookRes.json();
    if (!webhookData.ok) {
      return NextResponse.json({ error: `Failed to register webhook: ${webhookData.description}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, botUsername: resolvedUsername });
  } catch (error) {
    console.error("[TelegramConnect] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId");
    if (!chatbotId) return NextResponse.json({ error: "chatbotId required" }, { status: 400 });

    const channel = await prisma.channel.findFirst({ where: { chatbotId, type: "TELEGRAM" } });
    if (channel) {
      const config = channel.config as any;
      if (config.botToken) {
        await fetch(`https://api.telegram.org/bot${config.botToken}/deleteWebhook`).catch(() => {});
      }
      await prisma.channel.delete({ where: { id: channel.id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TelegramDisconnect] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
