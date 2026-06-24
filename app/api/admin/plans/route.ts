import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function isAuthorizedAdmin(clerkId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId } });
  return user && (user.role === "ADMIN" || user.role === "SUPERADMIN");
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAuthorizedAdmin(userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const plans = await prisma.plan.findMany({
      include: {
        _count: { select: { subscriptions: true } }
      },
      orderBy: { priceMonthly: "asc" }
    });

    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json({ error: "Failed to access billing ledger" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await isAuthorizedAdmin(userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/ /g, "-"),
        description: data.description,
        priceMonthly: Number(data.priceMonthly),
        priceYearly: Number(data.priceYearly),
        messageLimit: Number(data.messageLimit),
        chatbotLimit: Number(data.chatbotLimit),
        tokenLimit: Number(data.tokenLimit || 0),
        extraBotPrice: Number(data.extraBotPrice || 0),
        crawlLimit: Number(data.crawlLimit || 3),
        features: data.features || [],
        isPopular: !!data.isPopular,
        isEnterprise: !!data.isEnterprise,
        stripePriceId: data.stripePriceId
      }
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Plan creation error:", error);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await isAuthorizedAdmin(userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, ...data } = await req.json();
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priceMonthly !== undefined) updateData.priceMonthly = Number(data.priceMonthly);
    if (data.priceYearly !== undefined) updateData.priceYearly = Number(data.priceYearly);
    if (data.messageLimit !== undefined) updateData.messageLimit = Number(data.messageLimit);
    if (data.chatbotLimit !== undefined) updateData.chatbotLimit = Number(data.chatbotLimit);
    if (data.tokenLimit !== undefined) updateData.tokenLimit = Number(data.tokenLimit);
    if (data.extraBotPrice !== undefined) updateData.extraBotPrice = Number(data.extraBotPrice);
    if (data.crawlLimit !== undefined) updateData.crawlLimit = Number(data.crawlLimit);
    if (data.features !== undefined) updateData.features = data.features;
    if (data.isPopular !== undefined) updateData.isPopular = data.isPopular;
    if (data.isEnterprise !== undefined) updateData.isEnterprise = data.isEnterprise;
    if (data.stripePriceId !== undefined) updateData.stripePriceId = data.stripePriceId;

    const updated = await prisma.plan.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Plan update error:", error);
    return NextResponse.json({ error: "Failed to reconfigure plan matrix" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await isAuthorizedAdmin(userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await prisma.plan.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
