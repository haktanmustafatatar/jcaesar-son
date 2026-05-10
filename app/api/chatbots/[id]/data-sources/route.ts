import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addCrawlJob } from "@/lib/queue";

// GET /api/chatbots/[id]/data-sources - List all data sources for a chatbot
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    const { id: chatbotId } = await params;

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { userId: true },
    });

    if (!chatbot || chatbot.userId !== user.id) {
      return NextResponse.json({ error: "Chatbot not found or access denied" }, { status: 404 });
    }

    const dataSources = await prisma.dataSource.findMany({
      where: { chatbotId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(dataSources);
  } catch (error) {
    console.error("Error fetching data sources:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/chatbots/[id]/data-sources - Add a new data source
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    const { id: chatbotId } = await params;

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { userId: true },
    });

    if (!chatbot || chatbot.userId !== user.id) {
      return NextResponse.json({ error: "Chatbot not found or access denied" }, { status: 404 });
    }

    const body = await req.json();
    const { type, name, content, fileUrl, fileType, fileSize, qnaList } = body;
    let { url } = body;

    if (!type || !name) {
      return NextResponse.json({ error: "Type and name are required" }, { status: 400 });
    }

    // Normalize URL — auto-add https:// if missing
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    // Create Data Source
    const dataSource = await prisma.dataSource.create({
      data: {
        chatbotId,
        type,
        name,
        url: url || null,
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
        status: "PENDING",
        settings: type === "TEXT" ? { content } : type === "QA" ? { qnaList } : null,
      },
    });

    // Trigger crawl job based on type
    if (type === "WEBSITE" && url) {
      await addCrawlJob({
        type: "crawl-website",
        url,
        chatbotId,
        dataSourceId: dataSource.id,
        userId: user.id,
        maxDepth: 3,
        limit: 100,
      });
    } else if (type === "FILE" && fileUrl) {
      await addCrawlJob({
        type: "process-document",
        fileUrl,
        fileType: fileType || "application/pdf",
        chatbotId,
        dataSourceId: dataSource.id,
        userId: user.id,
      });
    } else if (type === "TEXT" && content) {
      // TEXT sources must also go through the worker for embedding generation
      await addCrawlJob({
        type: "process-document",
        url: "text-input",
        fileUrl: "text-input",
        fileType: "text/plain",
        chatbotId,
        dataSourceId: dataSource.id,
        userId: user.id,
        content,
      } as any);
    } else if (type === "QA" && qnaList && qnaList.length > 0) {
      // Convert Q&A pairs to structured text for embedding
      const qaContent = qnaList
        .filter((qa: any) => qa.question?.trim())
        .map((qa: any) => `Question: ${qa.question.trim()}\nAnswer: ${qa.answer?.trim() || 'No answer provided.'}`)
        .join('\n\n---\n\n');
      
      if (qaContent) {
        await addCrawlJob({
          type: "process-document",
          url: "qna-input",
          fileUrl: "qna-input",
          fileType: "text/plain",
          chatbotId,
          dataSourceId: dataSource.id,
          userId: user.id,
          content: qaContent,
        } as any);
      }
    }

    return NextResponse.json(dataSource, { status: 201 });
  } catch (error) {
    console.error("Error creating data source:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
