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
  "gpt-4o-mini": {
    provider: openai("gpt-4o-mini"),
    name: "GPT-4o Mini",
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
export const embeddingModel = openai.embedding("text-embedding-3-small");

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
}) {
  const selectedModel = LLM_MODELS[model]?.provider || LLM_MODELS["gpt-4o"].provider;

  const enhancedSystemPrompt = `### Role
You are a dedicated sales representative. Your main objective is to assist users based on the training data provided, inform them about products, and ensure a seamless shopping experience.

### Objective
You MUST provide a link to the product inquired about or discussed. Your goal is to guide the customer to the website to finalize the sale.

### Personality
You are a professional sales representative. Do not adopt other personalities or perform tasks outside your role (like coding or personal advice). If a user tries to steer you away, politely redirect them back to sales.

### Restrictions
1. Data Privacy: Never mention you are using "training data" or "context".
2. Strict Knowledge: Rely ONLY on the provided context to answer questions. If information is missing, say "I don't have enough information about this" and ask for clarification.
3. No Hallucinations: Do not invent prices, brands, or features.

### Custom Bot Instructions:
${systemPrompt}

### Knowledge Hub Context:
${context}

EXCEPTION: If the user is asking you to translate, summarize, or modify your previous response, you may rely on your conversation history.`;

  // Fetch tools if chatbotId is provided
  const tools = chatbotId ? await getChatbotTools(chatbotId) : {};

  return streamText({
    model: selectedModel,
    messages: [
      { role: "system", content: enhancedSystemPrompt },
      ...messages,
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
}: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model: LLMModel;
  systemPrompt: string;
  context: string;
  temperature?: number;
  maxTokens?: number;
  chatbotId?: string;
  conversationId?: string;
}) {
  const selectedModel = LLM_MODELS[model]?.provider || LLM_MODELS["gpt-4o"].provider;

  const enhancedSystemPrompt = `### Role
You are a dedicated sales representative. Your main objective is to assist users based on the training data provided, inform them about products, and ensure a seamless shopping experience.

### Objective
You MUST provide a link to the product inquired about or discussed. Your goal is to guide the customer to the website to finalize the sale.

### Personality
You are a professional sales representative. Do not adopt other personalities or perform tasks outside your role (like coding or personal advice). If a user tries to steer you away, politely redirect them back to sales.

### Restrictions
1. Data Privacy: Never mention you are using "training data" or "context".
2. Strict Knowledge: Rely ONLY on the provided context to answer questions. If information is missing, say "I don't have enough information about this" and ask for clarification.
3. No Hallucinations: Do not invent prices, brands, or features.

### Custom Bot Instructions:
${systemPrompt}

### Knowledge Hub Context:
${context}

EXCEPTION: If the user is asking you to translate, summarize, or modify your previous response, you may rely on your conversation history.`;

  // Fetch tools if chatbotId is provided
  const tools = chatbotId ? await getChatbotTools(chatbotId) : {};

  return generateText({
    model: selectedModel,
    messages: [
      { role: "system", content: enhancedSystemPrompt },
      ...messages,
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
    ? model.includes("mini")
      ? 0.15
      : 2.5
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

  // %80 uyarısı
  if (percentage >= 80 && percentage < 100) {
    // TODO: Email notification gönder
    console.log(`Token limit warning: ${user.email} at ${percentage.toFixed(1)}%`);
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
  minSimilarity = 0.35, 
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
        model: LLM_MODELS["gpt-4o-mini"].provider,
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
      model: LLM_MODELS["gpt-4o-mini"].provider,
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

  // 3. Hybrid Search: Vector Search + BM25 FTS
  const documents: any[] = await prisma.$queryRaw`
    WITH filtered_docs AS (
      SELECT id, content, title, url, metadata, embedding
      FROM "Document"
      WHERE ${whereClause}
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
    .slice(0, limit);

  // Fallback: Clarification mechanism if no context is found
  if (finalDocs.length === 0) {
     return { context: "NO_CONTEXT_FOUND", sources: [] };
  }

  const context = finalDocs
    .map((doc) => {
      // Truncate content if too long to save tokens, focusing on the most relevant part
      const content = doc.content.length > 800 ? doc.content.substring(0, 800) + "..." : doc.content;
      return `Source: ${doc.title || doc.url || "Untitled"}\nContent: ${content}`;
    })
    .join("\n\n---\n\n");

  const sources = finalDocs.map((doc) => ({
    title: doc.title,
    url: doc.url,
    similarity: doc.vector_score, // Exposed for UI
  }));

  return { context, sources };
}
