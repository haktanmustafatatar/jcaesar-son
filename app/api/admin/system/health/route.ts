import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/ratelimit";

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check Database (with graceful catch)
    let dbStatus = "operational";
    let dbLatency = 0;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - startTime;
    } catch (e) {
      dbStatus = "error";
    }

    // Check Redis (Graceful if Redis is down)
    let redisStatus = "operational";
    let redisLatency = 0;
    try {
      const redisStart = Date.now();
      await redis.ping();
      redisLatency = Date.now() - redisStart;
    } catch (e) {
      redisStatus = "offline";
    }

    return NextResponse.json({
      status: dbStatus === "operational" ? "healthy" : "degraded",
      uptime: process.uptime(),
      services: {
        database: { status: dbStatus, latency: `${dbLatency}ms` },
        redis: { status: redisStatus, latency: `${redisLatency}ms` }
      }
    });
  } catch (error) {
    console.error("[SystemHealthAPI] Fatal Error:", error);
    return NextResponse.json({ 
      status: "critical",
      error: "Platform monitoring failed"
    });
  }
}
