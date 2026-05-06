import { Worker } from "bullmq";
import IORedis from "ioredis";
import { crawlWebsite, processDocument, NeuralIndexer } from "@/lib/crawler";
import { prisma } from "@/lib/prisma";

const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (err) => {
  console.warn("[Redis/CrawlWorker] Connection error (expected during build):", err.message);
});

// Crawl Worker
export const crawlWorker = new Worker(
  "crawl",
  async (job) => {
    const { type, chatbotId, dataSourceId, userId } = job.data;

    console.log(`[CrawlWorker] Processing job ${job.id} - ${type}`);

    try {
      // Update data source to processing state
      if (dataSourceId) {
        await prisma.dataSource.update({
          where: { id: dataSourceId },
          data: { status: "CRAWLING", crawlStatus: "In progress..." },
        });
      }

      // Mark chatbot as ACTIVE early to allow interaction during crawl
      await prisma.chatbot.update({
        where: { id: chatbotId },
        data: { status: "ACTIVE" },
      });

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

      console.log(`[CrawlWorker] Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      console.error(`[CrawlWorker] Job ${job.id} failed:`, error);
      
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
          console.error("[CrawlWorker] Failed to update error status:", updateErr);
        }
      }
      
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
  console.log(`[CrawlWorker] Job ${job.id} completed`);
});

crawlWorker.on("failed", (job, err) => {
  console.error(`[CrawlWorker] Job ${job?.id} failed:`, err.message);
});

crawlWorker.on("progress", (job, progress) => {
  console.log(`[CrawlWorker] Job ${job.id} progress: ${progress}%`);
});

console.log("[CrawlWorker] Started");
