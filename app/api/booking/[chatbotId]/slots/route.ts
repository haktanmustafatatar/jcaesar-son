import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { google } from "googleapis";

// Get Google Calendar events for a chatbot
async function getGoogleCalendarEvents(chatbotId: string, start: Date, end: Date) {
  const channel = await prisma.channel.findFirst({
    where: { chatbotId, type: "GOOGLE_CALENDAR", status: "CONNECTED" }
  });

  if (!channel) return [];

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
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime"
    });

    return response.data.items || [];
  } catch (err) {
    console.error("[GCalEvents] Failed to fetch events:", err);
    return [];
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // optional: filter for a single date like "2026-06-25"

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId }
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Get Scheduling Configuration
    let schedule = await prisma.scheduleSetting.findUnique({
      where: { chatbotId }
    });

    if (!schedule) {
      // Use defaults if not configured
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

    const workingDaysList = schedule.workingDays.split(",").map(d => parseInt(d, 10));
    const durationMin = schedule.slotDuration;
    const staffCapacity = schedule.staffCapacity;

    // Define date range: next 14 days by default
    const now = new Date();
    const startDate = dateParam ? new Date(dateParam) : new Date();
    if (dateParam) {
      startDate.setHours(0, 0, 0, 0);
    }
    const daysToCalculate = dateParam ? 1 : 14;
    const endDate = new Date(startDate.getTime() + daysToCalculate * 24 * 60 * 60 * 1000);
    endDate.setHours(23, 59, 59, 999);

    // Fetch active local appointments in range
    const appointments = await prisma.appointment.findMany({
      where: {
        chatbotId,
        status: { not: "CANCELLED" },
        startTime: { gte: startDate },
        endTime: { lte: endDate }
      }
    });

    // Fetch GCal events in range
    const gcalEvents = await getGoogleCalendarEvents(chatbotId, startDate, endDate);

    // Generate slots
    const availableSlots: Record<string, string[]> = {};

    for (let i = 0; i < daysToCalculate; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      // Check working days
      const jsDay = date.getDay();
      const workingDayNum = jsDay === 0 ? 7 : jsDay;
      if (!workingDaysList.includes(workingDayNum)) {
        continue;
      }

      const slots: string[] = [];
      const [startH, startM] = schedule.startHour.split(":").map(Number);
      const [endH, endM] = schedule.endHour.split(":").map(Number);

      const workStart = new Date(date);
      workStart.setHours(startH, startM, 0, 0);

      const workEnd = new Date(date);
      workEnd.setHours(endH, endM, 0, 0);

      let slotStart = new Date(workStart);

      while (slotStart.getTime() + durationMin * 60 * 1000 <= workEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMin * 60 * 1000);

        // Don't show slots in the past
        if (slotStart.getTime() < now.getTime()) {
          slotStart = new Date(slotEnd);
          continue;
        }

        // Count overlapping local appointments
        const localOverlaps = appointments.filter(app => {
          const appStart = new Date(app.startTime);
          const appEnd = new Date(app.endTime);
          return appStart < slotEnd && appEnd > slotStart;
        }).length;

        // Count overlapping Google Calendar events
        const gcalOverlaps = gcalEvents.filter(event => {
          const startStr = event.start?.dateTime || event.start?.date;
          const endStr = event.end?.dateTime || event.end?.date;
          if (!startStr || !endStr) return false;
          
          const eventStart = new Date(startStr);
          const eventEnd = new Date(endStr);
          return eventStart < slotEnd && eventEnd > slotStart;
        }).length;

        const totalOverlaps = localOverlaps + gcalOverlaps;

        if (totalOverlaps < staffCapacity) {
          const hourStr = String(slotStart.getHours()).padStart(2, "0");
          const minStr = String(slotStart.getMinutes()).padStart(2, "0");
          slots.push(`${hourStr}:${minStr}`);
        }

        slotStart = new Date(slotEnd);
      }

      if (slots.length > 0) {
        availableSlots[dateString] = slots;
      }
    }

    return NextResponse.json({
      chatbot: {
        name: chatbot.name,
        description: chatbot.description
      },
      slots: availableSlots
    });
  } catch (error) {
    console.error("[BookingSlotsAPI] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
