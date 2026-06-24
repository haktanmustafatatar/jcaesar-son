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
        },
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (!chatbot || !chatbot.organization) {
      return { allowed: true }; // Default to allowed for standalone or untracked
    }

    const { plan, id: orgId, messageLimitOverride } = chatbot.organization;
    const effectiveLimit = messageLimitOverride ?? plan.messageLimit;

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

    if (messageCount >= effectiveLimit) {
      // Trigger limit reached notification if not already sent
      await createLimitNotification(chatbot.userId, chatbot.user?.email || undefined, chatbot.user?.name || undefined, orgId, plan.name, "100%");
      return { allowed: false, reason: "MESSAGE_LIMIT_REACHED", limit: effectiveLimit };
    }

    // Check for 80% threshold
    if (messageCount >= effectiveLimit * 0.8) {
      await createLimitNotification(chatbot.userId, chatbot.user?.email || undefined, chatbot.user?.name || undefined, orgId, plan.name, "80%");
    }

    return { allowed: true, current: messageCount, limit: effectiveLimit };
  } catch (error) {
    console.error("[PlanGuard] Error checking limits:", error);
    return { allowed: true }; // Allow on error to avoid blocking users
  }
}

async function createLimitNotification(
  userId: string, 
  userEmail: string | undefined, 
  userName: string | undefined,
  orgId: string, 
  planName: string, 
  threshold: string
) {
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

    // Send email alert to user
    if (userEmail) {
      const { sendEmail } = await import("./email");
      await sendEmail({
        to: userEmail,
        subject: `[J.Caesar Alert] ${threshold} Plan Limit Reached`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; max-width: 600px; border: 1px solid #eaeaea; borderRadius: 16px;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">Hello ${userName || 'Valued Customer'},</h2>
            <p style="font-size: 15px; color: #374151; line-height: 1.6;">
              This is an automated alert from <strong>J.Caesar</strong>. 
              Your active plan (<strong>${planName}</strong>) has reached <strong>${threshold}</strong> of its monthly message usage limit.
            </p>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #4f46e5;">
              <p style="margin: 0; font-size: 14px; color: #4b5563;">
                To ensure your customers don't face service interruptions or offline chatbots, we highly recommend upgrading your plan.
              </p>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://jcaesar.com'}/dashboard/settings/billing" 
               style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Upgrade My Plan
            </a>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #eaeaea; padding-top: 16px;">
              If you have any questions or need enterprise-grade resources, reply directly to this mail.
            </p>
          </div>
        `
      }).catch(err => {
        console.error("[LimitEmail] Failed to send limit email:", err);
      });
    }
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
