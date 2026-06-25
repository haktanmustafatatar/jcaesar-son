import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ioredis before importing ratelimit
vi.mock("ioredis", () => {
  const mockExec = vi.fn();
  const mockMulti = vi.fn(() => ({
    incr: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: mockExec,
  }));
  const MockRedis = vi.fn(() => ({
    get: vi.fn(),
    multi: mockMulti,
    on: vi.fn(),
    quit: vi.fn(),
  }));
  return { default: MockRedis };
});

// Import after mocking
const { rateLimit } = await import("@/lib/ratelimit");
const IORedis = (await import("ioredis")).default;

function getRedisInstance() {
  return (IORedis as any).mock.results[0].value;
}

describe("rateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows request when under limit", async () => {
    const redis = getRedisInstance();
    redis.get.mockResolvedValue(null); // first request
    redis.multi().exec.mockResolvedValue([[null, 1]]);

    const result = await rateLimit("test-key", 10, 60);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("blocks request when at limit", async () => {
    const redis = getRedisInstance();
    redis.get.mockResolvedValue("10"); // already at limit

    const result = await rateLimit("test-key", 10, 60);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("fails open on Redis error", async () => {
    const redis = getRedisInstance();
    redis.get.mockRejectedValue(new Error("Redis connection error"));

    const result = await rateLimit("test-key", 10, 60);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("sets expire on first request", async () => {
    const redis = getRedisInstance();
    redis.get.mockResolvedValue(null);
    const multiChain = redis.multi();
    multiChain.exec.mockResolvedValue([[null, 1]]);

    await rateLimit("test-key", 10, 60);
    expect(multiChain.expire).toHaveBeenCalledWith("ratelimit:test-key", 60);
  });

  it("does not reset expire on subsequent requests", async () => {
    const redis = getRedisInstance();
    redis.get.mockResolvedValue("5");
    const multiChain = redis.multi();
    multiChain.exec.mockResolvedValue([[null, 6]]);

    await rateLimit("test-key", 10, 60);
    expect(multiChain.expire).not.toHaveBeenCalled();
  });

  it("prefixes key with ratelimit:", async () => {
    const redis = getRedisInstance();
    redis.get.mockResolvedValue(null);
    redis.multi().exec.mockResolvedValue([[null, 1]]);

    await rateLimit("user:123", 5, 30);
    expect(redis.get).toHaveBeenCalledWith("ratelimit:user:123");
  });
});
