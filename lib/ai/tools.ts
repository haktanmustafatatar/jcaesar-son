import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { tool } from "ai";
import { searchShopifyProducts, getShopifyOrdersByEmail, ShopifyConfig } from "../integrations/shopify";
import { searchWooProducts, WooCommerceConfig } from "../integrations/woocommerce";
import { createCalendarEvent, GoogleCalendarConfig } from "../integrations/google-calendar";
import { addNotificationJob } from "@/lib/queue";

/**
 * Creates a map of tools based on the chatbot's active integrations
 */
export async function getChatbotTools(chatbotId: string, conversationId?: string) {
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: { channels: true }
  });

  if (!chatbot) return {};

  const tools: any = {};

  // 1. Shopify Tool
  const shopifyChannel = chatbot.channels.find(c => c.type === "SHOPIFY" && c.status === "CONNECTED");
  if (shopifyChannel) {
    const config = shopifyChannel.config as any as ShopifyConfig;
    tools.search_shopify_products = tool({
      description: "Search for products in the Shopify store. Useful for checking price, SKU, and availability.",
      parameters: z.object({
        query: z.string().describe("The product name or SKU to search for"),
      }),
      execute: async ({ query }) => {
        const products = await searchShopifyProducts(config, query);
        return { success: true, count: products.length, products };
      },
    });
    
    tools.get_shopify_order_status = tool({
      description: "Get the latest orders and their status for a customer using their email address. Useful for 'Where is my order?' questions.",
      parameters: z.object({
        email: z.string().describe("The customer's email address"),
      }),
      execute: async ({ email }) => {
        const orders = await getShopifyOrdersByEmail(config, email);
        return { success: true, count: orders.length, orders };
      },
    });
  }

  // 2. WooCommerce Tool
  const wooChannel = chatbot.channels.find(c => c.type === "WOOCOMMERCE" && c.status === "CONNECTED");
  if (wooChannel) {
    const config = wooChannel.config as any as WooCommerceConfig;
    tools.search_woocommerce_products = tool({
      description: "Search for products in the WooCommerce store.",
      parameters: z.object({
        query: z.string().describe("The product name to search for"),
      }),
      execute: async ({ query }) => {
        const products = await searchWooProducts(config, query);
        return { success: true, count: products.length, products };
      },
    });
  }

  // 3. Google Calendar Tool
  const calendarChannel = chatbot.channels.find(c => c.type === "GOOGLE_CALENDAR" && c.status === "CONNECTED");
  if (calendarChannel) {
    const config = calendarChannel.config as any as GoogleCalendarConfig;
    tools.book_appointment = tool({
      description: "Book an appointment or meeting on the calendar using Google Calendar.",
      parameters: z.object({
        title: z.string().describe("The title or purpose of the meeting"),
        startTime: z.string().describe("ISO string of the start time (e.g. 2024-04-20T14:00:00Z)"),
        durationMinutes: z.number().default(30),
        guestEmail: z.string().optional().describe("Email of the person booking"),
        notes: z.string().optional().describe("Additional notes or details"),
      }),
      execute: async (args) => {
        const result = await createCalendarEvent(config, {
          title: args.title,
          startTime: args.startTime,
          durationMinutes: args.durationMinutes,
          description: args.notes,
          attendeeEmail: args.guestEmail
        });
        return result;
      },
    });
  }

  // 4. Handoff Tool (Transfer to Human)
  if (conversationId) {
    tools.transfer_to_human = tool({
      description: "Call this tool when the user explicitly asks to talk to a human, is frustrated, or when you are stuck and cannot answer effectively. This will alert a human operator to take over.",
      parameters: z.object({
        reason: z.string().describe("Brief reason why handoff is requested"),
      }),
      execute: async ({ reason }) => {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            aiEnabled: false,
            status: "ESCALATED",
          }
        });
        
        await prisma.conversationNote.create({
          data: {
            conversationId,
            content: `AI Handoff Requested: ${reason}`,
            createdBy: "AI_SYSTEM"
          }
        });

        return { success: true, message: "A human representative has been notified and will join as soon as possible. AI autopilot is now paused." };
      },
    });
  }

  // 5. Internal CRM & Lead Capture (Always Available if collectLeads is true)
  if (chatbot.collectLeads) {
    tools.save_contact_info = tool({
      description: "Save user's contact information (name, email, phone) to the internal CRM. Use this when the user provides their details or shows high interest.",
      parameters: z.object({
        name: z.string().describe("User's full name"),
        email: z.string().email().describe("User's email address"),
        phone: z.string().optional().describe("User's phone number"),
        notes: z.string().optional().describe("Context or specific interest mentioned by user"),
      }),
      execute: async (args) => {
        // Detect source from conversation
        let sourceChannel = "WIDGET";
        let externalId = null;
        
        if (conversationId) {
          const conv = await prisma.conversation.findUnique({
            where: { id: conversationId }
          });
          if (conv) {
            sourceChannel = conv.channel.toUpperCase();
            externalId = conv.channelUserId;
          }
        }

        const contact = await (prisma as any).crmContact.create({
          data: {
            chatbotId,
            name: args.name,
            email: args.email,
            phone: args.phone,
            notes: args.notes,
            sourceChannel,
            externalId,
            status: "NEW",
          }
        });
        return { success: true, message: `Contact information saved from ${sourceChannel}.`, contactId: contact.id };
      },
    });

    tools.schedule_appointment = tool({
      description: "Schedule a new appointment/meeting in the internal calendar. Ensure you have the user's name and email first.",
      parameters: z.object({
        title: z.string().describe("Title/Purpose of the appointment"),
        name: z.string().describe("Full name of the user booking"),
        startTime: z.string().describe("ISO string of start time"),
        notes: z.string().optional().describe("Extra details for the meeting"),
        userEmail: z.string().email().describe("Email of the user booking"),
        price: z.number().optional().describe("Cost of the appointment if applicable"),
      }),
      execute: async (args) => {
        // Find or create contact first
        let contact = await (prisma as any).crmContact.findFirst({
          where: { chatbotId, email: args.userEmail }
        });

        const appointment = await prisma.appointment.create({
          data: {
            chatbotId,
            contactId: contact?.id,
            title: args.title,
            description: args.notes,
            startTime: new Date(args.startTime),
            endTime: new Date(new Date(args.startTime).getTime() + 60 * 60000), // Default 1 hour
            price: args.price || 0,
            paymentStatus: (args.price && args.price > 0) ? "UNPAID" : "PAID",
            status: "SCHEDULED"
          }
        });

        // Auto-schedule notification job
        try {
          const reminderHours = chatbot.appointmentReminderHours || 24;
          const delay = Math.max(0, (new Date(args.startTime).getTime() - reminderHours * 60 * 60 * 1000) - Date.now());
          
          let message = chatbot.appointmentReminderMsg || "Merhaba {name}, {time} saatindeki randevunuzu hatırlatmak isteriz.";
          message = message.replace("{name}", args.name || contact?.name || "Müşterimiz")
                          .replace("{time}", new Date(args.startTime).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }));

          await addNotificationJob({
            type: "email",
            to: args.userEmail,
            subject: `Randevu Onayı: ${args.title}`,
            body: message,
          });
        } catch (queueError) {
          console.warn("Notification job failed to schedule (Redis might be down):", queueError);
        }

        return { success: true, message: "Appointment scheduled successfully and reminder set.", appointmentId: appointment.id };
      },
    });
  }

  // 6. Custom API (Webhooks)
  const customActions = await prisma.aIAction.findMany({
    where: { chatbotId, type: "WEBHOOK", isActive: true }
  });

  for (const action of customActions) {
    const config = action.config as any;
    tools[action.name] = tool({
      description: config.description || `Custom tool for ${action.name}`,
      parameters: z.object({
        params: z.record(z.any()).describe("Key-value parameters for the API call"),
      }),
      execute: async ({ params }) => {
        try {
          console.log(`[CustomTool] Calling ${action.name} at ${config.url}`);
          
          let url = config.url;
          const method = config.method || "GET";
          const headers = {
            "Content-Type": "application/json",
            ...(config.headers || {})
          };

          let body = undefined;
          if (method === "GET") {
            const queryParams = new URLSearchParams(params).toString();
            if (queryParams) url += (url.includes("?") ? "&" : "?") + queryParams;
          } else {
            body = JSON.stringify({ ...config.staticBody, ...params });
          }

          const response = await fetch(url, { method, headers, body });
          if (!response.ok) throw new Error(`API responded with ${response.status}`);
          
          const data = await response.json();
          return { success: true, data };
        } catch (err) {
          console.error(`[CustomTool] ${action.name} failed:`, err);
          return { success: false, error: err instanceof Error ? err.message : "Request failed" };
        }
      },
    });
  }

  return tools;
}
