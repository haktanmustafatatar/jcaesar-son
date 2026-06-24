import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId");

    if (!chatbotId) {
      return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
    }

    const channel = await prisma.channel.findFirst({
      where: { chatbotId, type: "GOOGLE_CALENDAR", status: "CONNECTED" }
    });

    return NextResponse.json({ connected: !!channel });
  } catch (error) {
    console.error("[GoogleStatusGET] Error:", error);
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId");

    if (!chatbotId) {
      return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
    }

    const channel = await prisma.channel.findFirst({
      where: { chatbotId, type: "GOOGLE_CALENDAR" }
    });

    if (channel) {
      await prisma.channel.delete({
        where: { id: channel.id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GoogleStatusDELETE] Error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
