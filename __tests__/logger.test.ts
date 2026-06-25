import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import pino from "pino";

// Mock pino before importing logger
vi.mock("pino", () => {
  const child = vi.fn().mockReturnThis();
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child,
  };
  const pinoFn = vi.fn(() => mockLogger);
  (pinoFn as any).default = pinoFn;
  return { default: pinoFn };
});

const { logger } = await import("@/lib/logger");

describe("logger", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is a pino logger instance", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
  });

  it("child() creates a child logger", () => {
    const child = logger.child({ worker: "test" });
    expect(child).toBeDefined();
  });

  it("info() can be called with message and data", () => {
    logger.info({ key: "value" }, "test message");
    expect(logger.info).toHaveBeenCalledWith({ key: "value" }, "test message");
  });

  it("error() can be called with error object", () => {
    const err = new Error("test error");
    logger.error({ err }, "something failed");
    expect(logger.error).toHaveBeenCalledWith({ err }, "something failed");
  });
});
