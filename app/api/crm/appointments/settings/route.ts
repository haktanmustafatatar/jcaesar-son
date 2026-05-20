import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId");

    if (!chatbotId) {
      return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
    }

    const settings = await prisma.scheduleSetting.findUnique({
      where: { chatbotId }
    });

    return NextResponse.json(settings || {
      chatbotId,
      workingDays: "1,2,3,4,5",
      startHour: "09:00",
      endHour: "18:00",
      slotDuration: 60,
      staffCapacity: 3
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { chatbotId, workingDays, startHour, endHour, slotDuration, staffCapacity } = body;

    if (!chatbotId) {
      return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
    }

    const settings = await prisma.scheduleSetting.upsert({
      where: { chatbotId },
      update: {
        workingDays,
        startHour,
        endHour,
        slotDuration: Number(slotDuration) || 60,
        staffCapacity: Number(staffCapacity) || 3
      },
      create: {
        chatbotId,
        workingDays: workingDays || "1,2,3,4,5",
        startHour: startHour || "09:00",
        endHour: endHour || "18:00",
        slotDuration: Number(slotDuration) || 60,
        staffCapacity: Number(staffCapacity) || 3
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
