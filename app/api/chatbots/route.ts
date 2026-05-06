import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addCrawlJob } from "@/lib/queue";

// GET /api/chatbots - List all chatbots for the current user
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
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
      where: { clerkId }
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
        primaryColor: primaryColor || "#e25b31",
        avatar: avatar || null,
        language: language || "en",
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
                create: (links || []).map((link: string) => ({
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
        if (ds.type === "WEBSITE" && websiteUrl) {
          // If we have specific links, we should probably pass them, 
          // but for now the crawler handles discovery or takes the root.
          await addCrawlJob({
            type: "crawl-website",
            url: websiteUrl,
            urls: links, // Pass specific links if provided
            chatbotId: chatbot.id,
            dataSourceId: ds.id,
            userId,
            maxDepth: maxDepth || 3,
            limit: crawlLimit || 100,
          });
        } else if (ds.type === "TEXT" && rawText) {
          await addCrawlJob({
            type: "process-document",
            fileUrl: "text-input",
            fileType: "text/plain",
            chatbotId: chatbot.id,
            dataSourceId: ds.id,
            userId,
            content: rawText
          } as any);
        } else if (ds.type === "QNA" && qnaList) {
          const qnaContent = qnaList
            .filter((qa: any) => qa.question?.trim())
            .map((qa: any) => `Question: ${qa.question}\nAnswer: ${qa.answer}`)
            .join("\n\n");

          await addCrawlJob({
            type: "process-document",
            fileUrl: "qna-input",
            fileType: "text/plain",
            chatbotId: chatbot.id,
            dataSourceId: ds.id,
            userId,
            content: qnaContent
          } as any);
        }
      }
    } catch (jobError) {
      console.error("[ChatbotAPI] Failed to add jobs to queue:", jobError);
      // We don't throw here to avoid 500 if the chatbot is already created
    }

    return NextResponse.json(chatbot, { status: 201 });
  } catch (error: any) {
    console.error("Error creating chatbot:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create chatbot" },
      { status: 500 }
    );
  }
}
