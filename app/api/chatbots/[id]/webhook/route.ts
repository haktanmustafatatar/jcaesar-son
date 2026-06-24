import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Helper to check user access to the chatbot
async function checkChatbotAccess(clerkId: string, chatbotId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId }
  });
  if (!user) return null;

  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId }
  });
  if (!chatbot) return null;

  const hasAccess = 
    chatbot.userId === user.id || 
    (user.organizationId && chatbot.organizationId === user.organizationId);

  return hasAccess ? user : null;
}

// GET: List all webhook endpoints for a chatbot
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

    const hasAccess = await checkChatbotAccess(clerkId, chatbotId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { chatbotId },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(endpoints);
  } catch (error) {
    console.error("[WebhookGET] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST: Add a new webhook endpoint for a chatbot
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

    const hasAccess = await checkChatbotAccess(clerkId, chatbotId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { url, events } = body;

    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "At least one event is required" }, { status: 400 });
    }

    // Generate secure secret key
    const secret = "whsec_" + crypto.randomBytes(24).toString("hex");

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        chatbotId,
        url,
        secret,
        events,
        active: true
      }
    });

    return NextResponse.json(endpoint);
  } catch (error) {
    console.error("[WebhookPOST] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE: Delete a webhook endpoint
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatbotId } = await params;
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkChatbotAccess(clerkId, chatbotId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const endpointId = searchParams.get("id");

    if (!endpointId) {
      return NextResponse.json({ error: "Endpoint ID is required" }, { status: 400 });
    }

    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, chatbotId }
    });

    if (!endpoint) {
      return NextResponse.json({ error: "Webhook endpoint not found" }, { status: 404 });
    }

    await prisma.webhookEndpoint.delete({
      where: { id: endpointId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WebhookDELETE] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
