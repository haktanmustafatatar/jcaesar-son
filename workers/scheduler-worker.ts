import { prisma } from "@/lib/prisma";
import { addCrawlJob } from "@/lib/queue";
import { subDays, subWeeks, subMonths, isSameDay } from "date-fns";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

const schedulerLog = logger.child({ worker: "scheduler" });

/**
 * Istanbul Timezone Helper (UTC+3)
 */
function getIstanbulDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 3));
}

async function checkAndTriggerSchedules() {
  const trDate = getIstanbulDate();
  const currentHour = trDate.getHours();

  schedulerLog.info({ istanbulHour: currentHour }, "Checking schedules");

  // Sadece gece yarısı (00:00 - 01:00 arası) tarama yapalım
  if (currentHour !== 0) return;

  try {
    const dataSources = await prisma.dataSource.findMany({
      where: {
        crawlSchedule: { not: "none" },
        status: { not: "CRAWLING" }
      },
      include: {
        chatbot: true
      }
    });

    for (const ds of dataSources) {
      const lastCrawled = ds.lastCrawledAt;
      const schedule = ds.crawlSchedule;
      let shouldTrigger = false;

      // Eğer hiç taranmadıysa hemen tara
      if (!lastCrawled) {
        shouldTrigger = true;
      } else {
        const isAlreadyCrawledToday = isSameDay(lastCrawled, trDate);

        if (!isAlreadyCrawledToday) {
          if (schedule === "daily") {
            shouldTrigger = true;
          } else if (schedule === "weekly" && trDate.getDay() === 0) { // Sunday
            shouldTrigger = true;
          } else if (schedule === "monthly" && trDate.getDate() === 1) { // 1st of month
            shouldTrigger = true;
          }
        }
      }

      if (shouldTrigger && ds.chatbot) {
        schedulerLog.info({ dataSourceId: ds.id, name: ds.name }, "Triggering auto-sync");

        await prisma.$transaction([
          prisma.document.deleteMany({ where: { dataSourceId: ds.id } }),
          prisma.dataSourceUrl.deleteMany({ where: { dataSourceId: ds.id } }),
          prisma.dataSource.update({
            where: { id: ds.id },
            data: {
              status: "PENDING",
              crawlStatus: "Auto-Refresh Starting...",
              pagesCount: 0
            }
          })
        ]);

        if (ds.type === "WEBSITE" && ds.url) {
          await addCrawlJob({
            type: "crawl-website",
            url: ds.url,
            chatbotId: ds.chatbotId,
            dataSourceId: ds.id,
            userId: ds.chatbot.userId,
            maxDepth: ds.crawlDepth,
            limit: 100,
          });
        }
      }
    }
  } catch (error) {
    Sentry.captureException(error, { extra: { worker: "scheduler", task: "checkAndTriggerSchedules" } });
    schedulerLog.error({ err: error }, "Error checking schedules");
  }
}

async function checkAndResolveStaleHandoffs() {
  schedulerLog.info("Checking for stale human handoff conversations");
  try {
    const staleHandoffConversations = await prisma.conversation.findMany({
      where: {
        aiEnabled: false,
        status: "ACTIVE",
        updatedAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } // 2 saat
      }
    });

    if (staleHandoffConversations.length > 0) {
      schedulerLog.info({ count: staleHandoffConversations.length }, "Re-enabling AI for stale handoff conversations");
    }

    for (const conv of staleHandoffConversations) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { aiEnabled: true }
      });
      await prisma.conversationNote.create({
        data: {
          conversationId: conv.id,
          content: "AI agent 2 saatlik inaktivite sonrası otomatik devreye alındı.",
          createdBy: "system"
        }
      });
      schedulerLog.info({ conversationId: conv.id }, "Re-enabled AI for conversation");
    }
  } catch (error) {
    Sentry.captureException(error, { extra: { worker: "scheduler", task: "checkAndResolveStaleHandoffs" } });
    schedulerLog.error({ err: error }, "Error in handoff inactivity check");
  }
}

// Her saat başı kontrol et
schedulerLog.info("Background worker initialized");
setInterval(checkAndTriggerSchedules, 60 * 60 * 1000);
// Her 30 dakikada bir kontrol et
setInterval(checkAndResolveStaleHandoffs, 30 * 60 * 1000);

// Başlangıçta da bir kontrol yapalım
checkAndTriggerSchedules();
checkAndResolveStaleHandoffs();
