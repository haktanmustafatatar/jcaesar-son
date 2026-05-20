import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addCrawlJob } from "@/lib/queue";
import { createAuditLog } from "@/lib/audit";

// GET /api/chatbots - List all chatbots for the current user
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    console.log("[ChatbotAPI GET] clerkId from auth():", clerkId);
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId as string }
    });
    
    console.log("[ChatbotAPI GET] user found in DB:", !!user, user?.id);

    if (!user) {
      // Auto-sync missing user if possible? Wait, we'll just log it for now
      return NextResponse.json([]);
    }

    const chatbots = await prisma.chatbot.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { conversations: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    console.log("[ChatbotAPI GET] chatbots found:", chatbots.length);

    return NextResponse.json(chatbots);
  } catch (error) {
    console.error("Error fetching chatbots:", error);
    return NextResponse.json(
      { error: "Failed to fetch chatbots" },
      { status: 500 }
    );
  }
}

// POST /api/chatbots - Create a new chatbot
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists in our DB (Auto-sync if missing)
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkId as string }
    });
    
    if (!user) {
      console.log(`[ChatbotAPI] User ${clerkId} not found by clerkId, checking by email...`);
      const { currentUser } = await import("@clerk/nextjs/server");
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress || "";
      
      if (email) {
        user = await prisma.user.findUnique({
          where: { email }
        });
      }

      if (user) {
        console.log(`[ChatbotAPI] Found user by email ${email}, linking clerkId ${clerkId}...`);
        user = await prisma.user.update({
          where: { id: user.id },
          data: { clerkId }
        });
      } else {
        console.log(`[ChatbotAPI] Creating new user for ${clerkId}...`);
        user = await prisma.user.create({
          data: {
            clerkId,
            email,
            name: `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim() || "User",
          }
        });
      }
    }

    const userId = user.id;

    // Plan Gating & Chatbot Limit Checks
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "TRIALING"] }
      },
      include: {
        plan: true
      }
    });

    const isBypassed = user.role === "ADMIN" || user.role === "SUPERADMIN";

    if (!isBypassed) {
      if (!activeSub) {
        return NextResponse.json({ error: "Active subscription required to forge AI Chatbots." }, { status: 403 });
      }

      const currentChatbotCount = await prisma.chatbot.count({
        where: { userId }
      });

      const limit = activeSub.plan.chatbotLimit;
      if (currentChatbotCount >= limit) {
        return NextResponse.json({ 
          error: `You have reached the maximum of ${limit} chatbots allowed on the ${activeSub.plan.name} plan. Please upgrade your subscription to create more agents.` 
        }, { status: 403 });
      }
    }

    const body = await req.json();
    const {
      name,
      description,
      model,
      temperature,
      businessContext,
      systemPrompt,
      welcomeMessage,
      primaryColor,
      avatar,
      language,
      fontFamily,
      fontSize,
      borderRadius,
      widgetShadow,
      userMessageColor,
      assistantMessageColor,
      websiteUrl,
      rawText,
      qnaList,
      suggestedMessages,
      links,
      crawlSchedule,
      maxDepth,
      crawlLimit,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate unique slug
    const slug = `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const chatbot = await prisma.chatbot.create({
      data: {
        name,
        slug,
        description,
        model: model || "gpt-4o",
        temperature: temperature || 0.7,
        businessContext: businessContext || null,
        systemPrompt: systemPrompt || "You are a helpful assistant.",
        welcomeMessage: welcomeMessage || "Hi! How can I help you today?",
        primaryColor: primaryColor || "#000000",
        avatar: avatar || null,
        language: language || "tr",
        fontFamily: fontFamily || "Inter, sans-serif",
        fontSize: fontSize || "14px",
        borderRadius: borderRadius || "24px",
        widgetShadow: widgetShadow || "0 20px 40px -8px rgba(0,0,0,0.15)",
        userMessageColor: userMessageColor || "#000000",
        assistantMessageColor: assistantMessageColor || "#f4f4f5",
        userId,
        status: "TRAINING",
        // Nested creation of DataSources
        dataSources: {
          create: [
            ...(websiteUrl ? [{
              type: "WEBSITE" as any,
              name: "Website Source",
              url: websiteUrl,
              status: "PENDING" as any,
              crawlDepth: maxDepth || 3,
              crawlSchedule: crawlSchedule || "never",
              urls: {
                create: (Array.isArray(links) ? [...new Set(links)] : []).map((link: any) => ({
                  url: link,
                  status: "PENDING" as any,
                }))
              }
            }] : []),
            ...(rawText ? [{
              type: "TEXT" as any,
              name: "Text Source",
              status: "PENDING" as any,
            }] : []),
            ...(qnaList && Array.isArray(qnaList) && qnaList.filter((qa: any) => qa.question?.trim()).length > 0 ? [{
              type: "QNA" as any,
              name: "Q&A Source",
              status: "PENDING" as any,
            }] : []),
          ]
        },
        suggestedQuestions: {
          create: (suggestedMessages || []).filter((m: any) => m && typeof m === 'string' && m.trim() !== "").map((m: string, i: number) => ({
            question: m,
            order: i,
          }))
        }
      },
      include: {
        dataSources: true,
      }
    });

    // Queue jobs for all sources
    try {
      const createdDataSources = (chatbot as any).dataSources;
      
      for (const ds of createdDataSources) {
        // Shared local bypass logic
        const isDev = process.env.NODE_ENV === "development";

        if (ds.type === "WEBSITE" && websiteUrl) {
          await addCrawlJob({
            type: "crawl-website",
            url: websiteUrl,
            urls: links,
            chatbotId: chatbot.id,
            dataSourceId: ds.id,
            userId,
            maxDepth: maxDepth || 3,
            limit: crawlLimit || 100,
          });

          if (isDev) {
            const { crawlWebsite } = require("@/lib/crawler");
            (async () => {
              try {
                await crawlWebsite({ url: websiteUrl, maxDepth: maxDepth || 3, limit: crawlLimit || 100, chatbotId: chatbot.id, dataSourceId: ds.id, userId });
              } catch (e) { console.error("[BypassError]", e); }
            })();
          }
        } else if (ds.type === "TEXT" && rawText) {
          const jobData = {
            type: "process-document" as any,
            fileUrl: "text-input",
            fileType: "text/plain",
            chatbotId: chatbot.id,
            dataSourceId: ds.id,
            userId,
            content: rawText
          };
          await addCrawlJob(jobData);

          if (isDev) {
            const { processDocument } = require("@/lib/crawler");
            (async () => {
              try {
                await processDocument({ fileUrl: "text-input", fileType: "text/plain", chatbotId: chatbot.id, dataSourceId: ds.id, content: rawText });
              } catch (e) { console.error("[BypassError]", e); }
            })();
          }
        } else if (ds.type === "QNA" && qnaList) {
          const qnaContent = qnaList
            .filter((qa: any) => qa.question?.trim())
            .map((qa: any) => `Question: ${qa.question}\nAnswer: ${qa.answer}`)
            .join("\n\n");

          const jobData = {
            type: "process-document" as any,
            fileUrl: "qna-input",
            fileType: "text/plain",
            chatbotId: chatbot.id,
            dataSourceId: ds.id,
            userId,
            content: qnaContent
          };
          await addCrawlJob(jobData);

          if (isDev) {
            const { processDocument } = require("@/lib/crawler");
            (async () => {
              try {
                await processDocument({ fileUrl: "qna-input", fileType: "text/plain", chatbotId: chatbot.id, dataSourceId: ds.id, content: qnaContent });
              } catch (e) { console.error("[BypassError]", e); }
            })();
          }
        }
      }
    } catch (jobError) {
      console.error("[ChatbotAPI] Failed to add jobs to queue:", jobError);
      // We don't throw here to avoid 500 if the chatbot is already created
    }

    await createAuditLog({
      userId: user?.id,
      userEmail: user?.email,
      action: "CREATE_CHATBOT",
      entityType: "CHATBOT",
      entityId: chatbot.id,
      metadata: { name: chatbot.name, slug: chatbot.slug }
    });

    return NextResponse.json(chatbot, { status: 201 });
  } catch (error: any) {
    console.error("[ChatbotAPI] Detailed Error:", error);
    
    // SEND ADMIN ALERT ON CRITICAL FAILURE
    const { sendAdminAlert } = await import("@/lib/email");
    await sendAdminAlert(
      "Agent Creation Failed", 
      "An error occurred while a user was trying to forge a new AI Agent.", 
      { errorMessage: error?.message, stack: error?.stack }
    ).catch(() => {});

    return NextResponse.json(
      { 
        error: error?.message || "Failed to create chatbot",
        details: error?.stack,
        code: error?.code,
        meta: error?.meta
      },
      { status: 500 }
    );
  }
}
