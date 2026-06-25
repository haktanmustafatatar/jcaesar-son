import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamRAGResponse, logTokenUsage, LLMModel, performRAGSearch } from "@/lib/ai";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatbotId } = await params;
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    
    // Rate Limit: 5 requests per minute per IP per chatbot
    const { success } = await rateLimit(`${ip}:${chatbotId}`, 5, 60);
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }

    const { messages: rawMessages, conversationId: existingId } = await req.json();
    
    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const messages = rawMessages.slice(-20);
    const lastMessage = messages[messages.length - 1];
    const userMessageContent = lastMessage.content;

    // 1. Get Chatbot
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        dataSources: {
          where: { status: "COMPLETED" },
        },
      },
    });

    if (!chatbot || !chatbot.isPublic || chatbot.status !== "ACTIVE") {
      return NextResponse.json({ error: "Chatbot not available or not active" }, { status: 403 });
    }

    // 2. Handle Conversation Persistence
    let conversation;
    if (existingId) {
      conversation = await prisma.conversation.findUnique({ where: { id: existingId } });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          chatbotId,
          channel: "widget",
          status: "ACTIVE",
          ipAddress: req.headers.get("x-forwarded-for") || "unknown",
          userAgent: req.headers.get("user-agent"),
        }
      });
    }

    // 3. Save User Message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: userMessageContent,
      }
    });

    // 4. Perform RAG Search
    const { context, sources, lowConfidence } = await performRAGSearch({
      chatbotId,
      query: userMessageContent,
      limit: 5,
    });

    // 6. Stream Response & Log Usage
    const response = await streamRAGResponse({
      messages: messages,
      model: (chatbot.model as LLMModel) || "gpt-4o",
      systemPrompt: chatbot.systemPrompt,
      context: context || "No specific context found.",
      onFinish: async ({ text, usage }) => {
        // Save Assistant Message
        await prisma.message.create({
          data: {
            conversationId: conversation!.id,
            role: "ASSISTANT",
            content: text,
            model: chatbot.model,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            tokensUsed: usage.totalTokens,
            sources: sources.filter(s => s.similarity > 0.5).map(s => ({ title: s.title, url: s.url }))
          }
        });

        // Log Token Usage for Billing
        await logTokenUsage({
          userId: chatbot.userId,
          chatbotId: chatbot.id,
          conversationId: conversation!.id,
          model: (chatbot.model as LLMModel) || "gpt-4o",
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversation!.id },
          data: { updatedAt: new Date() }
        });
      }
    });

    return response.toDataStreamResponse({
      headers: {
        "x-conversation-id": conversation.id
      }
    });
  } catch (error) {
    console.error("Widget Chat Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}
