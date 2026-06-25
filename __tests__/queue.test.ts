import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ioredis
vi.mock("ioredis", () => {
  const MockRedis = vi.fn(() => ({
    on: vi.fn(),
    quit: vi.fn(),
  }));
  return { default: MockRedis };
});

// Mock bullmq
const mockAdd = vi.fn().mockResolvedValue({ id: "job-1" });
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockGetJobCounts = vi.fn().mockResolvedValue({
  waiting: 0,
  active: 0,
  completed: 10,
  failed: 1,
  delayed: 0,
});
const mockClean = vi.fn().mockResolvedValue([]);

vi.mock("bullmq", () => {
  const Queue = vi.fn(() => ({
    add: mockAdd,
    close: mockClose,
    getJobCounts: mockGetJobCounts,
    clean: mockClean,
  }));
  const Worker = vi.fn(() => ({ on: vi.fn() }));
  return { Queue, Worker };
});

const {
  addCrawlJob,
  addEmbeddingJob,
  addNotificationJob,
  addChannelJob,
  addTokenUsageJob,
  getQueueStatus,
  cleanQueue,
  closeQueues,
} = await import("@/lib/queue");

describe("Queue helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdd.mockResolvedValue({ id: "job-1" });
    mockGetJobCounts.mockResolvedValue({ waiting: 0, active: 0, completed: 10, failed: 1 });
    mockClean.mockResolvedValue([]);
    mockClose.mockResolvedValue(undefined);
  });

  describe("addCrawlJob", () => {
    it("adds job with correct name and retry config", async () => {
      const data = {
        type: "crawl-website" as const,
        url: "https://example.com",
        chatbotId: "bot-1",
        userId: "user-1",
      };

      await addCrawlJob(data);

      expect(mockAdd).toHaveBeenCalledWith(
        "crawl-crawl-website",
        data,
        expect.objectContaining({ attempts: 5 })
      );
    });

    it("uses exponential backoff", async () => {
      await addCrawlJob({ type: "crawl-page", chatbotId: "b", userId: "u" });
      const opts = mockAdd.mock.calls[0][2];
      expect(opts.backoff.type).toBe("exponential");
    });
  });

  describe("addEmbeddingJob", () => {
    it("adds job with document data", async () => {
      await addEmbeddingJob({ type: "create-embedding", documentId: "doc-1", content: "Hello" });
      expect(mockAdd).toHaveBeenCalledWith(
        "create-embedding",
        expect.objectContaining({ documentId: "doc-1" }),
        expect.any(Object)
      );
    });
  });

  describe("addNotificationJob", () => {
    it("prefixes name with notify-", async () => {
      await addNotificationJob({ type: "email", to: "a@b.com", body: "test" });
      expect(mockAdd).toHaveBeenCalledWith("notify-email", expect.any(Object), expect.any(Object));
    });
  });

  describe("addChannelJob", () => {
    it("uses fixed backoff and 3 attempts", async () => {
      await addChannelJob({
        type: "send-message",
        channel: "whatsapp",
        recipientId: "+1234",
        message: "hi",
        chatbotId: "b",
        conversationId: "c",
      });
      const opts = mockAdd.mock.calls[0][2];
      expect(opts.attempts).toBe(3);
      expect(opts.backoff.type).toBe("fixed");
    });
  });

  describe("addTokenUsageJob", () => {
    it("adds token usage job", async () => {
      await addTokenUsageJob({
        type: "log-usage",
        userId: "u",
        chatbotId: "b",
        conversationId: "c",
        model: "gpt-4o",
        promptTokens: 100,
        completionTokens: 50,
      });
      expect(mockAdd).toHaveBeenCalledWith("log-token-usage", expect.any(Object), expect.any(Object));
    });
  });

  describe("getQueueStatus", () => {
    it("returns status for all 5 queues", async () => {
      const status = await getQueueStatus();
      expect(Object.keys(status)).toEqual(
        expect.arrayContaining(["crawl", "embedding", "notification", "channel", "tokenUsage"])
      );
      // getJobCounts called once per queue
      expect(mockGetJobCounts).toHaveBeenCalledTimes(5);
    });
  });

  describe("cleanQueue", () => {
    it("cleans completed, failed, wait, and delayed", async () => {
      await cleanQueue("crawl");
      expect(mockClean).toHaveBeenCalledTimes(4);
      expect(mockClean).toHaveBeenCalledWith(0, 0, "completed");
      expect(mockClean).toHaveBeenCalledWith(0, 0, "failed");
    });
  });

  describe("closeQueues", () => {
    it("closes all queues and redis connection", async () => {
      await closeQueues();
      expect(mockClose).toHaveBeenCalledTimes(5);
    });
  });
});
