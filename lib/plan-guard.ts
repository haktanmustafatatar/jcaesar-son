import { prisma } from "./prisma";

export async function checkPlanLimits(chatbotId: string) {
  try {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        organization: {
          include: {
            plan: true,
            _count: {
              select: { chatbots: true }
            }
          }
        }
      }
    });

    if (!chatbot || !chatbot.organization) {
      return { allowed: true }; // Default to allowed for standalone or untracked
    }

    const { plan, id: orgId } = chatbot.organization;

    // 1. Check Message Limits (for current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const messageCount = await prisma.tokenUsage.count({
      where: {
        chatbotId,
        createdAt: { gte: startOfMonth }
      }
    });

    if (messageCount >= plan.messageLimit) {
      // Trigger limit reached notification if not already sent
      await createLimitNotification(chatbot.userId, orgId, plan.name, "100%");
      return { allowed: false, reason: "MESSAGE_LIMIT_REACHED", limit: plan.messageLimit };
    }

    // Check for 80% threshold
    if (messageCount >= plan.messageLimit * 0.8) {
      await createLimitNotification(chatbot.userId, orgId, plan.name, "80%");
    }

    return { allowed: true, current: messageCount, limit: plan.messageLimit };
  } catch (error) {
    console.error("[PlanGuard] Error checking limits:", error);
    return { allowed: true }; // Allow on error to avoid blocking users
  }
}

async function createLimitNotification(userId: string, orgId: string, planName: string, threshold: string) {
  const title = `Usage Alert: ${threshold} Reached`;
  const message = `Your ${planName} plan has reached ${threshold} of its monthly message limit. Upgrade now to avoid service interruption.`;
  
  // Check if a similar notification was sent in the last 24h to avoid spam
  const lastNotify = await prisma.notification.findFirst({
    where: {
      userId,
      title,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  if (!lastNotify) {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: "WARNING",
        link: "/dashboard/settings/billing"
      }
    });
  }
}

export async function canAccessFeature(chatbotId: string, feature: "whatsapp" | "branding" | "api") {
  try {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        organization: {
          include: { plan: true }
        }
      }
    });

    if (!chatbot || !chatbot.organization) return true;

    const planSlug = chatbot.organization.plan.slug;

    if (feature === "whatsapp") {
      return ["elite", "enterprise"].includes(planSlug);
    }

    if (feature === "branding") {
      return ["enterprise"].includes(planSlug);
    }

    if (feature === "api") {
      return ["elite", "enterprise"].includes(planSlug);
    }

    return true;
  } catch (error) {
    return true;
  }
}
