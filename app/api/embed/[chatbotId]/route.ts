import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamRAGResponse, LLMModel, performRAGSearch } from "@/lib/ai";
import { addTokenUsageJob } from "@/lib/queue";

// GET /api/embed/:chatbotId/config - Get chatbot configuration for embed
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    const chatbot = await prisma.chatbot.findUnique({
      where: { slug: chatbotId },
      select: {
        id: true,
        name: true,
        welcomeMessage: true,
        primaryColor: true,
        position: true,
        showBranding: true,
        status: true,
        isPublic: true,
        collectLeads: true,
        handoffEnabled: true,
      },
    });

    if (!chatbot) {
      return NextResponse.json(
        { error: "Chatbot not found" },
        { status: 404 }
      );
    }

    if (!chatbot.isPublic || chatbot.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Chatbot is not available" },
        { status: 403 }
      );
    }

    return NextResponse.json(chatbot);
  } catch (error) {
    console.error("Error fetching chatbot config:", error);
    return NextResponse.json(
      { error: "Failed to fetch chatbot config" },
      { status: 500 }
    );
  }
}

// POST /api/embed/:chatbotId/chat - Send a message to the chatbot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    const body = await req.json();
    const { message, conversationId, name, email } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { slug: chatbotId },
    });

    if (!chatbot || !chatbot.isPublic || chatbot.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Chatbot not available" },
        { status: 403 }
      );
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          chatbotId: chatbot.id,
          channel: "widget",
          tags: (name || email) ? { name, email } : undefined,
        },
      });
    } else if (name || email) {
      // Update existing conversation with lead info if provided
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { 
          tags: { 
            ...(conversation.tags as any || {}),
            name, 
            email 
          } 
        }
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
      },
    });

    // Önceki mesajları al (son 10)
    const previousMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    // RAG: İlgili dokümanları ara
    const { context, sources } = await performRAGSearch({
      chatbotId: chatbot.id,
      query: message,
      limit: 5,
    });

    // Mesajları formatla
    const messages = previousMessages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Gelişmiş System Prompt
    const baseSystemPrompt = chatbot.systemPrompt || "You are a helpful assistant.";
    const businessContext = chatbot.businessContext ? `\nBusiness Context:\n${chatbot.businessContext}` : "";
    
    const enhancedSystemPrompt = `${baseSystemPrompt}${businessContext}

You are an AI assistant for ${chatbot.name}. 
Please follow these instructions strictly:
1. Use the provided context to answer the user's question directly.
2. If the context does not contain enough information to answer definitively, rely ONLY on the provided business context or state honestly that you do not have that specific information. Avoid hallucination.
3. Be professional, helpful, and concise.
4. Maintain a natural, conversational tone.`;

    // Stream AI response
    const result = await streamRAGResponse({
      messages,
      model: chatbot.model as LLMModel,
      systemPrompt: enhancedSystemPrompt,
      context,
      chatbotId: chatbot.id,
      conversationId: conversation.id,
      temperature: chatbot.temperature || 0.7,
      maxTokens: chatbot.maxTokens || 1000,
      onFinish: async (completion) => {
        const promptTokens = completion.usage?.promptTokens || 0;
        const completionTokens = completion.usage?.completionTokens || 0;

        // Asistan mesajını kaydet
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "ASSISTANT",
            content: completion.text,
            model: chatbot.model,
            promptTokens,
            completionTokens,
            sources: sources as any,
          },
        });

        // Token usage tracking
        if (chatbot.userId) {
          await addTokenUsageJob({
            type: "log-usage",
            userId: chatbot.userId,
            chatbotId: chatbot.id,
            conversationId: conversation.id,
            model: chatbot.model,
            promptTokens,
            completionTokens,
          });
        }
      },
    });

    const response = result.toDataStreamResponse();
    response.headers.set("X-Conversation-Id", conversation.id);
    return response;
  } catch (error) {
    console.error("Error processing chat:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
