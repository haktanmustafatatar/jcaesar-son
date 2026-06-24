import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { google } from "googleapis";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { cancelToken: token },
      include: { chatbot: true }
    });

    if (!appointment) {
      return new Response("Randevu bulunamadı veya geçersiz iptal kodu.", { status: 404 });
    }

    if (appointment.status === "CANCELLED") {
      // Still display successful cancel screen to prevent confusion
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Randevu İptali Başarılı</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f9fafb; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); text-align: center; max-width: 400px; border: 1px solid #f3f4f6; }
            h1 { color: #ef4444; font-size: 24px; margin-bottom: 16px; font-weight: 800; }
            p { color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
            .button { display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2); }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Randevu Zaten İptal Edilmiş</h1>
            <p><strong>${appointment.title}</strong> başlıklı randevunuz daha önce iptal edilmiştir.</p>
            <a href="https://jcaesars.com" class="button">J.Caesar'a Git</a>
          </div>
        </body>
        </html>
      `;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // Update status in DB
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" }
    });

    // Delete Google Calendar event if it exists
    if (appointment.gcalEventId) {
      const channel = await prisma.channel.findFirst({
        where: { chatbotId: appointment.chatbotId, type: "GOOGLE_CALENDAR", status: "CONNECTED" }
      });

      if (channel) {
        try {
          const decrypted = decrypt(channel.config as string);
          const config = JSON.parse(decrypted);

          const oauth2Client = new google.auth.OAuth2(
            config.clientId || process.env.GOOGLE_CLIENT_ID,
            config.clientSecret || process.env.GOOGLE_CLIENT_SECRET
          );

          oauth2Client.setCredentials({
            refresh_token: config.refreshToken
          });

          const calendar = google.calendar({ version: "v3", auth: oauth2Client });
          await calendar.events.delete({
            calendarId: "primary",
            eventId: appointment.gcalEventId
          });
        } catch (err) {
          console.error("[GCalDelete] Failed to delete event:", err);
        }
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Randevu İptali Başarılı</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f9fafb; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); text-align: center; max-width: 400px; border: 1px solid #f3f4f6; }
          h1 { color: #ef4444; font-size: 24px; margin-bottom: 16px; font-weight: 800; }
          p { color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .button { display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2); }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Randevu İptal Edildi</h1>
          <p><strong>${appointment.title}</strong> başlıklı randevunuz başarıyla iptal edilmiştir. Google Takvim eşitlemesi kaldırılmıştır.</p>
          <a href="https://jcaesars.com" class="button">J.Caesar'a Git</a>
        </div>
      </body>
      </html>
    `;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    console.error("[BookingCancelAPI] Error:", error);
    return new Response("İşlem gerçekleştirilemedi.", { status: 500 });
  }
}
