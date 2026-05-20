import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { status } = await req.json();
    const { id } = await params;

    try {
      await prisma.$executeRaw`UPDATE "Lead" SET status = ${status}, "updatedAt" = NOW() WHERE id = ${id}`;
    } catch (dbError) {
      // Fallback
      await (prisma as any).lead.update({
        where: { id },
        data: { status }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update Lead Error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
