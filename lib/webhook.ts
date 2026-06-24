import crypto from "crypto";
import { prisma } from "./prisma";

interface WebhookPayload {
  event: string;
  timestamp: number;
  payload: any;
}

async function sendWebhookWithRetry(
  url: string,
  secret: string,
  payload: WebhookPayload,
  retries = 3,
  delay = 1000
) {
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Caesar-Signature": signature,
          "User-Agent": "JCaesar-Webhook-Dispatcher/1.0",
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(id);

      if (response.ok) {
        console.log(`[Webhook] Successfully sent event ${payload.event} to ${url}`);
        return;
      }
      
      console.warn(
        `[Webhook] Attempt ${attempt} failed with status ${response.status} for ${url}`
      );
    } catch (error: any) {
      console.error(
        `[Webhook] Attempt ${attempt} failed with error: ${error?.message || error} for ${url}`
      );
    }

    if (attempt < retries) {
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

export function triggerWebhook(
  chatbotId: string,
  event: string,
  payload: any
): void {
  // Run asynchronously without awaiting so the caller is never blocked
  (async () => {
    try {
      const endpoints = await prisma.webhookEndpoint.findMany({
        where: {
          chatbotId,
          active: true,
        },
      });

      if (endpoints.length === 0) return;

      const webhookPayload: WebhookPayload = {
        event,
        timestamp: Date.now(),
        payload,
      };

      const tasks = endpoints
        .filter((ep) => ep.events.includes(event))
        .map((ep) =>
          sendWebhookWithRetry(ep.url, ep.secret, webhookPayload)
        );

      await Promise.allSettled(tasks);
    } catch (error) {
      console.error("[WebhookDispatcher] Error dispatching webhook:", error);
    }
  })();
}
