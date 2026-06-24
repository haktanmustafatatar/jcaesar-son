import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { google } from "googleapis";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";
import { rateLimit } from "@/lib/ratelimit";

// Add GCal event
async function createGoogleCalendarEvent(chatbotId: string, appointment: any, contact: any) {
  const channel = await prisma.channel.findFirst({
    where: { chatbotId, type: "GOOGLE_CALENDAR", status: "CONNECTED" }
  });

  if (!channel) return null;

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
    
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: appointment.title,
        description: `J.Caesar Self-Booking Appointment.\nClient Name: ${contact.name}\nEmail: ${contact.email}\nPhone: ${contact.phone || "N/A"}\nNotes: ${appointment.description || ""}`,
        start: {
          dateTime: new Date(appointment.startTime).toISOString(),
        },
        end: {
          dateTime: new Date(appointment.endTime).toISOString(),
        },
      },
    });

    return response.data.id;
  } catch (err) {
    console.error("[GCalCreate] Failed to write event:", err);
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    const ip = req.headers.get("x-forwarded-for") || "anonymous";

    // Rate Limit: Max 3 booking requests per minute per IP to prevent spam
    const { success } = await rateLimit(`booking-create:${ip}`, 3, 60);
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }

    const body = await req.json();
    const { name, email, phone, startTime: startTimeStr, notes } = body;

    if (!name || !email || !startTimeStr) {
      return NextResponse.json({ error: "Name, email, and startTime are required" }, { status: 400 });
    }

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId },
      include: { user: true }
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Load schedule setting to determine slot duration and capacity
    let schedule = await prisma.scheduleSetting.findUnique({
      where: { chatbotId }
    });

    if (!schedule) {
      schedule = {
        id: "default",
        chatbotId,
        workingDays: "1,2,3,4,5",
        startHour: "09:00",
        endHour: "18:00",
        slotDuration: 30,
        staffCapacity: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    const startTime = new Date(startTimeStr);
    const endTime = new Date(startTime.getTime() + schedule.slotDuration * 60 * 1000);

    // Collision Check: Local appointments
    const localOverlaps = await prisma.appointment.count({
      where: {
        chatbotId,
        status: { not: "CANCELLED" },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });

    // Collision Check: GCal events (if connected)
    const channel = await prisma.channel.findFirst({
      where: { chatbotId, type: "GOOGLE_CALENDAR", status: "CONNECTED" }
    });

    let gcalOverlaps = 0;
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
        
        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          singleEvents: true
        });

        gcalOverlaps = (response.data.items || []).length;
      } catch (err) {
        console.error("[GCalCollisionCheck] Failed to check:", err);
      }
    }

    const totalOverlaps = localOverlaps + gcalOverlaps;

    if (totalOverlaps >= schedule.staffCapacity) {
      return NextResponse.json(
        { error: "The selected time slot is already fully booked. Please choose another slot." },
        { status: 409 }
      );
    }

    // Find or create CrmContact
    let contact = await prisma.crmContact.findFirst({
      where: { chatbotId, email }
    });

    if (!contact) {
      contact = await prisma.crmContact.create({
        data: {
          chatbotId,
          name,
          email,
          phone,
          status: "NEW",
          sourceChannel: "BOOKING"
        }
      });
    } else {
      // Update contact name/phone if not set
      await prisma.crmContact.update({
        where: { id: contact.id },
        data: {
          name: contact.name || name,
          phone: contact.phone || phone,
          sourceChannel: "BOOKING"
        }
      });
    }

    const cancelToken = crypto.randomUUID();

    // Create local Appointment
    const appointment = await prisma.appointment.create({
      data: {
        chatbotId,
        contactId: contact.id,
        title: `Randevu: ${name}`,
        description: notes || "Public booking session.",
        startTime,
        endTime,
        status: "SCHEDULED",
        cancelToken
      }
    });

    // Write to Google Calendar if connected
    let gcalEventId = null;
    if (channel) {
      gcalEventId = await createGoogleCalendarEvent(chatbotId, appointment, contact);
      if (gcalEventId) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { gcalEventId }
        });
      }
    }

    // Send confirmation email
    const cancelLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/booking/cancel/${cancelToken}`;
    
    await sendEmail({
      to: email,
      subject: `Randevunuz Onaylandı: J.Caesar Booking`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 600px; border: 1px solid #eaeaea; border-radius: 16px;">
          <h2 style="color: #4f46e5; margin-bottom: 16px;">Randevunuz Başarıyla Oluşturuldu</h2>
          <p style="font-size: 15px; color: #374151; line-height: 1.6;">
            Merhaba <strong>${name}</strong>, randevu talebiniz başarıyla alınmış ve onaylanmıştır.
          </p>
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #4f46e5;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">
              <strong>Tarih:</strong> ${startTime.toLocaleDateString("tr-TR")}
            </p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">
              <strong>Saat:</strong> ${startTime.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p style="margin: 0; font-size: 14px; color: #4b5563;">
              <strong>Hizmet/Bot:</strong> ${chatbot.name}
            </p>
          </div>
          <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin-bottom: 24px;">
            Eğer randevu planınız değişirse, aşağıdaki butona tıklayarak randevunuzu anında iptal edebilirsiniz.
          </p>
          <a href="${cancelLink}" 
             style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
            Randevuyu İptal Et
          </a>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #eaeaea; padding-top: 16px;">
            Bu otomatik bir sistem e-postasıdır. Lütfen doğrudan yanıtlamayınız.
          </p>
        </div>
      `
    });

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        title: appointment.title
      }
    });
  } catch (error) {
    console.error("[BookingCreateAPI] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
