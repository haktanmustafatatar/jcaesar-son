import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Stripe from "stripe";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({
  children,
  params
}: LayoutProps) {
  const { locale } = await params;
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect(`/${locale}/sign-in`);
  }

  // Fetch or auto-create user
  let user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        include: { plan: true }
      }
    }
  });

  if (!user) {
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress || "";

    user = await prisma.user.upsert({
      where: { clerkId },
      update: {
        email,
        name: `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim() || "User",
        avatar: clerkUser?.imageUrl,
      },
      create: {
        clerkId,
        email,
        name: `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim() || "User",
        avatar: clerkUser?.imageUrl,
        role: "USER",
      },
      include: {
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIALING"] } },
          include: { plan: true }
        }
      }
    });
  }

  const isBypassed = user.role === "ADMIN" || user.role === "SUPERADMIN";
  let hasActiveSubscription = user.subscriptions && user.subscriptions.length > 0;

  // If no active subscription in DB, try to sync from Stripe directly
  // This makes payment work even without a configured Stripe webhook
  if (!isBypassed && !hasActiveSubscription) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-12-18.acacia" as any,
      });

      // Look for a completed checkout session for this user
      const sessions = await stripe.checkout.sessions.list({
        limit: 10,
        expand: ["data.subscription"],
      });

      const completedSession = sessions.data.find(
        (s) =>
          s.status === "complete" &&
          s.mode === "subscription" &&
          (s.customer_email === user!.email || s.metadata?.userId === user!.id)
      );

      if (completedSession) {
        const planId = completedSession.metadata?.planId;
        const stripeCustomerId = completedSession.customer as string;
        const sub = completedSession.subscription;
        const stripeSubscriptionId = typeof sub === "string" ? sub : (sub as Stripe.Subscription)?.id;

        if (planId && stripeSubscriptionId) {
          // Avoid duplicate subscriptions
          const existing = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId },
          });

          if (!existing) {
            await prisma.subscription.create({
              data: {
                userId: user.id,
                planId,
                status: "ACTIVE",
                stripeCustomerId,
                stripeSubscriptionId,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
          }

          // Save stripeCustomerId on user for future checkouts
          if (stripeCustomerId && !user.stripeCustomerId) {
            await prisma.user.update({
              where: { id: user.id },
              data: { stripeCustomerId },
            });
          }

          hasActiveSubscription = true;
        }
      }
    } catch (err) {
      console.error("[DashboardLayout] Stripe sync error:", err);
    }
  }

  if (!isBypassed && !hasActiveSubscription) {
    redirect(`/${locale}/pricing`);
  }

  let planName = "Free Plan";
  if (hasActiveSubscription && (user.subscriptions as any)[0]?.plan?.name) {
    planName = (user.subscriptions as any)[0].plan.name;
  } else if (isBypassed) {
    planName = "Admin Plan";
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardSidebar planName={planName} />
      <div className="lg:ml-72">
        <DashboardHeader />
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
