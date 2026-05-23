import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addCrawlJob } from "@/lib/queue";

/**
 * GET /api/knowledge/[id] — Get a single knowledge source
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    const source = await prisma.knowledgeSource.findUnique({
      where: { id },
      include: {
        documents: {
          select: { id: true, title: true, url: true, createdAt: true },
        },
        chatbot: {
          select: { userId: true },
        },
      },
    });

    if (!source || source.chatbot.userId !== user?.id) {
      return NextResponse.json({ error: "Knowledge source not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch (error) {
    console.error("[KnowledgeAPI] GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT /api/knowledge/[id] — Update a knowledge source (re-crawl or rename)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { name, url, recrawl } = body;

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    const source = await prisma.knowledgeSource.findUnique({ 
      where: { id },
      include: { chatbot: { select: { userId: true } } }
    });

    if (!source || source.chatbot.userId !== user?.id) {
      return NextResponse.json({ error: "Knowledge source not found or unauthorized" }, { status: 404 });
    }

    // Update metadata
    const updatedSource = await prisma.knowledgeSource.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(url ? { url } : {}),
      },
    });

    // Re-crawl if requested
    if (recrawl && source.type === "WEBSITE" && (url || source.url)) {
      // Delete existing documents for this source
      await prisma.document.deleteMany({
        where: { knowledgeSourceId: id },
      });

      // Reset status
      await prisma.knowledgeSource.update({
        where: { id },
        data: { status: "PENDING" },
      });

      // Queue new crawl job
      await addCrawlJob({
        type: "crawl-website",
        url: url || source.url!,
        chatbotId: source.chatbotId,
        knowledgeSourceId: id,
        userId,
      });
    }

    return NextResponse.json(updatedSource);
  } catch (error) {
    console.error("[KnowledgeAPI] PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/knowledge/[id] — Delete a knowledge source and its documents
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    const source = await prisma.knowledgeSource.findUnique({ 
      where: { id },
      include: { chatbot: { select: { userId: true } } }
    });

    if (!source || source.chatbot.userId !== user?.id) {
      return NextResponse.json({ error: "Knowledge source not found or unauthorized" }, { status: 404 });
    }

    // Documents will be cascade deleted due to onDelete: Cascade in schema
    await prisma.knowledgeSource.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[KnowledgeAPI] DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
