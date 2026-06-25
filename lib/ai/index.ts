import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, generateText, embed, embedMany, ToolSet, generateObject } from "ai";
import { z } from "zod";
import { getChatbotTools } from "./tools";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// LLM Model yapılandırması
export const LLM_MODELS = {
  "gpt-4o": {
    provider: openai("gpt-4o"),
    name: "GPT-4o",
    tokenMultiplier: 5,
    maxTokens: 4096,
  },
  "gpt-4.1-nano": {
    provider: openai("gpt-4o-mini"),
    name: "gpt-4.1-nano",
    tokenMultiplier: 1,
    maxTokens: 4096,
  },
  "claude-sonnet": {
    provider: anthropic("claude-3-5-sonnet-20241022"),
    name: "Claude 3.5 Sonnet",
    tokenMultiplier: 4,
    maxTokens: 4096,
  },
  "claude-haiku": {
    provider: anthropic("claude-3-haiku-20240307"),
    name: "Claude 3 Haiku",
    tokenMultiplier: 1,
    maxTokens: 4096,
  },
} as const;

export type LLMModel = keyof typeof LLM_MODELS;

// Embedding modeli (Phase 2 Upgrade reverted to match existing vectors)
export const embeddingModel = openai.embedding("text-embedding-3-large");

// Text embedding oluştur
export async function createEmbedding(text: string) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

// Batch text embedding oluştur
export async function createEmbeddings(texts: string[]) {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });
  return embeddings;
}

// Streaming chat yanıtı
export async function streamChatResponse({
  messages,
  model,
  systemPrompt,
  temperature = 0.7,
  maxTokens = 1000,
}: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model: LLMModel;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const selectedModel = LLM_MODELS[model]?.provider || LLM_MODELS["gpt-4o"].provider;

  return streamText({
    model: selectedModel,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    temperature,
    maxTokens,
  });
}

// RAG ile chat yanıtı (context ile)
export async function streamRAGResponse({
  messages,
  model,
  systemPrompt,
  context,
  temperature = 0.7,
  maxTokens = 1000,
  onFinish,
  chatbotId,
  conversationId,
  data,
  attachments = [],
}: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model: LLMModel;
  systemPrompt: string;
  context: string;
  temperature?: number;
  maxTokens?: number;
  onFinish?: (completion: { text: string; usage: any }) => Promise<void> | void;
  chatbotId?: string;
  conversationId?: string;
  data?: any; // StreamData instance
  attachments?: Array<{ type: string; data: string; mimeType?: string }>;
}) {
  const selectedModel = LLM_MODELS[model]?.provider || LLM_MODELS["gpt-4o"].provider;

  const enhancedSystemPrompt = `### Role
You are a dedicated sales representative. Your main objective is to assist users based on the training data provided, inform them about products, and ensure a seamless shopping experience.

### Objective
You MUST provide a link to the product inquired about or discussed. Your goal is to guide the customer to the website to finalize the sale.

### Personality
You are a professional sales representative. Do not adopt other personalities or perform tasks outside your role (like coding or personal advice). If a user tries to steer you away, politely redirect them back to sales.

### Pricing and Tax Guidelines (VAT / KDV)
1. Always prioritize product pricing and details retrieved in real-time using your Shopify search tools, as they represent the most accurate, live storefront values.
2. Note that all product prices for Turkish customers (or in TRY currency) on the website include KDV (Value Added Tax).
3. If you must fall back to the "Knowledge Hub Context" because tools are unavailable, be aware that pricing in the context might represent tax-exclusive base prices or regional exports (e.g. showing 3,897.00 TL instead of 4,598.46 TL). If you notice a tax-excluded price in the context (like 3,897.00 TL for FINACHI Trenchcoat), clarify that the live website price is 4,598.46 TL (tax included). Do not display tax-exclusive or export prices as the final price to Turkish customers.

### Visual Search & Product Matching Guidelines (MANDATORY FOR IMAGES)
If the user provides an image or photo:
1. Carefully analyze the visual characteristics of the item in the image (such as type of clothing, color, cut, pattern, buttons, fabric, or visible brand logos).
2. You MUST search for this product using your search tools (like search_shopify_products or search_woocommerce_products) by entering the visual keywords/attributes you identified.
3. NEVER guess or invent product details, pricing, or links.
4. If you cannot find a clear product match in your search tool results, or if you are not 100% confident in the match, you must politely respond: "Gönderdiğiniz görseldeki ürünü tam olarak eşleştiremedim. Ürünün adını veya kodunu yazabilir misiniz size hemen yardımcı olayım."

### Restrictions
1. Data Privacy: Never mention you are using "training data" or "context".
2. Strict Knowledge: Rely ONLY on the provided context and YOUR TOOLS to answer questions. If information is missing and no relevant tool is available, say "I don't have enough information about this" and ask for clarification.
3. Use Tools: If a user asks about their order status, products, or booking an appointment, you MUST check if a relevant tool (like shopify or calendar) is available and use it. Do not give generic advice if a tool can provide the real answer.
4. No Hallucinations: NEVER invent, guess, or extrapolate prices, SKUs, product codes, brand names, stock levels, or any factual claim. If the information is not explicitly present in the Knowledge Hub Context or returned by a tool, you MUST decline and ask the user for more details.


### Hallucination Guard (CRITICAL — READ CAREFULLY)
PRICE / SKU / BRAND rules — ZERO tolerance for fabrication:
- If a price is NOT in the context: respond "Bu ürünün fiyatı hakkında bilgim bulunmuyor. Lütfen ürün adını veya kodunu belirterek tekrar sorun."
- If a SKU / product code is NOT in the context: respond "Bu ürün kodunu sistemimde bulamadım. Lütfen kodu doğrulayıp tekrar deneyin."
- If a brand is NOT in the context: respond "Bu markaya ait ürün bilgisi bulunamadı. Farklı bir marka veya ürün adı dener misiniz?"
- NEVER say a product "costs X TL", "is priced at X", or give ANY numeric price unless that exact price appears verbatim in the context.
- NEVER confirm stock availability, discount, or promotion unless explicitly stated in context.
- NEVER speculate about future prices, upcoming sales, or competitor pricing.

Few-shot refusal examples (follow these exactly when context lacks the answer):

User: "XYZ-99999 ürününün fiyatı nedir?"
CORRECT: "XYZ-99999 kodlu ürünü sistemimde bulamadım. Lütfen ürün adını veya doğru kodu paylaşır mısınız?"
WRONG: "XYZ-99999 ürünü 299 TL'dir." ← NEVER do this

User: "Bu hafta indirim var mı?"
CORRECT: "Güncel kampanya bilgisine şu an erişimim yok. Güncel indirimler için lütfen web sitemizi ziyaret edin veya müşteri hizmetlerimizle iletişime geçin."
WRONG: "Evet, bu hafta %20 indirim var!" ← NEVER do this

User: "ACME marka ürünler kaç lira?"
CORRECT: "ACME markasına ait ürün bilgisi elimde bulunmuyor. Başka bir marka ya da ürün adıyla aramayı dener misiniz?"
WRONG: "ACME ürünleri 150-500 TL arasında değişmektedir." ← NEVER do this

User: "Rakibiniz daha ucuz mu?"
CORRECT: "Rakip fiyatları hakkında bilgi sahibi değilim ve karşılaştırma yapamam. Size en iyi hizmeti sunmak için buradayım."
WRONG: "Evet, rakiplerimizden daha uygunuz." ← NEVER do this

### Lead Generation & CRM (MANDATORY IF ENABLED)
If the user shows interest or asks to be contacted:
1. Use 'save_contact_info' to store their name, email, and phone.
2. If they want to meet or book a time, use 'schedule_appointment'. You can also mention the cost if specified in context.
3. Inform the user that an automated email reminder will be sent 24 hours before the appointment.
4. Always confirm with the user that their information has been saved or their appointment has been booked.

### Custom Bot Instructions:
${systemPrompt}

### Knowledge Hub Context:
${context}

EXCEPTION: If the user is asking you to translate, summarize, or modify your previous response, you may rely on your conversation history.`;

  // Fetch tools if chatbotId is provided
  const tools = chatbotId ? await getChatbotTools(chatbotId, conversationId) : {};

  // Find the last user message and convert it to multimodal content parts if there are image attachments
  const formattedMessages = [...messages];
  const lastUserMsgIndex = [...formattedMessages].reverse().findIndex(m => m.role === 'user');
  const imageAttachments = attachments.filter(a => a.type === "image");

  if (imageAttachments.length > 0 && lastUserMsgIndex !== -1) {
    const actualIndex = formattedMessages.length - 1 - lastUserMsgIndex;
    const originalMsg = formattedMessages[actualIndex];

    const contentParts: any[] = [
      { type: "text", text: originalMsg.content || "Bu görsel hakkında bilgi alabilir miyim?" }
    ];

    for (const img of imageAttachments) {
      if (img.data) {
        contentParts.push({
          type: "image",
          image: Buffer.from(img.data, "base64"),
          mimeType: img.mimeType || "image/jpeg"
        });
      }
    }

    formattedMessages[actualIndex] = {
      ...originalMsg,
      content: contentParts as any
    };
  }

  return streamText({
    model: selectedModel,
    messages: [
      { role: "system", content: enhancedSystemPrompt },
      ...formattedMessages,
    ],
    temperature,
    maxTokens,
    tools,
    maxSteps: 5, // Allow tool-calling logic
    onFinish,
  });
}

// RAG ile chat yanıtı (non-streaming, direct generation)
export async function generateRAGResponse({
  messages,
  model,
  systemPrompt,
  context,
  temperature = 0.7,
  maxTokens = 1000,
  chatbotId,
  data,
  conversationId,
  attachments = [],
}: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model: LLMModel;
  systemPrompt: string;
  context: string;
  temperature?: number;
  maxTokens?: number;
  chatbotId?: string;
  conversationId?: string;
  data?: any;
  attachments?: Array<{ type: string; data: string; mimeType?: string }>;
}) {
  const selectedModel = LLM_MODELS[model]?.provider || LLM_MODELS["gpt-4o"].provider;

  const enhancedSystemPrompt = `### Role
You are a dedicated sales representative. Your main objective is to assist users based on the training data provided, inform them about products, and ensure a seamless shopping experience.

### Objective
You MUST provide a link to the product inquired about or discussed. Your goal is to guide the customer to the website to finalize the sale.

### Personality
You are a professional sales representative. Do not adopt other personalities or perform tasks outside your role (like coding or personal advice). If a user tries to steer you away, politely redirect them back to sales.

### Pricing and Tax Guidelines (VAT / KDV)
1. Always prioritize product pricing and details retrieved in real-time using your Shopify search tools, as they represent the most accurate, live storefront values.
2. Note that all product prices for Turkish customers (or in TRY currency) on the website include KDV (Value Added Tax).
3. If you must fall back to the "Knowledge Hub Context" because tools are unavailable, be aware that pricing in the context might represent tax-exclusive base prices or regional exports (e.g. showing 3,897.00 TL instead of 4,598.46 TL). If you notice a tax-excluded price in the context (like 3,897.00 TL for FINACHI Trenchcoat), clarify that the live website price is 4,598.46 TL (tax included). Do not display tax-exclusive or export prices as the final price to Turkish customers.

### Visual Search & Product Matching Guidelines (MANDATORY FOR IMAGES)
If the user provides an image or photo:
1. Carefully analyze the visual characteristics of the item in the image (such as type of clothing, color, cut, pattern, buttons, fabric, or visible brand logos).
2. You MUST search for this product using your search tools (like search_shopify_products or search_woocommerce_products) by entering the visual keywords/attributes you identified.
3. NEVER guess or invent product details, pricing, or links.
4. If you cannot find a clear product match in your search tool results, or if you are not 100% confident in the match, you must politely respond: "Gönderdiğiniz görseldeki ürünü tam olarak eşleştiremedim. Ürünün adını veya kodunu yazabilir misiniz size hemen yardımcı olayım."

### Restrictions
1. Data Privacy: Never mention you are using "training data" or "context".
2. Strict Knowledge: Rely ONLY on the provided context and YOUR TOOLS to answer questions. If information is missing and no relevant tool is available, say "I don't have enough information about this" and ask for clarification.
3. Use Tools: If a user asks about their order status, products, or booking an appointment, you MUST check if a relevant tool (like shopify or calendar) is available and use it. Do not give generic advice if a tool can provide the real answer.
4. No Hallucinations: NEVER invent, guess, or extrapolate prices, SKUs, product codes, brand names, stock levels, or any factual claim. If the information is not explicitly present in the Knowledge Hub Context or returned by a tool, you MUST decline and ask the user for more details.

5. Brand/SKU/Price Policy: See "### Hallucination Guard" section above for zero-tolerance fabrication rules.

### Hallucination Guard (CRITICAL — READ CAREFULLY)
PRICE / SKU / BRAND rules — ZERO tolerance for fabrication:
- If a price is NOT in the context: respond "Bu ürünün fiyatı hakkında bilgim bulunmuyor. Lütfen ürün adını veya kodunu belirterek tekrar sorun."
- If a SKU / product code is NOT in the context: respond "Bu ürün kodunu sistemimde bulamadım. Lütfen kodu doğrulayıp tekrar deneyin."
- If a brand is NOT in the context: respond "Bu markaya ait ürün bilgisi bulunamadı. Farklı bir marka veya ürün adı dener misiniz?"
- NEVER say a product "costs X TL", "is priced at X", or give ANY numeric price unless that exact price appears verbatim in the context.
- NEVER confirm stock availability, discount, or promotion unless explicitly stated in context.
- NEVER speculate about future prices, upcoming sales, or competitor pricing.

Few-shot refusal examples (follow these exactly when context lacks the answer):
User: "XYZ-99999 ürününün fiyatı nedir?"
CORRECT: "XYZ-99999 kodlu ürünü sistemimde bulamadım. Lütfen ürün adını veya doğru kodu paylaşır mısınız?"
WRONG: "XYZ-99999 ürünü 299 TL'dir." ← NEVER do this

User: "Bu hafta indirim var mı?"
CORRECT: "Güncel kampanya bilgisine şu an erişimim yok. Güncel indirimler için lütfen web sitemizi ziyaret edin veya müşteri hizmetlerimizle iletişime geçin."
WRONG: "Evet, bu hafta %20 indirim var!" ← NEVER do this

User: "ACME marka ürünler kaç lira?"
CORRECT: "ACME markasına ait ürün bilgisi elimde bulunmuyor. Başka bir marka ya da ürün adıyla aramayı dener misiniz?"
WRONG: "ACME ürünleri 150-500 TL arasında değişmektedir." ← NEVER do this

User: "Rakibiniz daha ucuz mu?"
CORRECT: "Rakip fiyatları hakkında bilgi sahibi değilim ve karşılaştırma yapamam. Size en iyi hizmeti sunmak için buradayım."
WRONG: "Evet, rakiplerimizden daha uygunuz." ← NEVER do this


### Lead Generation & CRM (MANDATORY IF ENABLED)
If the user shows interest or asks to be contacted:
1. Use 'save_contact_info' to store their name, email, and phone.
2. If they want to meet or book a time, use 'schedule_appointment'. You can also mention the cost if specified in context.
3. Inform the user that an automated email reminder will be sent 24 hours before the appointment.
4. Always confirm with the user that their information has been saved or their appointment has been booked.

### Custom Bot Instructions:
${systemPrompt}

### Knowledge Hub Context:
${context}

EXCEPTION: If the user is asking you to translate, summarize, or modify your previous response, you may rely on your conversation history.`;

  // Fetch tools if chatbotId is provided
  const tools = chatbotId ? await getChatbotTools(chatbotId, conversationId) : {};

  // Find the last user message and convert it to multimodal content parts if there are image attachments
  const formattedMessages = [...messages];
  const lastUserMsgIndex = [...formattedMessages].reverse().findIndex(m => m.role === 'user');
  const imageAttachments = attachments.filter(a => a.type === "image");

  if (imageAttachments.length > 0 && lastUserMsgIndex !== -1) {
    const actualIndex = formattedMessages.length - 1 - lastUserMsgIndex;
    const originalMsg = formattedMessages[actualIndex];

    const contentParts: any[] = [
      { type: "text", text: originalMsg.content || "Bu görsel hakkında bilgi alabilir miyim?" }
    ];

    for (const img of imageAttachments) {
      if (img.data) {
        contentParts.push({
          type: "image",
          image: Buffer.from(img.data, "base64"),
          mimeType: img.mimeType || "image/jpeg"
        });
      }
    }

    formattedMessages[actualIndex] = {
      ...originalMsg,
      content: contentParts as any
    };
  }

  return generateText({
    model: selectedModel,
    messages: [
      { role: "system", content: enhancedSystemPrompt },
      ...formattedMessages,
    ],
    temperature,
    maxTokens,
    tools,
    maxSteps: 5,
  });
}

// Token kullanımını kaydet
export async function logTokenUsage({
  userId,
  chatbotId,
  conversationId,
  model,
  promptTokens,
  completionTokens,
}: {
  userId: string;
  chatbotId: string;
  conversationId?: string;
  model: LLMModel;
  promptTokens: number;
  completionTokens: number;
}) {
  const multiplier = LLM_MODELS[model]?.tokenMultiplier || 1;
  const totalTokens = (promptTokens + completionTokens) * multiplier;

  // Token maliyetini hesapla (örnek fiyatlandırma)
  const costPer1K = model.includes("gpt-4o")
    ? 2.5
    : model.includes("nano") || model.includes("mini")
      ? 0.15
      : model.includes("haiku")
        ? 0.25
        : 3.0;

  const cost = (totalTokens / 1000) * costPer1K;

  await prisma.tokenUsage.create({
    data: {
      userId,
      chatbotId,
      conversationId,
      model,
      tokensUsed: totalTokens,
      promptTokens,
      completionTokens,
      cost,
    },
  });

  // Kullanıcının token limitini kontrol et
  await checkTokenLimit(userId);

  return { totalTokens, cost };
}

async function sendTokenLimitWarningEmail(email: string, percentage: number) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  const fromEmail = process.env.EMAIL_FROM || "noreply@jcaesars.com";
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: fromEmail },
      subject: "Token Limitinizin %80'ini Kullandınız",
      content: [{
        type: "text/html",
        value: `<p>Merhaba,</p><p>Bu ay token kullanımınız <strong>${percentage.toFixed(1)}%</strong> seviyesine ulaştı. Limitinize yaklaşıyorsunuz.</p><p>Planınızı yükseltmek için <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings">buraya tıklayın</a>.</p>`
      }],
    }),
  }).catch((err) => console.warn("[TokenWarningEmail] Failed:", err));
}

// Token limit kontrolü
async function checkTokenLimit(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        include: { plan: true },
      },
    },
  });

  if (!user?.organization?.plan) return;

  const plan = user.organization.plan;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usage = await prisma.tokenUsage.aggregate({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
    _sum: { tokensUsed: true },
  });

  const usedTokens = usage._sum.tokensUsed || 0;
  const limit = plan.tokenLimit;
  const percentage = (usedTokens / limit) * 100;

  // %80 uyarısı — her gün sadece bir kez gönder (Redis cache ile)
  if (percentage >= 80 && percentage < 100) {
    const { default: IORedis } = await import("ioredis");
    const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { lazyConnect: true });
    try {
      await redis.connect();
      const warningKey = `token_warning:${userId}:${new Date().toDateString()}`;
      const alreadySent = await redis.exists(warningKey);
      if (!alreadySent) {
        await redis.set(warningKey, "1", "EX", 86400);
        await sendTokenLimitWarningEmail(user.email!, percentage);
      }
    } catch (err) {
      console.warn("[TokenCheck] Redis/email error:", err);
    } finally {
      redis.disconnect();
    }
  }

  // Limit aşımı
  if (usedTokens >= limit) {
    throw new Error("TOKEN_LIMIT_EXCEEDED");
  }
}

// RAG Araştırması (pgvector + Hybrid Search + RRF)
export async function performRAGSearch({
  chatbotId,
  query,
  limit = 8,
  minSimilarity = 0.40,
  messages = [],
}: {
  chatbotId: string;
  query: string;
  limit?: number;
  minSimilarity?: number;
  messages?: any[];
}) {
  let searchTerms = query;

  // 1. Query Contextualization: If query is short or ambiguous, use conversation history to refine it
  if (messages.length > 0 && query.length < 20) {
    try {
      const lastMessages = messages.slice(-3);
      const conversationContext = lastMessages.map(m => `${m.role}: ${m.content}`).join("\n");
      
      const { text } = await generateText({
        model: LLM_MODELS["gpt-4.1-nano"].provider,
        prompt: `Based on the following conversation history and the current user query, rewrite the query into a better search term for a product database. 
        Focus on identifying the specific product or category the user is likely referring to.
        
        Conversation History:
        ${conversationContext}
        
        Current User Query: "${query}"
        
        Optimized Search Term (Only provide the term, nothing else):`,
      });
      
      if (text && text.length > 2) {
        console.log(`[RAG Search] Query refined: "${query}" -> "${text.trim()}"`);
        searchTerms = text.trim();
      }
    } catch (e) {
      console.warn(`[RAG Search] Query refinement failed`, e);
    }
  }

  // 2. Query Intent Extraction (Pre-filtering prep)
  let intentData: { isProductSearch: boolean; brand: string | null } = { isProductSearch: false, brand: null };
  try {
    const { object } = await generateObject({
      model: LLM_MODELS["gpt-4.1-nano"].provider,
      schema: z.object({
        isProductSearch: z.boolean(),
        brand: z.string().nullable().optional(),
        intent: z.string(),
      }),
      prompt: `Analyze the user query: "${searchTerms}". Determine if it's a product search, and extract any specific brand if mentioned.`,
    });
    intentData = { isProductSearch: object.isProductSearch, brand: object.brand || null };
    console.log(`[RAG Search] Intent extracted:`, intentData);

    // Cost Optimization: Skip heavy retrieval for clearly non-product/social queries
    const socialPatterns = /^(merhaba|selam|nasılsın|kimsin|adım|ismin|neler yapabilirsin|help|yardım)/i;
    if (!intentData.isProductSearch && socialPatterns.test(query)) {
      console.log(`[RAG Search] Social/General query detected, skipping heavy retrieval to save tokens.`);
      return { context: "", sources: [] };
    }
  } catch (e) {
    console.warn(`[RAG Search] Intent extraction failed`);
  }

  // 3. Vector Embedding
  const embedding = await createEmbedding(searchTerms);
  const vectorString = `[${embedding.join(",")}]`;

  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: {
      dataSources: { where: { status: "COMPLETED" } },
      knowledgeSources: { where: { status: "COMPLETED" } },
    },
  });

  if (!chatbot || (chatbot.dataSources.length === 0 && chatbot.knowledgeSources.length === 0)) {
    return { context: "", sources: [] };
  }

  const dataSourceIds = chatbot.dataSources.map((ds) => ds.id);
  const knowledgeSourceIds = chatbot.knowledgeSources.map((ks) => ks.id);

  const whereConditions = [];
  if (dataSourceIds.length > 0) {
    whereConditions.push(Prisma.sql`"dataSourceId" IN (${Prisma.join(dataSourceIds)})`);
  }
  if (knowledgeSourceIds.length > 0) {
    whereConditions.push(Prisma.sql`"knowledgeSourceId" IN (${Prisma.join(knowledgeSourceIds)})`);
  }

  if (whereConditions.length === 0) {
    return { context: "", sources: [] };
  }

  const whereClause = Prisma.join(whereConditions, ' OR ');

  // Brand metadata pre-filter: narrows results to exact brand when query mentions one
  const brandFilter = intentData.brand
    ? Prisma.sql` AND metadata->>'brand' ILIKE ${'%' + intentData.brand + '%'}`
    : Prisma.sql``;

  // 3. Hybrid Search: Vector Search + BM25 FTS
  const documents: any[] = await prisma.$queryRaw`
    WITH filtered_docs AS (
      SELECT id, content, title, url, metadata, embedding
      FROM "Document"
        WHERE (${whereClause})${brandFilter}
    )
    SELECT 
      d.id, d.content, d.title, d.url, d.metadata,
      1 - (d.embedding <=> ${vectorString}::vector) as vector_score,
      ts_rank_cd(to_tsvector('turkish', d.content), plainto_tsquery('turkish', ${searchTerms})) as fts_score
    FROM filtered_docs d
  `;

  // 4. Reciprocal Rank Fusion (RRF)
  const RRF_K = 60;
  
  const vectorRanked = [...documents].sort((a, b) => b.vector_score - a.vector_score);
  const ftsRanked = [...documents].sort((a, b) => b.fts_score - a.fts_score);
  
  const rrfScores = new Map<string, any>();
  
  vectorRanked.forEach((doc, rank) => {
    rrfScores.set(doc.id, { ...doc, rrf_score: 1 / (RRF_K + rank + 1) });
  });
  
  ftsRanked.forEach((doc, rank) => {
    const existing = rrfScores.get(doc.id);
    if (existing) {
      existing.rrf_score += 1 / (RRF_K + rank + 1);
    }
  });

  // 5. Confidence Threshold & Sorting
  const finalDocs = Array.from(rrfScores.values())
    .filter(doc => doc.vector_score >= minSimilarity)
    .sort((a, b) => b.rrf_score - a.rrf_score)
    .slice(0, 20); // Top 20 candidates for re-ranking

  // Fallback: Clarification mechanism if no context is found
  if (finalDocs.length === 0) {
    return { context: "NO_CONTEXT_FOUND", sources: [], lowConfidence: true };
  }

  // 6. Re-ranking layer (Cohere rerank-multilingual-v3.0)
  let rerankedDocs = finalDocs;
  if (process.env.COHERE_API_KEY && finalDocs.length > 0) {
    try {
      const response = await fetch("https://api.cohere.ai/v1/rerank", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "rerank-multilingual-v3.0",
          query: searchTerms,
          documents: finalDocs.map(d => d.content),
          top_n: limit,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Map reranked indices back to original docs
        rerankedDocs = data.results.map((r: any) => finalDocs[r.index]);
        console.log(`[RAG Search] Cohere rerank: ${finalDocs.length} → ${rerankedDocs.length}`);
      } else {
        console.warn(`[RAG Search] Cohere rerank failed (${response.status}), falling back to RRF order`);
        rerankedDocs = finalDocs.slice(0, limit);
      }
    } catch (err) {
      console.warn(`[RAG Search] Cohere rerank error:`, err);
      rerankedDocs = finalDocs.slice(0, limit); // Fallback to RRF
    }
  } else {
    // No COHERE_API_KEY: fallback to RRF top-N
    rerankedDocs = finalDocs.slice(0, limit);
  }

  const context = rerankedDocs
    .map((doc) => {
      // Truncate content if too long to save tokens, focusing on the most relevant part
      const content = doc.content.length > 800 ? doc.content.substring(0, 800) + "..." : doc.content;
      return `Source: ${doc.title || doc.url || "Untitled"}\nContent: ${content}`;
    })
    .join("\n\n---\n\n");

  const sources = rerankedDocs.map((doc) => ({
    title: doc.title,
    url: doc.url,
    similarity: doc.vector_score, // Exposed for UI
  }));

  const lowConfidence = rerankedDocs.length < 3 || (rerankedDocs[0]?.vector_score ?? 0) < 0.50;

  return { context, sources, lowConfidence };
}

/**
 * Analyzes the overall sentiment of a conversation
 * Categories: POSITIVE, NEUTRAL, NEGATIVE, FRUSTRATED
 */
export async function analyzeConversationSentiment(conversationId: string) {
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 20, // Analyze the context of the last 20 messages
    });

    if (messages.length < 2) return null;

    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const { text } = await generateText({
      model: LLM_MODELS["gpt-4.1-nano"].provider,
      prompt: `Analyze the sentiment of the following conversation between a user and an AI assistant. 
      Categorize it as one of the following: POSITIVE, NEUTRAL, NEGATIVE, or FRUSTRATED.
      Only return the category name in uppercase.

      Conversation:
      ${conversationText}
      
      Sentiment:`,
    });

    const sentiment = text.trim().toUpperCase();
    const validSentiments = ["POSITIVE", "NEUTRAL", "NEGATIVE", "FRUSTRATED"];
    
    if (validSentiments.includes(sentiment)) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { sentiment }
      });
      return sentiment;
    }
  } catch (error) {
    console.error("[AI] Sentiment analysis failed:", error);
  }
  return null;
}

/**
 * Checks if the AI response indicates missing knowledge and notifies the user
 */
export async function checkAndNotifyMissingKnowledge({
  conversationId,
  chatbotId,
  aiResponse,
}: {
  conversationId: string;
  chatbotId: string;
  aiResponse: string;
}) {
  try {
    // Patterns that suggest the AI doesn't know the answer
    const missingKnowledgePatterns = [
      "don't have enough information",
      "not mentioned in the provided context",
      "bilgim yok",
      "verilen metinde bulunmamaktadır",
      "üzgünüm, bu konuda bilgim yok",
      "yeterli bilgiye sahip değilim",
      "I don't know",
      "I'm sorry, I cannot find"
    ];

    const isMissingKnowledge = missingKnowledgePatterns.some(pattern => 
      aiResponse.toLowerCase().includes(pattern.toLowerCase())
    );

    if (isMissingKnowledge) {
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
        select: { userId: true, name: true }
      });

      if (chatbot) {
        // Create a notification for the user
        await prisma.notification.create({
          data: {
            userId: chatbot.userId,
            title: "Smart Suggestion: Missing Knowledge",
            message: `Your chatbot "${chatbot.name}" was unable to answer a question. Add more data to its knowledge base to improve accuracy.`,
            type: "SUGGESTION",
            link: `/dashboard/chatbots/${chatbotId}/knowledge`
          }
        });
        
        console.log(`[SmartSuggestion] Notification created for chatbot ${chatbotId}`);
      }
    }
  } catch (error) {
    console.error("[SmartSuggestion] Failed to check/notify:", error);
  }
}
