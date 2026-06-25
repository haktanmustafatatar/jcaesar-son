import { Worker } from "bullmq";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createBullMQConnection } from "@/lib/redis";

// Cost per 1K tokens (USD), [input, output]
const MODEL_PRICING: Record<string, [number, number]> = {
  "gpt-4o":            [0.0025,  0.010],
  "gpt-4o-mini":       [0.00015, 0.0006],
  "gpt-4-turbo":       [0.010,   0.030],
  "gpt-4":             [0.030,   0.060],
  "gpt-3.5-turbo":     [0.0005,  0.0015],
  "claude-opus-4":     [0.015,   0.075],
  "claude-sonnet-4":   [0.003,   0.015],
  "claude-sonnet-4-6": [0.003,   0.015],
  "claude-haiku-4":    [0.00025, 0.00125],
};

function computeCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? [0.003, 0.015]; // default to sonnet pricing
  const [inputRate, outputRate] = pricing;
  return (promptTokens / 1000) * inputRate + (completionTokens / 1000) * outputRate;
}

const workerLog = logger.child({ worker: "token-usage" });

export const tokenUsageWorker = new Worker(
  "token-usage",
  async (job) => {
    const { type, userId, chatbotId, conversationId, model, promptTokens, completionTokens } = job.data;

    if (type !== "log-usage") {
      workerLog.warn({ jobId: job.id, type }, "Unknown job type, skipping");
      return { skipped: true };
    }

    const tokensUsed = promptTokens + completionTokens;
    const cost = computeCost(model, promptTokens, completionTokens);

    try {
      await prisma.tokenUsage.create({
        data: {
          userId,
          chatbotId: chatbotId || null,
          conversationId: conversationId || null,
          model,
          tokensUsed,
          promptTokens,
          completionTokens,
          cost,
        },
      });

      workerLog.info({ jobId: job.id, userId, model, tokensUsed, cost }, "Token usage recorded");
      return { success: true, tokensUsed, cost };
    } catch (error) {
      Sentry.captureException(error, { extra: { jobId: job.id, userId, model } });
      workerLog.error({ jobId: job.id, err: error }, "Failed to record token usage");
      throw error;
    }
  },
  {
    connection: createBullMQConnection(),
    concurrency: 20,
  }
);

tokenUsageWorker.on("completed", (job) => {
  workerLog.debug({ jobId: job.id }, "Job completed");
});

tokenUsageWorker.on("failed", (job, err) => {
  workerLog.error({ jobId: job?.id, err: err.message }, "Job failed");
});

workerLog.info("Started");
