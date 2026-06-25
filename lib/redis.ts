import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Shared IORedis singleton — all workers and rate limiter import from here.
// Avoids N separate TCP connections per process.
export const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
});

redis.on("error", (err) => {
  // Suppress noisy connection errors during Next.js build/cold start
  if (process.env.NODE_ENV !== "production") {
    console.warn("[Redis] Connection error:", err.message);
  }
});

// Separate connection for BullMQ (BullMQ requires its own connection)
export function createBullMQConnection() {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
