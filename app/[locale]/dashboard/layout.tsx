import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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

  // Fetch or auto-sync user with active subscription
  let user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      subscriptions: {
        where: {
          status: { in: ["ACTIVE", "TRIALING"] }
        }
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
          where: {
            status: { in: ["ACTIVE", "TRIALING"] }
          }
        }
      }
    });
  }

  const isBypassed = user.role === "ADMIN" || user.role === "SUPERADMIN";
  const hasActiveSubscription = user.subscriptions && user.subscriptions.length > 0;

  if (!isBypassed && !hasActiveSubscription) {
    redirect(`/${locale}/pricing`);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardSidebar />
      <div className="lg:ml-72">
        <DashboardHeader />
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
