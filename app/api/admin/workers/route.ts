import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    // Admin check
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { role: true }
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to the main crawl queue
    const crawlQueue = new Queue("crawl-queue", { connection });
    
    // Get stats
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      crawlQueue.getWaitingCount(),
      crawlQueue.getActiveCount(),
      crawlQueue.getCompletedCount(),
      crawlQueue.getFailedCount(),
      crawlQueue.getDelayedCount(),
    ]);

    // Get a few recent jobs for the UI
    const recentJobs = await crawlQueue.getJobs(["completed", "failed"], 0, 9, false);

    return NextResponse.json({
      queues: [
        {
          name: "Crawl Engine",
          waiting,
          active,
          completed,
          failed,
          delayed,
          status: active > 0 ? "busy" : "idle"
        }
      ],
      recentActivity: recentJobs.map(job => ({
        id: job.id,
        name: job.name,
        status: job.finishedOn ? "completed" : "failed",
        timestamp: job.finishedOn ? new Date(job.finishedOn).toISOString() : new Date().toISOString(),
        data: {
          url: job.data.url,
          chatbotId: job.data.chatbotId
        }
      }))
    });
  } catch (error) {
    console.error("Worker Stats Error:", error);
    return NextResponse.json({ error: "Failed to fetch worker stats" }, { status: 500 });
  }
}
