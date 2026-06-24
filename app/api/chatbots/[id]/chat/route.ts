import { NextRequest, NextResponse } from "next/server";
import { StreamData } from "ai";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { performRAGSearch, streamRAGResponse, logTokenUsage, LLMModel } from "@/lib/ai";

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

    const { messages: rawMessages, attachments } = await req.json();
    
    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    // Cost Optimization: Only send last 6 messages for context
    const messages = rawMessages.slice(-6);
    const lastMessage = messages[messages.length - 1];
    const message = lastMessage.content;

    let queryText = message;
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.type === "share" && att.data) {
          queryText += `\n[Paylaşılan Gönderi Linki: ${att.data}]`;
        }
      }
      lastMessage.content = queryText;
    }

    // 1. Get Chatbot & User
    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        dataSources: {
          where: { status: "COMPLETED" },
        },
      },
    });

    if (!chatbot || (chatbot.userId !== user?.id)) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // 2. Perform RAG Search
    const { context } = await performRAGSearch({
      chatbotId,
      query: queryText,
      messages: messages, // Pass conversation history for better context
      limit: 8,
      minSimilarity: 0.35,
    });

    // 3. Stream Response & Log Usage
    const data = new StreamData();
    
    const response = await streamRAGResponse({
      messages: messages,
      model: (chatbot.model as LLMModel) || "gpt-4o",
      systemPrompt: chatbot.systemPrompt,
      context: context || "No specific context found.",
      chatbotId,
      attachments,
      onFinish: async ({ text, usage }) => {
        // Log Token Usage for display
        data.appendMessageAnnotation({
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        });
        await data.close();

        // Log Token Usage in DB
        await logTokenUsage({
          userId: chatbot.userId,
          chatbotId: chatbot.id,
          model: (chatbot.model as LLMModel) || "gpt-4o",
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        });
      }
    });

    return response.toDataStreamResponse({ data });
  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}
