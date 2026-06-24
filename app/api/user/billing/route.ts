import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        organization: {
          include: {
            plan: true,
            chatbots: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const org = user.organization;
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Calculate message usage
    const chatbotIds = org.chatbots.map(c => c.id);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const messageCount = await prisma.tokenUsage.count({
      where: {
        chatbotId: { in: chatbotIds },
        createdAt: { gte: startOfMonth }
      }
    });

    // Fetch subscription details
    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { plan: true }
    });

    // Fetch invoices from Stripe
    let invoices: any[] = [];
    const customerId = user.stripeCustomerId || subscription?.stripeCustomerId;
    if (customerId) {
      try {
        const stripeInvoices = await stripe.invoices.list({
          customer: customerId,
          limit: 5,
        });
        invoices = stripeInvoices.data.map(inv => ({
          id: inv.id,
          number: inv.number,
          hostedInvoiceUrl: inv.hosted_invoice_url,
          invoicePdf: inv.invoice_pdf,
          status: inv.status,
          date: new Date(inv.created * 1000).toISOString(),
          total: inv.total / 100,
          currency: inv.currency.toUpperCase(),
        }));
      } catch (err) {
        console.error("[BillingAPI] Error fetching Stripe invoices:", err);
      }
    }

    const effectiveMessageLimit = org.messageLimitOverride ?? org.plan.messageLimit;
    const effectiveTokenLimit = org.tokenLimitOverride ?? org.plan.tokenLimit;

    return NextResponse.json({
      plan: {
        id: org.plan.id,
        name: org.plan.name,
        slug: org.plan.slug,
        description: org.plan.description,
        priceMonthly: org.plan.priceMonthly,
        priceYearly: org.plan.priceYearly,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : null,
      limits: {
        messageLimit: effectiveMessageLimit,
        tokenLimit: effectiveTokenLimit,
        chatbotLimit: org.plan.chatbotLimit,
        messageLimitOverride: org.messageLimitOverride,
        tokenLimitOverride: org.tokenLimitOverride,
        messageUsage: messageCount,
        chatbotCount: org.chatbots.length,
      },
      invoices,
    });
  } catch (error) {
    console.error("[BillingAPI] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
