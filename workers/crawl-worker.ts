import { Worker } from "bullmq";
import IORedis from "ioredis";
import { crawlWebsite, processDocument, NeuralIndexer } from "@/lib/crawler";
import { prisma } from "@/lib/prisma";
import os from "os";
import { logger } from "@/lib/logger";

const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (err) => {
  logger.warn({ err }, "[Redis/CrawlWorker] Connection error (expected during build)");
});

// Crawl Worker
export const crawlWorker = new Worker(
  "crawl",
  async (job) => {
    const { type, chatbotId, dataSourceId, userId } = job.data;

    logger.info({ jobId: job.id, type, chatbotId }, "[CrawlWorker] Processing job");

    // Worker Memory Protection
    const freeMemGB = os.freemem() / (1024 * 1024 * 1024);
    if (freeMemGB < 0.2) { // less than 200MB free
      logger.warn({ freeMemGB }, "[CrawlWorker] Extremely low memory detected. Throwing to retry later.");
      throw new Error("Worker OOM protection: Extremely low memory, retrying later.");
    }

    try {
      // Update data source to processing state
      if (dataSourceId) {
        await prisma.dataSource.update({
          where: { id: dataSourceId },
          data: { status: "CRAWLING", crawlStatus: "In progress..." },
        });
      }

      let result;
      const { content, fileUrl } = job.data;

      switch (type) {
        case "crawl-website":
          result = await crawlWebsite({
            url: job.data.url,
            urls: job.data.urls,
            maxDepth: job.data.maxDepth || 3,
            limit: job.data.limit || 100,
            chatbotId,
            dataSourceId,
            knowledgeSourceId: job.data.knowledgeSourceId,
            userId,
          });
          break;

        case "process-document":
          // Check if content is provided directly (for Text/Q&A)
          if (content && (fileUrl === "text-input" || fileUrl === "qna-input")) {
             const indexedChunks = await NeuralIndexer.indexContent({
                content,
                title: fileUrl === "text-input" ? "Text Source" : "Q&A Source",
                chatbotId,
                dataSourceId,
                knowledgeSourceId: job.data.knowledgeSourceId
             });
             
             await NeuralIndexer.updateStatus(
                dataSourceId || job.data.knowledgeSourceId!,
                dataSourceId ? "data" : "knowledge",
                "COMPLETED",
                { fileSize: content.length, lastCrawledAt: new Date() }
             );
             result = { success: true, chunks: indexedChunks };
          } else {
            result = await processDocument({
              fileUrl: job.data.fileUrl,
              fileType: job.data.fileType,
              chatbotId,
              dataSourceId,
              knowledgeSourceId: job.data.knowledgeSourceId,
            });
          }
          break;

        default:
          throw new Error(`Unknown crawl type: ${type}`);
      }

      logger.info({ jobId: job.id }, "[CrawlWorker] Job completed successfully");
      
      // Check if all data sources are done, then mark chatbot as ACTIVE
      const pendingSources = await prisma.dataSource.count({
        where: {
          chatbotId,
          status: { in: ["PENDING", "CRAWLING", "PROCESSING"] }
        }
      });
      
      if (pendingSources === 0) {
        await prisma.chatbot.update({
          where: { id: chatbotId },
          data: { status: "ACTIVE" },
        });
      }

      return result;
    } catch (error) {
      logger.error({ jobId: job.id, err: error }, "[CrawlWorker] Job failed");
      
      // Mark data source as ERROR so UI shows the failure
      if (dataSourceId) {
        try {
          await prisma.dataSource.update({
            where: { id: dataSourceId },
            data: { 
              status: "ERROR", 
              crawlStatus: error instanceof Error ? error.message : "Job failed" 
            },
          });
        } catch (updateErr) {
          logger.error({ err: updateErr }, "[CrawlWorker] Failed to update error status");
        }
      }
      
      // Check if all other data sources are done even if this one failed
      try {
        const pendingSources = await prisma.dataSource.count({
          where: {
            chatbotId,
            status: { in: ["PENDING", "CRAWLING", "PROCESSING"] }
          }
        });
        if (pendingSources === 0) {
          await prisma.chatbot.update({
            where: { id: chatbotId },
            data: { status: "ACTIVE" },
          });
        }
      } catch (e) {}

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
    lockDuration: 300000, 
  }
);

// Event listeners
crawlWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "[CrawlWorker] Job completed");
});

crawlWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "[CrawlWorker] Job failed");
});

crawlWorker.on("progress", (job, progress) => {
  logger.debug({ jobId: job.id, progress }, "[CrawlWorker] Job progress");
});

logger.info("[CrawlWorker] Started");
