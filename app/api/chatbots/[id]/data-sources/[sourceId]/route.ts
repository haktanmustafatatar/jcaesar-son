import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/chatbots/[id]/data-sources/[sourceId] - Update a data source
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    const { id: chatbotId, sourceId } = await params;

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { userId: true, id: true },
    });

    if (!chatbot || chatbot.userId !== user.id) {
      return NextResponse.json({ error: "Chatbot not found or access denied" }, { status: 404 });
    }

    const body = await req.json();
    const { name, content, qnaList } = body;

    const dataSource = await prisma.dataSource.findUnique({
      where: { id: sourceId },
    });

    if (!dataSource || dataSource.chatbotId !== chatbotId) {
       return NextResponse.json({ error: "Data source not found" }, { status: 404 });
    }

    // 1. Update DataSource
    const updatedSource = await prisma.dataSource.update({
      where: { id: sourceId },
      data: {
        name: name || dataSource.name,
        status: "PENDING",
        settings: dataSource.type === "TEXT" ? { content } : dataSource.type === "QA" ? { qnaList } : dataSource.settings,
      },
    });

    // 2. Delete old documents to prevent duplicates
    await prisma.document.deleteMany({
      where: { dataSourceId: sourceId },
    });

    // 3. Re-trigger job
    const { addCrawlJob } = await import("@/lib/queue");
    
    if (dataSource.type === "TEXT" && content) {
      await addCrawlJob({
        type: "process-document",
        url: "text-input",
        fileUrl: "text-input",
        fileType: "text/plain",
        chatbotId,
        dataSourceId: sourceId,
        userId: user.id,
        content,
      } as any);
    } else if (dataSource.type === "QA" && qnaList) {
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
          dataSourceId: sourceId,
          userId: user.id,
          content: qaContent,
        } as any);
      }
    }

    return NextResponse.json(updatedSource);
  } catch (error) {
    console.error("Error updating data source:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/chatbots/[id]/data-sources/[sourceId] - Delete a data source
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    const { id: chatbotId, sourceId } = await params;

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

    const dataSource = await prisma.dataSource.findUnique({
      where: { id: sourceId },
    });

    if (!dataSource || dataSource.chatbotId !== chatbotId) {
       return NextResponse.json({ error: "Data source not found" }, { status: 404 });
    }

    // Delete cascading to documents (Database handles this via onDelete: Cascade)
    await prisma.dataSource.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({ message: "Data source deleted" });
  } catch (error) {
    console.error("Error deleting data source:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
