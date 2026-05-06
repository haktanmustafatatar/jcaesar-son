import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWhatsAppMessage, sendWhatsAppMessage, verifyMetaWebhook } from "@/lib/channels/meta";
import { performRAGSearch, generateRAGResponse, logTokenUsage, LLMModel } from "@/lib/ai";

// Meta Webhook Verification (Handshake)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_VERIFY_TOKEN || "jcaesar_verify_token";
  const result = verifyMetaWebhook(mode, token, challenge, verifyToken);

  if (result) {
    return new NextResponse(result, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// Meta Webhook Message Handling
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Parse incoming message
    const parsed = parseWhatsAppMessage(body);
    if (!parsed) {
      return NextResponse.json({ ok: true }); // Not a text message we handle
    }

    const { from, text, phoneNumberId, messageId } = parsed;

    // 2. Find associated Channel & Chatbot
    const channel = await prisma.channel.findFirst({
      where: {
        phoneNumberId,
        type: "WHATSAPP",
        status: "CONNECTED",
      },
      include: {
        chatbot: true,
      },
    });

    if (!channel || !channel.chatbot) {
      console.error(`No connected WhatsApp channel found for ID: ${phoneNumberId}`);
      return NextResponse.json({ ok: true });
    }

    const chatbot = channel.chatbot;
    const chatbotId = chatbot.id;

    // 3. Find or Create Conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        chatbotId,
        channel: "whatsapp",
        channelUserId: from,
        status: "ACTIVE",
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          chatbotId,
          channel: "whatsapp",
          channelUserId: from,
          status: "ACTIVE",
        },
      });
    }

    // 4. Save User Message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: text,
      },
    });

    // 5. RAG Search — unified approach using performRAGSearch
    const { context, sources } = await performRAGSearch({
      chatbotId,
      query: text,
      limit: 5,
    });

    // 6. Get message history (last 5)
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const formattedHistory = history
      .reverse()
      .map((m) => ({
        role: m.role.toLowerCase() as "user" | "assistant" | "system",
        content: m.content,
      }));

    // 7. Generate AI Response
    const aiResponse = await generateRAGResponse({
      messages: formattedHistory,
      model: (chatbot.model as LLMModel) || "gpt-4o",
      systemPrompt: chatbot.systemPrompt,
      context: context || "No specific context found.",
      chatbotId,
      conversationId: conversation.id,
    });

    const replyText = aiResponse.text;

    // 8. Send Reply via WhatsApp API
    const config = channel.config as any;
    const accessToken = config.accessToken;

    if (accessToken) {
      await sendWhatsAppMessage(from, replyText, phoneNumberId, accessToken);
    }

    // 9. Save Assistant Message & Log Usage
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: replyText,
        tokensUsed: aiResponse.usage.totalTokens,
        promptTokens: aiResponse.usage.promptTokens,
        completionTokens: aiResponse.usage.completionTokens,
        model: chatbot.model,
        sources: sources.map(s => ({ title: s.title, url: s.url, similarity: s.similarity })),
      },
    });

    // Log usage
    if (chatbot.userId) {
      await logTokenUsage({
        userId: chatbot.userId,
        chatbotId,
        conversationId: conversation.id,
        model: (chatbot.model as LLMModel) || "gpt-4o",
        promptTokens: aiResponse.usage.promptTokens,
        completionTokens: aiResponse.usage.completionTokens,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
