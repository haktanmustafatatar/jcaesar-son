import { Worker } from "bullmq";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { createBullMQConnection } from "@/lib/redis";

const workerLog = logger.child({ worker: "notification" });

// SendGrid email gönderimi
async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject?: string;
  body: string;
  template?: string;
  data?: Record<string, any>;
}) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    workerLog.warn("SENDGRID_API_KEY not set, skipping email");
    return { success: false, skipped: true };
  }

  const fromEmail = process.env.EMAIL_FROM || "noreply@jcaesars.com";

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject: subject || "J.Caesar Agent Notification",
      content: [{ type: "text/plain", value: body }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }

  workerLog.info({ to, subject }, "Email sent");
  return { success: true };
}

// Webhook gönderimi
async function sendWebhook({
  url,
  payload,
}: {
  url: string;
  payload: Record<string, any>;
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`);
  }

  return { success: true };
}

// Notification Worker
export const notificationWorker = new Worker(
  "notification",
  async (job) => {
    const { type, to, subject, body, template, data } = job.data;

    workerLog.info({ jobId: job.id, type }, "Processing job");

    try {
      switch (type) {
        case "email":
          await sendEmail({ to, subject, body, template, data });
          break;

        case "webhook":
          await sendWebhook({ url: to, payload: data || {} });
          break;

        case "push":
          workerLog.info({ to, body }, "Push notification (not yet integrated)");
          break;

        default:
          throw new Error(`Unknown notification type: ${type}`);
      }

      workerLog.info({ jobId: job.id }, "Job completed");
      return { success: true };
    } catch (error) {
      Sentry.captureException(error, { extra: { jobId: job.id, type } });
      workerLog.error({ jobId: job.id, err: error }, "Job failed");
      throw error;
    }
  },
  {
    connection: createBullMQConnection(),
    concurrency: 5,
  }
);

// Token limit uyarı emaili
export async function sendTokenWarningEmail({
  userEmail,
  userName,
  usedTokens,
  limit,
  percentage,
}: {
  userEmail: string;
  userName: string;
  usedTokens: number;
  limit: number;
  percentage: number;
}) {
  const subject = `Token Limit Warning - ${percentage.toFixed(0)}% Used`;
  const body = `
Hi ${userName},

You're approaching your monthly token limit:

- Used: ${usedTokens.toLocaleString()} tokens
- Limit: ${limit.toLocaleString()} tokens
- Percentage: ${percentage.toFixed(1)}%

To avoid service interruption, consider upgrading your plan or purchasing additional tokens.

Best regards,
J.Caesar Agent Team
`;

  // Queue'ya ekle
  const { queues } = await import("@/lib/queue");
  await queues.notification.add(
    "token-warning",
    {
      type: "email",
      to: userEmail,
      subject,
      body,
    },
    {
      attempts: 5,
      backoff: { type: "exponential", delay: 60000 },
    }
  );
}

notificationWorker.on("completed", (job) => {
  workerLog.debug({ jobId: job.id }, "Job completed");
});

notificationWorker.on("failed", (job, err) => {
  workerLog.error({ jobId: job?.id, err: err.message }, "Job failed");
});

workerLog.info("Started");
