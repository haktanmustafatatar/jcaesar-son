import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || !user.email) {
      return NextResponse.json({ error: "User or email not found" }, { status: 404 });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save to AdminSetting
    const settingKey = `OTP_DELETE_${userId}`;
    await prisma.adminSetting.upsert({
      where: { key: settingKey },
      update: { value: { otp, expiresAt } },
      create: { key: settingKey, value: { otp, expiresAt } },
    });

    // Send email
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass || smtpUser.includes("BURAYA")) {
      console.warn("SMTP not configured, OTP is:", otp);
      // For development/testing when SMTP is broken, we could return it, but let's just log it.
      // return NextResponse.json({ success: true, message: "SMTP not configured. Check console." });
    } else {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.hostinger.com",
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
      });

      await transporter.sendMail({
        from: `"JCaesar Security" <${process.env.EMAIL_FROM || smtpUser}>`,
        to: user.email,
        subject: "Hesap Silme Onay Kodu (OTP)",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #000;">Hesap Silme Talebi</h2>
            <p>Merhaba ${user.name || "Kullanıcı"},</p>
            <p>J.Caesar hesabınızı silmek için bir talepte bulundunuz. Bu işlemi onaylamak için aşağıdaki kodu kullanın:</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px;">
              ${otp}
            </div>
            <p style="margin-top: 20px; font-size: 14px;">Bu kod 10 dakika boyunca geçerlidir. Eğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayın.</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete OTP Error:", error);
    return NextResponse.json({ error: error.message || "Bilinmeyen bir hata oluştu" }, { status: 500 });
  }
}
