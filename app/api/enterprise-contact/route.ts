import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, phone, message } = await req.json();

    // 1. Save to Database using Raw SQL (Bulletproof if Prisma client is outdated)
    // This bypasses the need for prisma.lead property
    let leadId;
    try {
      const id = `lead_${Math.random().toString(36).substring(2, 11)}`;
      await prisma.$executeRaw`
        INSERT INTO "Lead" (id, name, email, company, phone, message, status, "createdAt", "updatedAt")
        VALUES (
          ${id}, 
          ${name}, 
          ${email}, 
          ${company}, 
          ${phone || null}, 
          ${message}, 
          'PENDING', 
          NOW(), 
          NOW()
        )
      `;
      leadId = id;
    } catch (dbError: any) {
      console.error("Raw SQL Error:", dbError);
      // Fallback: If SQL fails, try the standard way just in case
      try {
        const lead = await (prisma as any).lead.create({
          data: { name, email, company, phone, message }
        });
        leadId = lead.id;
      } catch (e) {
        throw new Error("Veritabanı kayıt hatası: " + dbError.message);
      }
    }

    // 2. Internal Notification (Optional/Safe)
    let adminEmails: string[] = [];
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPERADMIN"] } }
      });
      
      adminEmails = admins.map(a => a.email).filter(Boolean) as string[];

      if (admins.length > 0) {
        const notifyId = `notify_${Math.random().toString(36).substring(2, 11)}`;
        await prisma.$executeRaw`
          INSERT INTO "Notification" (id, "userId", title, message, type, "createdAt", read, link)
          VALUES (${notifyId}, ${admins[0].id}, 'Yeni Enterprise Talebi', ${company + " şirketinden yeni talep"}, 'SYSTEM', NOW(), false, '/admin/leads')
        `;
      }
    } catch (notifyError) {
      console.warn("Notification could not be created.");
    }

    // 3. Email (Optional fallback)
    try {
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpUser && smtpPass && !smtpUser.includes("BURAYA")) {
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
        
        const baseRecipients = [
          "kaiser@jcaesars.com"
        ];
        
        const recipientList = Array.from(new Set([...baseRecipients, ...adminEmails]));

        await transporter.sendMail({
          from: `"JCaesar Enterprise" <${process.env.EMAIL_FROM || smtpUser}>`,
          to: recipientList.join(", "),
          subject: `🚀 Yeni Kurumsal Talep: ${company}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #000;">Yeni Enterprise Başvurusu</h2>
              <hr/>
              <p><strong>Ad Soyad:</strong> ${name}</p>
              <p><strong>E-posta:</strong> ${email}</p>
              <p><strong>Şirket:</strong> ${company}</p>
              <p><strong>Telefon:</strong> ${phone || "Belirtilmedi"}</p>
              <p><strong>Mesaj:</strong></p>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                ${message}
              </div>
              <hr/>
              <p style="font-size: 12px; color: #888;">Bu e-posta JCaesar Enterprise iletişim formu aracılığıyla gönderilmiştir.</p>
            </div>
          `,
        });
      }
    } catch (e) {
      console.warn("Email failed but lead is saved in DB.", e);
    }

    return NextResponse.json({ success: true, leadId });
  } catch (error: any) {
    console.error("Lead API Error:", error);
    return NextResponse.json({ error: error.message || "İşlem tamamlanamadı." }, { status: 500 });
  }
}
