import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis";

// Shared BullMQ connection for all queues
const redisConnection = createBullMQConnection();

redisConnection.on("error", (err) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[Redis/Queue] Connection error:", err.message);
  }
});

// Queue tanımları
export const queues = {
  crawl: new Queue("crawl", { connection: redisConnection }),
  embedding: new Queue("embedding", { connection: redisConnection }),
  notification: new Queue("notification", { connection: redisConnection }),
  channel: new Queue("channel", { connection: redisConnection }),
  tokenUsage: new Queue("token-usage", { connection: redisConnection }),
};

// Job tipleri
export type CrawlJob = {
  type: "crawl-website" | "crawl-page" | "process-document";
  url?: string;
  fileUrl?: string;
  fileType?: string;
  maxDepth?: number;
  limit?: number;
  chatbotId: string;
  dataSourceId?: string;
  knowledgeSourceId?: string;
  userId: string;
  urls?: string[];
  content?: string;
};

export type EmbeddingJob = {
  type: "create-embedding";
  documentId: string;
  content: string;
};

export type NotificationJob = {
  type: "email" | "webhook" | "push";
  to: string;
  subject?: string;
  body: string;
  template?: string;
  data?: Record<string, any>;
};

export type ChannelJob = {
  type: "send-message";
  channel: "whatsapp" | "instagram" | "facebook" | "slack" | "telegram" | "email";
  recipientId: string;
  message: string;
  chatbotId: string;
  conversationId: string;
};

export type TokenUsageJob = {
  type: "log-usage";
  userId: string;
  chatbotId: string;
  conversationId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
};

// ─── Tenant Fairness Helpers ─────────────────────────────────────────────────

/**
 * Per-tenant rate limiter using Redis.
 * Returns true if the action is allowed, false if the tenant is over limit.
 * Key format: `tenant_rl:{scope}:{id}` with a sliding 60s window.
 */
async function isTenantAllowed(scope: string, id: string, limitPerMinute = 30): Promise<boolean> {
  try {
    const { redis } = await import("@/lib/redis");
    const key = `tenant_rl:${scope}:${id}`;
    const now = Date.now();
    const windowMs = 60_000;

    // Sorted set: member = timestamp, score = timestamp
    const pipe = redis.pipeline();
    pipe.zremrangebyscore(key, 0, now - windowMs);   // remove old entries
    pipe.zadd(key, now, `${now}-${Math.random()}`);   // add current
    pipe.zcard(key);                                   // count in window
    pipe.expire(key, 120);                             // auto-expire
    const results = await pipe.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;
    return count <= limitPerMinute;
  } catch {
    return true; // fail open
  }
}

// ─── Job Ekleme Fonksiyonları ─────────────────────────────────────────────────

export async function addCrawlJob(data: CrawlJob) {
  // Per-user fairness: max 5 crawl jobs per minute per user
  const allowed = await isTenantAllowed("crawl", data.userId, 5);
  if (!allowed) {
    console.warn(`[Queue] Tenant rate limit hit for user ${data.userId} on crawl queue`);
    throw new Error("TENANT_RATE_LIMIT: Too many crawl jobs. Please wait before submitting more.");
  }

  return queues.crawl.add(`crawl-${data.type}`, data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: 500,
    removeOnFail: 200,
    priority: 1,
  });
}

export async function addEmbeddingJob(data: EmbeddingJob) {
  return queues.embedding.add("create-embedding", data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function addNotificationJob(data: NotificationJob) {
  return queues.notification.add(`notify-${data.type}`, data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 10000 },
  });
}

export async function addChannelJob(data: ChannelJob) {
  // Per-chatbot fairness: max CHANNEL_RATE_LIMIT msgs/min (default 30)
  const limit = parseInt(process.env.CHANNEL_RATE_LIMIT || "30", 10);
  const allowed = await isTenantAllowed("channel", data.chatbotId, limit);
  if (!allowed) {
    console.warn(`[Queue] Channel rate limit hit for chatbot ${data.chatbotId}`);
    // Don't throw — just delay the job by 10s instead of dropping it
    return queues.channel.add(`channel-${data.channel}`, data, {
      attempts: 3,
      backoff: { type: "fixed", delay: 5000 },
      delay: 10_000,
    });
  }

  return queues.channel.add(`channel-${data.channel}`, data, {
    attempts: 3,
    backoff: { type: "fixed", delay: 5000 },
  });
}

export async function addTokenUsageJob(data: TokenUsageJob) {
  return queues.tokenUsage.add("log-token-usage", data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
  });
}

// Queue durumlarını getir
export async function getQueueStatus() {
  const [crawl, embedding, notification, channel, tokenUsage] = await Promise.all([
    queues.crawl.getJobCounts(),
    queues.embedding.getJobCounts(),
    queues.notification.getJobCounts(),
    queues.channel.getJobCounts(),
    queues.tokenUsage.getJobCounts(),
  ]);

  return { crawl, embedding, notification, channel, tokenUsage };
}

// Queue'yu temizle
export async function cleanQueue(queueName: keyof typeof queues) {
  const queue = queues[queueName];
  await queue.clean(0, 0, "completed");
  await queue.clean(0, 0, "failed");
  await queue.clean(0, 0, "wait");
  await queue.clean(0, 0, "delayed");
}

// Redis bağlantısını kapat
export async function closeQueues() {
  await Promise.all([
    queues.crawl.close(),
    queues.embedding.close(),
    queues.notification.close(),
    queues.channel.close(),
    queues.tokenUsage.close(),
  ]);
  await redisConnection.quit();
}
