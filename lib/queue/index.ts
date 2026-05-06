import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

// Redis connection
const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (err) => {
  console.warn("[Redis] Connection error (expected during build):", err.message);
});

// Queue tanımları
export const queues = {
  // Crawl işlemleri
  crawl: new Queue("crawl", { connection: redisConnection }),

  // Embedding işlemleri
  embedding: new Queue("embedding", { connection: redisConnection }),

  // Bildirim işlemleri
  notification: new Queue("notification", { connection: redisConnection }),

  // Kanal mesaj işlemleri
  channel: new Queue("channel", { connection: redisConnection }),

  // Token kullanım loglama
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

// Job ekleme fonksiyonları
export async function addCrawlJob(data: CrawlJob) {
  return queues.crawl.add(`crawl-${data.type}`, data, {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: 500,
    removeOnFail: 200,
  });
}

export async function addEmbeddingJob(data: EmbeddingJob) {
  return queues.embedding.add("create-embedding", data, {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });
}

export async function addNotificationJob(data: NotificationJob) {
  return queues.notification.add(`notify-${data.type}`, data, {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
  });
}

export async function addChannelJob(data: ChannelJob) {
  return queues.channel.add(`channel-${data.channel}`, data, {
    attempts: 3,
    backoff: {
      type: "fixed",
      delay: 5000,
    },
  });
}

export async function addTokenUsageJob(data: TokenUsageJob) {
  return queues.tokenUsage.add("log-token-usage", data, {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
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

  return {
    crawl,
    embedding,
    notification,
    channel,
    tokenUsage,
  };
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
