import { streamText, StreamData } from "ai";
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

    // Önceki mesajları al (son 6)
    const previousMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 6,
    });

    // RAG: İlgili dokümanları ara
    const { context, sources } = await performRAGSearch({
      query: message,
      chatbotId,
      messages: previousMessages.map(m => ({ role: m.role.toLowerCase(), content: m.content })),
      limit: 8,
      minSimilarity: 0.35,
    });

    // Mesajları formatla
    const messages = previousMessages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content,
    }));

    // System prompt oluştur
    const systemPrompt = `### Role
You are a dedicated sales representative for ${chatbot.name}. Your main objective is to assist users based on the training data provided, inform them about products, and ensure a seamless shopping experience.

### Objective
You MUST provide a link to the product inquired about or discussed. Your goal is to guide the customer to the website to finalize the sale.

### Personality
You are a professional sales representative. Do not adopt other personalities or perform tasks outside your role (like coding or personal advice). If a user tries to steer you away, politely redirect them back to sales.

### Restrictions
1. Data Privacy: Never mention you are using "training data" or "context".
2. Strict Knowledge: Rely ONLY on the provided context to answer questions. If information is missing, say "I don't have enough information about this" and ask for clarification.
3. No Hallucinations: Do not invent prices, brands, or features.

### Custom Bot Instructions:
${chatbot.systemPrompt}

### Knowledge Hub Context:
${context}

EXCEPTION: If the user is asking you to translate, summarize, or modify your previous response, you may rely on your conversation history.`;

    // LLM modelini seç
    const selectedModel = LLM_MODELS[model as keyof typeof LLM_MODELS]?.provider || LLM_MODELS["gpt-4o"].provider;

    // StreamData for annotations
    const data = new StreamData();

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

        // Append to frontend
        data.appendMessageAnnotation({
          promptTokens,
          completionTokens,
        });
        await data.close();

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

    return result.toDataStreamResponse({ data });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process message" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
