import IORedis from "ioredis";

// Global Redis client for rate limiting
export const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("error", (err) => {
  // Avoid logging connection errors during build time (Next.js static analysis)
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  console.warn("[RateLimit/Redis] Connection error:", err.message);
});

/**
 * Basic Rate Limiter using Redis
 * @param key Unique key for the rate limit (e.g. IP + ChatbotId)
 * @param limit Max requests allowed
 * @param windowSeconds Time window in seconds
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const fullKey = `ratelimit:${key}`;
  
  try {
    const current = await redis.get(fullKey);
    if (current && parseInt(current) >= limit) {
      return { success: false, remaining: 0 };
    }

    const multi = redis.multi();
    multi.incr(fullKey);
    if (!current) {
      multi.expire(fullKey, windowSeconds);
    }
    
    const results = await multi.exec();
    if (!results) return { success: true, remaining: limit };

    // results[0] is [error, count]
    const count = results[0][1] as number;

    return { 
      success: count <= limit, 
      remaining: Math.max(0, limit - count) 
    };
  } catch (error) {
    console.error("[RateLimit] Error:", error);
    // On redis error, allow the request to fail open or closed? 
    // Usually fail open to not break UX, but for security fail closed might be better.
    // For now, fail open.
    return { success: true, remaining: 1 };
  }
}
