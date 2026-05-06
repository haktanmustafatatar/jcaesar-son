import { streamText } from "ai";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { LLM_MODELS, performRAGSearch } from "@/lib/ai";
import { addTokenUsageJob } from "@/lib/queue";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { message, chatbotId, conversationId, model = "gpt-4o" } = await req.json();

    // Chatbot'u kontrol et
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });

    if (!chatbot || chatbot.status !== "ACTIVE") {
      return new Response("Chatbot not found or inactive", { status: 404 });
    }

    // Konuşmayı bul veya oluştur
    let conversation = conversationId
      ? await prisma.conversation.findUnique({
          where: { id: conversationId },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          chatbotId,
          userId,
          channel: "widget",
        },
      });
    }

    // Kullanıcı mesajını kaydet
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
      query: message,
      chatbotId,
      limit: 5,
    });

    // Mesajları formatla
    const messages = previousMessages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content,
    }));

    // System prompt oluştur
    const systemPrompt = `${chatbot.systemPrompt}

You are an AI assistant for ${chatbot.name}.

Use the following context to answer the user's question. If the context doesn't contain relevant information, answer based on your general knowledge but be honest about it.

Context from knowledge base:
${context}

Instructions:
- Be helpful, concise, and professional
- If you don't know something, say so
- Always cite your sources when using the context`;

    // LLM modelini seç
    const selectedModel = LLM_MODELS[model as keyof typeof LLM_MODELS]?.provider || LLM_MODELS["gpt-4o"].provider;

    // Stream yanıtı
    const result = streamText({
      model: selectedModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
        { role: "user", content: message },
      ],
      temperature: chatbot.temperature,
      maxTokens: chatbot.maxTokens,
      onFinish: async (completion) => {
        // Token kullanımını logla
        const promptTokens = completion.usage?.promptTokens || 0;
        const completionTokens = completion.usage?.completionTokens || 0;

        // Asistan mesajını kaydet
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "ASSISTANT",
            content: completion.text,
            model,
            promptTokens,
            completionTokens,
            sources: sources.map((d) => ({
              title: d.title,
              url: d.url,
              similarity: d.similarity,
            })),
          },
        });

        // Token kullanımını queue'ya ekle
        await addTokenUsageJob({
          type: "log-usage",
          userId,
          chatbotId,
          conversationId: conversation.id,
          model,
          promptTokens,
          completionTokens,
        });
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process message" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
