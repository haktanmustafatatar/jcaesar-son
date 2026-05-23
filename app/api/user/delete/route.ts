import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { otp } = await req.json();
    if (!otp) return NextResponse.json({ error: "OTP is required" }, { status: 400 });

    const settingKey = `OTP_DELETE_${userId}`;
    const setting = await prisma.adminSetting.findUnique({ where: { key: settingKey } });

    if (!setting) return NextResponse.json({ error: "OTP bulunamadı veya süresi doldu." }, { status: 400 });

    const data = setting.value as { otp: string; expiresAt: number };
    if (Date.now() > data.expiresAt) {
      await prisma.adminSetting.delete({ where: { key: settingKey } });
      return NextResponse.json({ error: "OTP süresi dolmuş." }, { status: 400 });
    }

    if (data.otp !== otp) {
      return NextResponse.json({ error: "Geçersiz OTP kodu." }, { status: 400 });
    }

    // OTP matches, delete user from DB
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }

    // Delete from Clerk
    const client = await clerkClient();
    await client.users.deleteUser(userId);

    // Clean up OTP setting
    await prisma.adminSetting.delete({ where: { key: settingKey } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete User Error:", error);
    return NextResponse.json({ error: error.message || "Hesap silinemedi." }, { status: 500 });
  }
}
