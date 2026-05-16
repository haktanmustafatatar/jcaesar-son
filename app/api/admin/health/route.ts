import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Redis } from "ioredis";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    // Check if user is admin (security)
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { role: true }
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const health: any = {
      status: "operational",
      timestamp: new Date().toISOString(),
      components: {}
    };

    // 1. Database Check
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      health.components.database = {
        status: "operational",
        latency: `${Date.now() - dbStart}ms`
      };
    } catch (e) {
      health.status = "degraded";
      health.components.database = { status: "down", error: "Connection failed" };
    }

    // 2. Redis Check
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
      const redisStart = Date.now();
      await redis.ping();
      health.components.redis = {
        status: "operational",
        latency: `${Date.now() - redisStart}ms`
      };
      await redis.quit();
    } catch (e) {
      health.status = "degraded";
      health.components.redis = { status: "down", error: "Connection failed" };
    }

    // 3. OpenAI Connectivity Check (Lightweight)
    try {
      const openaiStart = Date.now();
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` }
      });
      if (res.ok) {
        health.components.openai = {
          status: "operational",
          latency: `${Date.now() - openaiStart}ms`
        };
      } else {
        health.components.openai = { status: "issue", error: `HTTP ${res.status}` };
      }
    } catch (e) {
      health.components.openai = { status: "down", error: "Network failed" };
    }

    return NextResponse.json(health);
  } catch (error) {
    console.error("Health Check Error:", error);
    return NextResponse.json({ status: "error", message: "Failed to perform health check" }, { status: 500 });
  }
}
