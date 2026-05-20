import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addNotificationJob } from "@/lib/queue";

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
          userId: dbUser.id
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
      where: { id: chatbotId, userId: dbUser.id }
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
        startTime: { lt: slotEnd },
        endTime: { gt: appDate }
      }
    });

    const maxCapacity = activeStaff.length > 0 ? activeStaff.length : staffCapacity;
    if (conflictingCount >= maxCapacity) {
      return NextResponse.json({ error: "Seçilen saat diliminde tüm çalışanlarımız doludur. Lütfen başka bir saat seçiniz." }, { status: 400 });
    }

    // Assign active staff
    const busyStaffIds = (await prisma.appointment.findMany({
      where: {
        chatbotId,
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
      const contact = await (prisma as any).crmContact.findFirst({
        where: { email: contactEmail, chatbotId }
      });
      contactId = contact?.id;
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
      },
      include: {
        contact: true,
        chatbot: true,
        staff: true
      }
    });

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

    if (!appointment || appointment.chatbot.userId !== dbUser.id) {
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
