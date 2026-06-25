import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock prom-client
const mockMetrics = vi.fn().mockResolvedValue("# HELP process_cpu_seconds_total\nprocess_cpu_seconds_total 0.1");
const mockContentType = "text/plain; version=0.0.4; charset=utf-8";
const mockRegister = {
  metrics: mockMetrics,
  contentType: mockContentType,
  setDefaultLabels: vi.fn(),
  registerMetric: vi.fn(),
  getSingleMetric: vi.fn().mockReturnValue(undefined),
  getMetricsAsArray: vi.fn().mockReturnValue([]),
};

vi.mock("prom-client", () => ({
  Registry: vi.fn(() => mockRegister),
  collectDefaultMetrics: vi.fn(),
  Gauge: vi.fn(() => ({ set: vi.fn() })),
}));

// Mock bullmq
vi.mock("bullmq", () => ({
  Queue: vi.fn(() => ({
    getJobCounts: vi.fn().mockResolvedValue({ waiting: 0, active: 1, completed: 5 }),
    close: vi.fn(),
  })),
}));

// Mock ioredis
vi.mock("ioredis", () => ({
  default: vi.fn(() => ({ on: vi.fn(), quit: vi.fn() })),
}));

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/metrics", { headers });
}

describe("GET /api/metrics", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...OLD_ENV };
    mockMetrics.mockResolvedValue("# HELP test\ntest 1");
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns 401 when METRICS_TOKEN is set and no token provided", async () => {
    process.env.METRICS_TOKEN = "secret-token";
    const { GET } = await import("@/app/api/metrics/route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong token provided", async () => {
    process.env.METRICS_TOKEN = "secret-token";
    const { GET } = await import("@/app/api/metrics/route");
    const res = await GET(makeRequest("wrong-token"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with metrics when correct token provided", async () => {
    process.env.METRICS_TOKEN = "secret-token";
    const { GET } = await import("@/app/api/metrics/route");
    const res = await GET(makeRequest("secret-token"));
    expect(res.status).toBe(200);
  });

  it("returns 200 with no auth when METRICS_TOKEN not set", async () => {
    delete process.env.METRICS_TOKEN;
    const { GET } = await import("@/app/api/metrics/route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it("returns prometheus content-type header", async () => {
    delete process.env.METRICS_TOKEN;
    const { GET } = await import("@/app/api/metrics/route");
    const res = await GET(makeRequest());
    expect(res.headers.get("content-type")).toContain("text/plain");
  });
});
