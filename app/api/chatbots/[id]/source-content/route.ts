import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dataSourceId = searchParams.get("dataSourceId");

    if (!dataSourceId) {
      return NextResponse.json({ error: "dataSourceId is required" }, { status: 400 });
    }

    // Check if user owns this chatbot/datasource
    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id: dataSourceId,
        chatbotId: params.id,
        chatbot: { userId: (await prisma.user.findUnique({ where: { clerkId } }))?.id }
      },
      include: {
        documents: {
          select: {
            content: true,
            title: true
          }
        }
      }
    });

    if (!dataSource) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Combine all indexed chunks for this source
    const fullContent = dataSource.documents.map(doc => doc.content).join("\n\n");

    return NextResponse.json({
      name: dataSource.name,
      content: fullContent,
    });
  } catch (error: any) {
    console.error("Fetch source content error:", error);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}
