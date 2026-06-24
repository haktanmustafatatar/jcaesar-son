import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function verifyAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) return null;
  return user;
}

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const settings = await prisma.adminSetting.findMany();
    const result: Record<string, any> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AdminSettings] GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      await prisma.adminSetting.upsert({
        where: { key },
        update: { value: value as any },
        create: { key, value: value as any },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_SETTINGS_UPDATE",
        entityType: "AdminSetting",
        userId: admin.id,
        metadata: { keys: Object.keys(body) },
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminSettings] PUT error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
