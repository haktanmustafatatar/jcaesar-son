import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: chatbotId } = await params;
    const body = await req.json();
    const { channelId, sessionId, selectedId, type } = body;

    // Support both old (sessionId) and new (channelId) approach
    const targetId = channelId || sessionId;

    // 1. Find the pending channel
    const pendingChannel = await prisma.channel.findUnique({
      where: { id: targetId }
    });

    if (!pendingChannel) {
      return NextResponse.json({ error: "Pending channel not found" }, { status: 404 });
    }

    const config = pendingChannel.config as any;
    let finalConfig: any = {};
    let phoneNumberId = "";
    let channelName = "";
    const channelType = type || pendingChannel.type;

    if (channelType === "FACEBOOK" || channelType === "INSTAGRAM") {
      const pages = config.pages || [];
      const selectedPage = pages.find((p: any) => 
        p.id === selectedId || 
        (p.instagram_business_account && p.instagram_business_account.id === selectedId)
      );
      
      if (!selectedPage) {
        return NextResponse.json({ error: "Selected account not found" }, { status: 404 });
      }

      if (channelType === "INSTAGRAM") {
        const igAccount = selectedPage.instagram_business_account;
        finalConfig = {
          accessToken: selectedPage.access_token || config.accessToken,
          pageId: selectedPage.id,
          instagramId: igAccount?.id,
          username: igAccount?.username
        };
        phoneNumberId = igAccount?.id || selectedPage.id;
        channelName = `Instagram: ${igAccount?.username || selectedPage.name}`;
      } else {
        finalConfig = {
          accessToken: selectedPage.access_token || config.accessToken,
          pageId: selectedPage.id
        };
        phoneNumberId = selectedPage.id;
        channelName = `Facebook: ${selectedPage.name}`;
      }
    } else if (channelType === "WHATSAPP") {
      const businesses = config.businesses || config.whatsappAccounts || [];
      const selectedBiz = businesses.find((b: any) => b.id === selectedId);
      
      if (!selectedBiz) {
        return NextResponse.json({ error: "Selected WhatsApp account not found" }, { status: 404 });
      }

      finalConfig = {
        accessToken: config.accessToken || config.userToken,
        wabaId: selectedBiz.id
      };
      phoneNumberId = selectedBiz.id;
      channelName = `WhatsApp: ${selectedBiz.name || "Business Account"}`;
    }

    // 2. Update the pending channel to CONNECTED with final config
    const channel = await prisma.channel.update({
      where: { id: targetId },
      data: {
        type: channelType,
        name: channelName,
        status: "CONNECTED",
        phoneNumberId,
        config: finalConfig
      }
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error("[MetaFinalize] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
