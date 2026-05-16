import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatbotId } = await params;
    
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: {
        id: true,
        name: true,
        welcomeMessage: true,
        primaryColor: true,
        showBranding: true,
        status: true,
        isPublic: true,
        fontFamily: true,
        fontSize: true,
        borderRadius: true,
        widgetShadow: true,
        userMessageColor: true,
        assistantMessageColor: true,
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    if (!chatbot.isPublic || chatbot.status !== "ACTIVE") {
      return NextResponse.json({ error: "Chatbot is not available" }, { status: 403 });
    }

    return NextResponse.json(chatbot);
  } catch (error) {
    console.error("Widget API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
