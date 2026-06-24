import { prisma } from "@/lib/prisma";
import { addCrawlJob } from "@/lib/queue";
import { subDays, subWeeks, subMonths, isSameDay } from "date-fns";

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
  
  console.log(`[Scheduler] Checking schedules at ${trDate.toISOString()} (Istanbul Hour: ${currentHour})`);

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
        console.log(`[Scheduler] Triggering auto-sync for ${ds.name} (ID: ${ds.id})`);
        
        // Retrain endpoint'indeki temizlik mantığını burada da uygulayalım
        // Önce temizleyelim ki mükerrer veri olmasın (User request: "Tertemiz bir sayfa mı açalım")
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
    console.error("[Scheduler] Error checking schedules:", error);
  }
}

async function checkAndResolveStaleHandoffs() {
  console.log("[Scheduler] Checking for stale human handoff conversations...");
  try {
    const staleHandoffConversations = await prisma.conversation.findMany({
      where: {
        aiEnabled: false,
        status: "ACTIVE",
        updatedAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } // 2 saat
      }
    });
    
    if (staleHandoffConversations.length > 0) {
      console.log(`[Scheduler] Found ${staleHandoffConversations.length} stale handoff conversations to re-enable.`);
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
      console.log(`[Scheduler] Re-enabled AI for conversation ${conv.id}`);
    }
  } catch (error) {
    console.error("[Scheduler] Error in handoff inactivity check:", error);
  }
}

// Her saat başı kontrol et
console.log("[Scheduler] Background worker initialized");
setInterval(checkAndTriggerSchedules, 60 * 60 * 1000);
// Her 30 dakikada bir kontrol et
setInterval(checkAndResolveStaleHandoffs, 30 * 60 * 1000);

// Başlangıçta da bir kontrol yapalım
checkAndTriggerSchedules();
checkAndResolveStaleHandoffs();
