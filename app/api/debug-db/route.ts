import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import IORedis from "ioredis";
import { Queue } from "bullmq";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const chatbots = await prisma.chatbot.findMany({
      include: {
        channels: true,
        dataSources: {
          include: {
            documents: {
              take: 5
            }
          }
        }
      }
    });

    // Let's also search for documents containing FINACHI or TRINITY
    const docs = await prisma.document.findMany({
      where: {
        OR: [
          { content: { contains: "FINACHI", mode: "insensitive" } },
          { content: { contains: "TRINITY", mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        title: true,
        url: true,
        content: true
      }
    });

    // Test fetch Shopify JS API from droplet IP
    let dropletShopifyFetch = null;
    try {
      const res = await fetch("https://vareno.com.tr/products/finachi-trench-coat.js");
      if (res.ok) {
        const data = await res.json();
        dropletShopifyFetch = {
          price: data.price,
          price_min: data.price_min,
          compare_at_price: data.compare_at_price,
          currency: data.currency || "TRY"
        };
      } else {
        dropletShopifyFetch = { error: `Failed with status: ${res.status}` };
      }
    } catch (err: any) {
      dropletShopifyFetch = { error: err.message };
    }

    // Test active Shopify Admin API call using connected credentials
    let adminApiTest = null;
    try {
      const targetChatbot = chatbots.find(c => c.id === "cmpdag8k3000lnh0ibhwozxgd");
      const shopifyCh = targetChatbot?.channels.find(ch => ch.type === "SHOPIFY");
      if (shopifyCh) {
        const config = (shopifyCh as any).config || {};
        const { shopDomain, accessToken } = config;
        
        // Fetch all products (up to 250) to see what prices Shopify Admin API returns
        const url = `https://${shopDomain}/admin/api/2024-04/products.json?limit=250`;
        const response = await fetch(url, {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          const finachiProduct = data.products.find((p: any) => p.title.toLowerCase().includes("finachi"));
          adminApiTest = {
            success: true,
            totalProducts: data.products.length,
            allProductTitles: data.products.map((p: any) => p.title),
            finachiDetails: finachiProduct ? {
              title: finachiProduct.title,
              variants: finachiProduct.variants.map((v: any) => ({
                id: v.id,
                title: v.title,
                price: v.price,
                compare_at_price: v.compare_at_price,
                taxable: v.taxable
              }))
            } : null
          };
        } else {
          adminApiTest = { error: `Admin API failed: ${response.status}`, body: await response.text() };
        }
      } else {
        adminApiTest = { error: "No Shopify channel connected for target chatbot." };
      }
    } catch (err: any) {
      adminApiTest = { error: err.message };
    }

    // Diagnostics for Instagram Page Token Permissions
    let instagramTokenTest = null;
    try {
      const targetChatbot = chatbots.find(c => c.id === "cmpdag8k3000lnh0ibhwozxgd");
      const igCh = targetChatbot?.channels.find(ch => ch.type === "INSTAGRAM");
      if (igCh) {
        const config = (igCh as any).config || {};
        const { accessToken, pageId, instagramId } = config;
        
        if (accessToken) {
          const pageUrl = `https://graph.facebook.com/v22.0/${pageId}?fields=name,username,instagram_business_account&access_token=${accessToken}`;
          const pageRes = await fetch(pageUrl);
          const pageData = pageRes.ok ? await pageRes.json() : { error: await pageRes.text() };

          const subsUrl = `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps?access_token=${accessToken}`;
          const subsRes = await fetch(subsUrl);
          const subsData = subsRes.ok ? await subsRes.json() : { error: await subsRes.text() };

          instagramTokenTest = {
            success: true,
            pageId,
            instagramId,
            subscribedApps: subsData,
            pageDetails: pageData
          };
        } else {
          instagramTokenTest = { error: "No access token in Instagram channel config." };
        }
      } else {
        instagramTokenTest = { error: "No Instagram channel connected for target chatbot." };
      }
    } catch (err: any) {
      instagramTokenTest = { error: err.message };
    }

    // BullMQ Queue Status
    let queueStatus = null;
    try {
      const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      const channelQueue = new Queue("channel", { connection: redisConnection });
      const jobCounts = await channelQueue.getJobCounts();
      const failedJobs = await channelQueue.getFailed(0, 10);
      queueStatus = {
        jobCounts,
        failed: failedJobs.map(j => ({
          id: j.id,
          name: j.name,
          data: j.data,
          failedReason: j.failedReason,
          stacktrace: j.stacktrace?.slice(0, 3)
        }))
      };
      await redisConnection.quit();
    } catch (err: any) {
      queueStatus = { error: err.message };
    }

    // Last 10 Notifications
    let notifications: any[] = [];
    try {
      notifications = await prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 10
      });
    } catch (err: any) {
      console.error("Failed to query notifications:", err);
    }

    // Query last 10 conversations to see which chatbot is answering
    const conversations = await prisma.conversation.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 2
        }
      }
    });

    return NextResponse.json({
      success: true,
      dropletShopifyFetch,
      adminApiTest,
      instagramTokenTest,
      queueStatus,
      notifications,
      conversations: conversations.map(conv => ({
        id: conv.id,
        chatbotId: conv.chatbotId,
        channel: conv.channel,
        channelUserId: conv.channelUserId,
        createdAt: conv.createdAt,
        messages: conv.messages.map(m => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt
        }))
      })),
      chatbots: chatbots.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        channels: c.channels.map(ch => ({
          id: ch.id,
          type: ch.type,
          status: ch.status,
          name: ch.name,
          phoneNumberId: ch.phoneNumberId,
          configKeys: Object.keys(ch.config as any || {}),
          config: ch.config
        })),
        dataSources: c.dataSources.map(ds => ({
          id: ds.id,
          name: ds.name,
          type: ds.type,
          status: ds.status,
          documentsCount: ds.documents.length
        }))
      })),
      finachiTrinityDocs: docs.map(d => ({
        id: d.id,
        title: d.title,
        url: d.url,
        contentSnippet: d.content.substring(0, 500)
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
