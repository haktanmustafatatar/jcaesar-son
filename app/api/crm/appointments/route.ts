import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addNotificationJob } from "@/lib/queue";
import { decrypt } from "@/lib/crypto";
import { google } from "googleapis";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId }
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        chatbot: {
          OR: [
            { userId: dbUser.id },
            ...(dbUser.organizationId ? [{ organizationId: dbUser.organizationId }] : [])
          ]
        }
      },
      include: {
        contact: {
          select: { name: true, email: true, phone: true }
        },
        chatbot: {
          select: { name: true }
        },
        staff: true
      },
      orderBy: { startTime: "asc" }
    });

    console.log("DEBUG GET APPOINTMENTS:", appointments.length, "for userId:", clerkId);
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Appointments API Error:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId }
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, startTime, price, contactEmail, chatbotId, description, staffId } = body;

    console.log("DEBUG: Available Prisma Models:", Object.keys(prisma).filter(k => !k.startsWith('$')));

    if (!title || !startTime || !chatbotId) {
      return NextResponse.json({ error: "Başlık, zaman ve chatbot seçimi zorunludur." }, { status: 400 });
    }

    // Verify chatbot ownership
    const chatbot = await prisma.chatbot.findFirst({
      where: { 
        id: chatbotId,
        OR: [
          { userId: dbUser.id },
          ...(dbUser.organizationId ? [{ organizationId: dbUser.organizationId }] : [])
        ]
      }
    });
    if (!chatbot) {
      return NextResponse.json({ error: "Sohbet botu bulunamadı veya yetkisiz erişim." }, { status: 404 });
    }

    // Capacity & Working Hours Controls
    const settings = await prisma.scheduleSetting.findUnique({
      where: { chatbotId }
    });

    const activeWorkingDays = settings?.workingDays ? settings.workingDays.split(",") : ["1","2","3","4","5"];
    const startHour = settings?.startHour || "09:00";
    const endHour = settings?.endHour || "18:00";
    const staffCapacity = settings?.staffCapacity || 3;
    const slotDuration = settings?.slotDuration || 60; // in minutes

    const appDate = new Date(startTime);
    const dayOfWeek = appDate.getDay().toString();
    const mappedDay = dayOfWeek === "0" ? "7" : dayOfWeek; // standard 1=Mon ... 7=Sun

    if (!activeWorkingDays.includes(mappedDay)) {
      return NextResponse.json({ error: "Seçilen gün işletmenin çalışma günleri dışındadır." }, { status: 400 });
    }

    // Convert hours checking
    const timeStr = appDate.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit', hour12: false });
    if (timeStr < startHour || timeStr > endHour) {
      return NextResponse.json({ error: `Randevu saati işletme çalışma saatleri (${startHour} - ${endHour}) dışındadır.` }, { status: 400 });
    }

    // Check staff allocation count
    const slotEnd = new Date(appDate.getTime() + slotDuration * 60 * 1000);
    const activeStaff = await prisma.staff.findMany({
      where: { isActive: true }
    });

    const conflictingCount = await prisma.appointment.count({
      where: {
        chatbotId,
        status: { not: "CANCELLED" },
        startTime: { lt: slotEnd },
        endTime: { gt: appDate }
      }
    });

    // Check GCal events collision
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
          timeMin: appDate.toISOString(),
          timeMax: slotEnd.toISOString(),
          singleEvents: true
        });
        gcalOverlaps = (response.data.items || []).length;
      } catch (err) {
        console.error("[GCalCollisionCheck] Failed to check:", err);
      }
    }

    const totalOverlaps = conflictingCount + gcalOverlaps;

    const maxCapacity = activeStaff.length > 0 ? activeStaff.length : staffCapacity;
    if (totalOverlaps >= maxCapacity) {
      return NextResponse.json({ error: "Seçilen saat diliminde tüm çalışanlarımız doludur. Lütfen başka bir saat seçiniz." }, { status: 400 });
    }

    // Assign active staff
    const busyStaffIds = (await prisma.appointment.findMany({
      where: {
        chatbotId,
        status: { not: "CANCELLED" },
        startTime: { lt: slotEnd },
        endTime: { gt: appDate },
        staffId: { not: null }
      },
      select: { staffId: true }
    })).map(a => a.staffId);

    const availableStaff = activeStaff.filter(s => !busyStaffIds.includes(s.id));
    const assignedStaffId = staffId || (availableStaff.length > 0 ? availableStaff[0].id : null);

    // Find contact if email provided
    let contactId = null;
    if (contactEmail) {
      const contact = await prisma.crmContact.findFirst({
        where: { email: contactEmail, chatbotId }
      });
      contactId = contact?.id;
    }

    // Generate cancellation token
    const cancelToken = crypto.randomUUID();

    // Create event on Google Calendar if channel is connected
    let gcalEventId = null;
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
        const response = await calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: title,
            description: description || "Dashboard scheduled appointment.",
            start: {
              dateTime: appDate.toISOString(),
            },
            end: {
              dateTime: slotEnd.toISOString(),
            },
          },
        });
        gcalEventId = response.data.id;
      } catch (err) {
        console.error("[GCalCreate] Failed to write event:", err);
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        chatbotId,
        contactId,
        staffId: assignedStaffId,
        title,
        description,
        startTime: appDate,
        endTime: slotEnd,
        price: Number(price) || 0,
        paymentStatus: Number(price) > 0 ? "UNPAID" : "PAID",
        cancelToken,
        gcalEventId
      },
      include: {
        contact: true,
        chatbot: true,
        staff: true
      }
    });

    // Send confirmation email
    if (contactEmail) {
      const cancelLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/booking/cancel/${cancelToken}`;
      sendEmail({
        to: contactEmail,
        subject: `Randevunuz Onaylandı: ${title}`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; max-width: 600px; border: 1px solid #eaeaea; border-radius: 16px;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">Randevunuz Onaylandı</h2>
            <p style="font-size: 15px; color: #374151; line-height: 1.6;">
              Merhaba, <strong>${title}</strong> randevunuz başarıyla oluşturuldu ve onaylandı.
            </p>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #4f46e5;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">
                <strong>Tarih:</strong> ${appDate.toLocaleDateString("tr-TR")}
              </p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">
                <strong>Saat:</strong> ${appDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} - ${slotEnd.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p style="margin: 0; font-size: 14px; color: #4b5563;">
                <strong>Açıklama:</strong> ${description || "-"}
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
              Bu otomatik bir e-postadır. J.Caesar Agent.
            </p>
          </div>
        `
      }).catch(err => console.error("Failed to send booking email:", err));
    }

    // Schedule automated reminder if contact exists
    if (appointment.chatbot) {
      const reminderHours = appointment.chatbot.appointmentReminderHours || 24;
      const reminderTime = new Date(new Date(startTime).getTime() - reminderHours * 60 * 60 * 1000);
      const now = new Date();
      
      const delay = Math.max(0, reminderTime.getTime() - now.getTime());
      const effectiveDelay = delay > 0 ? delay : Math.max(0, (new Date(startTime).getTime() - 60 * 60000) - now.getTime());

      // Personalized message
      let message = appointment.chatbot.appointmentReminderMsg || "Merhaba {name}, {time} saatindeki randevunuzu hatırlatmak isteriz.";
      message = message.replace("{name}", appointment.contact?.name || "Müşterimiz")
                      .replace("{time}", new Date(startTime).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }));

      if (effectiveDelay >= 0) {
        try {
          const contact = appointment.contact;
          const channel = contact?.sourceChannel?.toLowerCase();
          
          if (channel && channel !== "widget" && contact?.externalId) {
            // Send via channel queue (Instagram, WhatsApp etc)
            const { addChannelJob } = await import("@/lib/queue");
            await addChannelJob({
              type: "send-message",
              channel: channel as any,
              recipientId: contact.externalId,
              message: message,
              chatbotId: appointment.chatbotId,
              conversationId: "" 
            });
          } else if (contactEmail) {
            await addNotificationJob({
              type: "email",
              to: contactEmail,
              subject: `Hatırlatma: ${title}`,
              body: message,
              data: {
                appointmentId: appointment.id,
                price: appointment.price,
                paymentStatus: appointment.paymentStatus
              }
            });
          }
        } catch (queueError) {
          console.warn("Notification job failed to schedule:", queueError);
        }
      }
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("CRITICAL: Create Appointment Error Details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : null,
      error
    });
    return NextResponse.json({ 
      error: "Randevu oluşturulamadı.", 
      details: error instanceof Error ? error.message : "Database connection or validation error",
      debug_prisma_keys: Object.keys(prisma).filter(k => !k.startsWith('$'))
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId }
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }

    // Verify ownership
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { chatbot: true }
    });

    if (!appointment || (appointment.chatbot.userId !== dbUser.id && (!dbUser.organizationId || appointment.chatbot.organizationId !== dbUser.organizationId))) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await prisma.appointment.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Appointment Error:", error);
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId }
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { id, paymentStatus } = body;

    if (!id || !paymentStatus) {
      return NextResponse.json({ error: "ID ve ödeme durumu gereklidir." }, { status: 400 });
    }

    if (paymentStatus !== "PAID" && paymentStatus !== "UNPAID") {
      return NextResponse.json({ error: "Geçersiz ödeme durumu." }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { chatbot: true }
    });

    if (!appointment) {
      return NextResponse.json({ error: "Randevu bulunamadı." }, { status: 404 });
    }

    // Verify ownership or organization access
    const hasAccess = 
      appointment.chatbot.userId === dbUser.id || 
      (dbUser.organizationId && appointment.chatbot.organizationId === dbUser.organizationId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { paymentStatus },
      include: {
        contact: true,
        chatbot: true,
        staff: true
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update Appointment Status Error:", error);
    return NextResponse.json({ error: "Randevu güncellenemedi." }, { status: 500 });
  }
}
