import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatbotId, botToken, channelId, channelName } = await req.json();
    if (!chatbotId || !botToken || !channelId) {
      return NextResponse.json({ error: "chatbotId, botToken, and channelId are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, OR: [{ userId: user.id }, ...(user.organizationId ? [{ organizationId: user.organizationId }] : [])] }
    });
    if (!chatbot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

    // Validate bot token
    const authRes = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${botToken}` }
    });
    const authData = await authRes.json();
    if (!authData.ok) {
      return NextResponse.json({ error: "Invalid Slack bot token." }, { status: 400 });
    }

    const workspaceName = authData.team || "Slack Workspace";

    const existing = await prisma.channel.findFirst({ where: { chatbotId, type: "SLACK" } });
    const channelData = {
      type: "SLACK" as any,
      name: `Slack: ${channelName || channelId} (${workspaceName})`,
      status: "CONNECTED" as any,
      config: { botToken, channelId, channelName, workspaceName } as any,
      phoneNumberId: channelId,
    };

    if (existing) {
      await prisma.channel.update({ where: { id: existing.id }, data: channelData });
    } else {
      await prisma.channel.create({ data: { chatbotId, ...channelData } });
    }

    return NextResponse.json({ success: true, workspace: workspaceName });
  } catch (error) {
    console.error("[SlackConnect] Error:", error);
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

    await prisma.channel.deleteMany({ where: { chatbotId, type: "SLACK" } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SlackDisconnect] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
