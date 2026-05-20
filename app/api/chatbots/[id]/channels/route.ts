import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ChannelType } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/crypto";
import { createAuditLog } from "@/lib/audit";

// Get all channels for a chatbot
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatbotId } = await params;
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });

    if (!chatbot || (chatbot.userId !== user?.id)) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    const channels = await prisma.channel.findMany({
      where: { chatbotId },
    });

    // Decrypt config for each channel
    const decryptedChannels = channels.map(channel => ({
      ...channel,
      config: typeof channel.config === 'string' ? JSON.parse(decrypt(channel.config)) : channel.config
    }));

    return NextResponse.json(decryptedChannels);
  } catch (error) {
    console.error("Fetch Channels Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Connect or Update a channel
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatbotId } = await params;
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, name, config, phoneNumberId } = await req.json();

    if (!type || !name || !config) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });

    if (!chatbot || (chatbot.userId !== user?.id)) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Encrypt config
    const encryptedConfig = encrypt(JSON.stringify(config));

    // Upsert channel
    const channel = await prisma.channel.upsert({
      where: {
        id: (await prisma.channel.findFirst({
          where: { chatbotId, type }
        }))?.id || 'new-id'
      },
      update: {
        name,
        config: encryptedConfig as any,
        phoneNumberId,
        status: "CONNECTED",
      },
      create: {
        chatbotId,
        type,
        name,
        config: encryptedConfig as any,
        phoneNumberId,
        status: "CONNECTED",
      },
    });

    await createAuditLog({
      userId: user?.id,
      userEmail: user?.email,
      action: "CONNECT_CHANNEL",
      entityType: "CHANNEL",
      entityId: channel.id,
      metadata: { type, name, chatbotId }
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error("Connect Channel Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Disconnect a channel
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatbotId } = await params;
    const { userId: clerkId } = await auth();
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { chatbot: true }
    });

    if (!channel || (channel.chatbot.userId !== user?.id)) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    await prisma.channel.delete({
      where: { id: channelId },
    });

    await createAuditLog({
      userId: user?.id,
      userEmail: user?.email,
      action: "DISCONNECT_CHANNEL",
      entityType: "CHANNEL",
      entityId: channelId,
      metadata: { type: channel.type, chatbotId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Channel Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
