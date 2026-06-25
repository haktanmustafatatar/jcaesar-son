import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addCrawlJob } from "@/lib/queue";

// POST /api/crawl - Yeni crawl işlemi başlat
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve internal user ID from Clerk ID
    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }


  // Look up user's active subscription to determine page limit
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE"
    },
    include: { plan: true }
  });

  // Determine page limit based on plan
  let defaultPageLimit = 100; // Starter default
  if (subscription?.plan) {
    if (subscription.plan.isEnterprise || subscription.plan.slug === "enterprise") {
      defaultPageLimit = 10000;
    } else if (subscription.plan.slug === "pro") {
      defaultPageLimit = 1000;
    }
  }

  const { chatbotId, url, type = "crawl-website", maxDepth = 3, limit = defaultPageLimit } = await req.json();

    // Chatbot'u kontrol et — user.id ile (clerkId değil!)
    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, userId: user.id },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Data source oluştur
    const dataSource = await prisma.dataSource.create({
      data: {
        chatbotId,
        type: "WEBSITE",
        name: url,
        url,
        status: "PENDING",
        crawlDepth: maxDepth,
      },
    });

    // Queue'ya crawl job ekle
    const job = await addCrawlJob({
      type,
      url,
      maxDepth,
      limit,
      chatbotId,
      dataSourceId: dataSource.id,
      userId: user.id,
    });

    // Local Development Bypass: Process immediately if on local
    if (process.env.NODE_ENV === "development") {
      const { crawlWebsite } = require("@/lib/crawler");
      console.log(`[CrawlBypass] Local environment detected. Auto-crawling: ${url}`);
      
      // Run in background
      (async () => {
        try {
          await crawlWebsite({
            url,
            maxDepth,
            limit,
            chatbotId,
            dataSourceId: dataSource.id,
            userId: user.id,
          });
          console.log(`[CrawlBypass] Successfully crawled: ${url}`);
        } catch (err) {
          console.error(`[CrawlBypass] Failed to crawl ${url}:`, err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      dataSourceId: dataSource.id,
      jobId: job.id,
      message: "Crawl job queued successfully",
    });
  } catch (error) {
    console.error("Crawl error:", error);
    return NextResponse.json(
      { error: "Failed to start crawl" },
      { status: 500 }
    );
  }
}

// GET /api/crawl/status - Crawl durumunu kontrol et
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const dataSourceId = searchParams.get("dataSourceId");

    if (!dataSourceId) {
      return NextResponse.json(
        { error: "dataSourceId required" },
        { status: 400 }
      );
    }

    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id: dataSourceId,
        chatbot: { userId: user.id },
      },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!dataSource) {
      return NextResponse.json(
        { error: "Data source not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: dataSource.id,
      status: dataSource.status,
      url: dataSource.url,
      pagesCount: dataSource.pagesCount,
      documentsCount: dataSource._count.documents,
      crawlStatus: dataSource.crawlStatus,
      lastCrawledAt: dataSource.lastCrawledAt,
      createdAt: dataSource.createdAt,
    });
  } catch (error) {
    console.error("Crawl status error:", error);
    return NextResponse.json(
      { error: "Failed to get crawl status" },
      { status: 500 }
    );
  }
}

// DELETE /api/crawl - Data source sil
export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const dataSourceId = searchParams.get("dataSourceId");

    if (!dataSourceId) {
      return NextResponse.json(
        { error: "dataSourceId required" },
        { status: 400 }
      );
    }

    // Data source'u sil (cascade ile dokümanlar da silinir)
    await prisma.dataSource.deleteMany({
      where: {
        id: dataSourceId,
        chatbot: { userId: user.id },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete crawl error:", error);
    return NextResponse.json(
      { error: "Failed to delete data source" },
      { status: 500 }
    );
  }
}
