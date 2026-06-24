import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        conversationAlerts: true,
        botHealthChecks: true,
        platformUpdates: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[PreferencesAPI GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { conversationAlerts, botHealthChecks, platformUpdates } = body;

    const updateData: any = {};
    if (typeof conversationAlerts === "boolean") updateData.conversationAlerts = conversationAlerts;
    if (typeof botHealthChecks === "boolean") updateData.botHealthChecks = botHealthChecks;
    if (typeof platformUpdates === "boolean") updateData.platformUpdates = platformUpdates;

    const user = await prisma.user.update({
      where: { clerkId },
      data: updateData,
      select: {
        conversationAlerts: true,
        botHealthChecks: true,
        platformUpdates: true,
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("[PreferencesAPI PATCH] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
