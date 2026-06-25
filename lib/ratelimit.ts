import { redis } from "@/lib/redis";

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
    // Fail open to avoid breaking UX on transient Redis errors
    return { success: true, remaining: 1 };
  }
}
