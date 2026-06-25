import { streamText, StreamData } from "ai";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { LLM_MODELS, performRAGSearch, streamRAGResponse, analyzeConversationSentiment, checkAndNotifyMissingKnowledge } from "@/lib/ai";
import { addTokenUsageJob } from "@/lib/queue";
import { checkPlanLimits } from "@/lib/plan-guard";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { message, chatbotId, conversationId, model = "gpt-4o" } = await req.json();

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new Response("User not found in database", { status: 404 });
    }

    // Chatbot'u kontrol et ve yetkiyi doğrula (BOLA Yaması)
    const chatbot = await prisma.chatbot.findFirst({
      where: { 
        id: chatbotId,
        OR: [
          { userId: user.id },
          ...(user.organizationId ? [{ organizationId: user.organizationId }] : [])
        ]
      },
    });

    if (!chatbot || chatbot.status !== "ACTIVE") {
      return new Response("Chatbot not found or inactive", { status: 404 });
    }

    // Check Plan Limits
    const { allowed, reason, limit } = await checkPlanLimits(chatbotId);
    if (!allowed) {
      return new Response(JSON.stringify({ 
        error: "MESSAGE_LIMIT_REACHED", 
        upgradeUrl: "/pricing"
      }), { status: 403, headers: { "Content-Type": "application/json" } });
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
  const { context, sources, lowConfidence } = await performRAGSearch({
      query: message,
      chatbotId,
      messages: previousMessages.map(m => ({ role: m.role.toLowerCase(), content: m.content })),
      limit: 8,
    // minSimilarity: default 0.40 from performRAGSearch
    });

    // Mesajları formatla
    const messages = previousMessages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content,
    }));

    // StreamData for annotations
    const data = new StreamData();

    // Stream yanıtı
  // Low-confidence clarification: prompt user to be more specific
  let effectiveContext = context || "No specific context found.";
  if (lowConfidence || context === "NO_CONTEXT_FOUND") {
    effectiveContext = `NOT_ENOUGH_CONTEXT
Kullanıcı sorusu: "${message}"
Sonuç: Yeterli bilgi bulunamadı veya sonuçlar belirsiz.
Yanıt: Kullanıcıdan daha spesifik bilgi iste (ürün adı, marka, kategori, yaş grubu gibi).`;
  }

    const result = await streamRAGResponse({
      messages: messages,
      model: model as any,
      systemPrompt: chatbot.systemPrompt,
    context: effectiveContext,
      chatbotId,
      conversationId: conversation.id,
      temperature: chatbot.temperature,
      maxTokens: chatbot.maxTokens,
      data,
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

        // Trigger Sentiment Analysis (Async background)
        analyzeConversationSentiment(conversation.id).catch(e => console.error("[Sentiment] Background error:", e));

        // Trigger Missing Knowledge Check (Async background)
        checkAndNotifyMissingKnowledge({
          conversationId: conversation.id,
          chatbotId,
          aiResponse: completion.text
        }).catch(e => console.error("[SmartSuggestion] Background error:", e));
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
