import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function verifyAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) return null;
  return user;
}

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const channels = await prisma.channel.findMany({
      include: {
        chatbot: {
          select: { id: true, name: true, userId: true, user: { select: { email: true } } }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Strip sensitive tokens from config
    const sanitized = channels.map((ch) => {
      const config = (ch.config as Record<string, any>) || {};
      const { accessToken, botToken, ...safeConfig } = config;
      return {
        ...ch,
        config: {
          ...safeConfig,
          hasAccessToken: !!accessToken,
          hasBotToken: !!botToken,
        }
      };
    });

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("[AdminChannels] GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { channelId, status, phoneNumberId } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const data: Record<string, any> = {};
    if (status) data.status = status;
    if (phoneNumberId !== undefined) data.phoneNumberId = phoneNumberId;

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        action: "CHANNEL_STATUS_UPDATE",
        entityType: "Channel",
        entityId: channelId,
        userId: admin.id,
        metadata: { status, phoneNumberId },
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[AdminChannels] PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    await prisma.channel.delete({ where: { id: channelId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminChannels] DELETE error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
