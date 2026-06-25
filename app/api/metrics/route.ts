import { NextResponse } from "next/server";
import { Registry, collectDefaultMetrics, Gauge } from "prom-client";
import { getQueueStatus } from "@/lib/queue";

// Singleton registry — avoids double-registration on hot reload in dev
const g = globalThis as unknown as { _metricsRegistry?: Registry };

function getRegistry(): Registry {
  if (!g._metricsRegistry) {
    const registry = new Registry();
    collectDefaultMetrics({ register: registry });

    // BullMQ queue depth gauges
    const queueWaiting = new Gauge({
      name: "bullmq_queue_waiting",
      help: "Number of waiting jobs in each BullMQ queue",
      labelNames: ["queue"],
      registers: [registry],
    });
    const queueActive = new Gauge({
      name: "bullmq_queue_active",
      help: "Number of active jobs in each BullMQ queue",
      labelNames: ["queue"],
      registers: [registry],
    });
    const queueFailed = new Gauge({
      name: "bullmq_queue_failed",
      help: "Number of failed jobs in each BullMQ queue",
      labelNames: ["queue"],
      registers: [registry],
    });
    const queueDelayed = new Gauge({
      name: "bullmq_queue_delayed",
      help: "Number of delayed jobs in each BullMQ queue",
      labelNames: ["queue"],
      registers: [registry],
    });
    const queueCompleted = new Gauge({
      name: "bullmq_queue_completed",
      help: "Number of completed jobs in each BullMQ queue",
      labelNames: ["queue"],
      registers: [registry],
    });

    // Attach gauge refs so the scrape handler can update them
    (registry as any)._bullmqGauges = { queueWaiting, queueActive, queueFailed, queueDelayed, queueCompleted };

    g._metricsRegistry = registry;
  }
  return g._metricsRegistry;
}

// Only accessible with Bearer token to avoid leaking internal metrics
function isAuthorized(req: Request): boolean {
  const token = process.env.METRICS_TOKEN;
  if (!token) return true; // open if no token configured
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${token}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const registry = getRegistry();
  const gauges = (registry as any)._bullmqGauges as {
    queueWaiting: Gauge;
    queueActive: Gauge;
    queueFailed: Gauge;
    queueDelayed: Gauge;
    queueCompleted: Gauge;
  };

  try {
    const status = await getQueueStatus();
    for (const [name, counts] of Object.entries(status)) {
      gauges.queueWaiting.set({ queue: name }, counts.waiting ?? 0);
      gauges.queueActive.set({ queue: name }, counts.active ?? 0);
      gauges.queueFailed.set({ queue: name }, counts.failed ?? 0);
      gauges.queueDelayed.set({ queue: name }, counts.delayed ?? 0);
      gauges.queueCompleted.set({ queue: name }, counts.completed ?? 0);
    }
  } catch {
    // Queue unavailable — serve default metrics without queue gauges
  }

  const metrics = await registry.metrics();
  return new NextResponse(metrics, {
    headers: { "Content-Type": registry.contentType },
  });
}
