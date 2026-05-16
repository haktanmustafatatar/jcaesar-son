import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Use raw SQL to bypass Prisma model cache issues
    let leads: any[] = [];
    try {
      leads = await prisma.$queryRaw`SELECT * FROM "Lead" ORDER BY "createdAt" DESC`;
    } catch (dbError) {
      // Fallback if client is actually updated
      leads = await (prisma as any).lead.findMany({
        orderBy: { createdAt: "desc" }
      });
    }

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Fetch Leads Error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
