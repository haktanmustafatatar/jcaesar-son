import { Worker } from "bullmq";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { performRAGSearch, generateRAGResponse, logTokenUsage, LLMModel } from "@/lib/ai";
import { downloadImageAsBase64, downloadWhatsAppImageAsBase64 } from "@/lib/media";
import { triggerWebhook } from "@/lib/webhook";
import { logger } from "@/lib/logger";
import { createBullMQConnection } from "@/lib/redis";

const workerLog = logger.child({ worker: "channel" });

// Meta (WhatsApp, Instagram, Facebook) API
async function sendMetaMessage({
  channel,
  recipientId,
  message,
  accessToken,
  phoneNumberId,
  configPageId,
  instagramId,
}: {
  channel: "whatsapp" | "instagram" | "facebook";
  recipientId: string;
  message: string;
  accessToken: string;
  phoneNumberId?: string;
  configPageId?: string;
  instagramId?: string;
}) {
  let url: string;
  let payload: any;

  if (channel === "whatsapp") {
    const pId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    url = `https://graph.facebook.com/v22.0/${pId}/messages`;
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientId,
      type: "text",
      text: { body: message },
    };
  } else if (channel === "instagram") {
    const igId = phoneNumberId || configPageId || instagramId;
    if (!igId) {
      throw new Error("Instagram channel config eksik: instagramId veya pageId bulunamadı.");
    }
    url = `https://graph.facebook.com/v22.0/${igId}/messages`;
    payload = {
      recipient: { id: recipientId },
      message: { text: message },
    };
  } else {
    const senderId = phoneNumberId || "me";
    url = `https://graph.facebook.com/v22.0/${senderId}/messages`;
    payload = {
      recipient: { id: recipientId },
      message: { text: message },
    };
  }

  const response = await fetch(`${url}?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Meta API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Bird API (WhatsApp, Instagram, Facebook via Bird)
async function sendBirdMessage({
  recipientId,
  message,
  connectorId,
  channel,
}: {
  recipientId: string;
  message: string;
  connectorId: string;
  channel: string;
}) {
  const apiKey = process.env.BIRD_API_KEY;
  if (!apiKey) throw new Error("BIRD_API_KEY not configured");

  const workspaceId = process.env.BIRD_WORKSPACE_ID;
  if (!workspaceId) throw new Error("BIRD_WORKSPACE_ID not configured");

  const url = `https://api.bird.com/workspaces/${workspaceId}/channels/${connectorId}/messages`;

  const identifierKey = channel === "instagram" || channel === "facebook" ? "id" : "phonenumber";

  const payload = {
    receiver: {
      contacts: [{ identifierKey, identifierValue: recipientId }]
    },
    body: {
      type: "text",
      text: { text: message }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `AccessKey ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Bird API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Telegram Bot API
async function sendTelegramMessage({
  chatId,
  message,
  botToken,
}: {
  chatId: string;
  message: string;
  botToken: string;
}) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Slack API
async function sendSlackMessage({
  channel,
  message,
  botToken,
}: {
  channel: string;
  message: string;
  botToken: string;
}) {
  const url = "https://slack.com/api/chat.postMessage";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel,
      text: message,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return data;
}

// Email (SendGrid)
async function sendEmailMessage({
  to,
  subject,
  message,
}: {
  to: string;
  subject: string;
  message: string;
}) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SENDGRID_API_KEY not configured");

  const fromEmail = process.env.EMAIL_FROM || "noreply@jcaesars.com";

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject,
      content: [{ type: "text/plain", value: message }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }

  return { success: true };
}

// Channel Worker
export const channelWorker = new Worker(
  "channel",
  async (job) => {
    const { type, channel, recipientId, message: userMessage, attachments = [], chatbotId, conversationId: existingConversationId, platformMetadata, contactInfo } = job.data;

    workerLog.info({ jobId: job.id, channel, type }, "Processing job");

    try {
      if (type === "inbound") {
        // --- INBOUND MESSAGE PROCESSING ---
        const chatbot = await prisma.chatbot.findUnique({
          where: { id: chatbotId },
        });

        if (!chatbot) throw new Error(`Chatbot ${chatbotId} not found`);

        // Get or Create Conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            chatbotId,
            channel: channel.toUpperCase() as any,
            channelUserId: recipientId,
            status: "ACTIVE"
          },
          orderBy: { createdAt: "desc" }
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              chatbotId,
              channel: channel.toUpperCase() as any,
              channelUserId: recipientId,
              aiEnabled: true,
              status: "ACTIVE",
              contactName: contactInfo?.contactName || null,
              contactPhone: contactInfo?.contactPhone || null,
            }
          });
          triggerWebhook(chatbotId, "conversation.created", conversation);
        } else if (contactInfo?.contactName && !conversation.contactName) {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              contactName: contactInfo.contactName,
              contactPhone: contactInfo.contactPhone || undefined,
            }
          });
          conversation = { ...conversation, contactName: contactInfo.contactName };
        }

        if (!conversation.aiEnabled) {
          workerLog.info({ conversationId: conversation.id }, "Handoff aktif, AI atlandı");
          return { skipped: "handoff_active" };
        }

        const channelConfig = await prisma.channel.findFirst({
          where: { chatbotId, type: channel.toUpperCase() as any, status: "CONNECTED" }
        });
        if (!channelConfig) throw new Error("Channel configuration lost");
        const config = channelConfig.config as any;

        const processedAttachments: Array<{ type: string; data: string; mimeType?: string }> = [];
        for (const att of attachments) {
          if (att.type === "image" && att.url) {
            try {
              let imageData;
              if (att.url.startsWith("whatsapp_media_id:")) {
                const mediaId = att.url.split("whatsapp_media_id:")[1];
                workerLog.info({ mediaId }, "Fetching WhatsApp image");
                imageData = await downloadWhatsAppImageAsBase64(mediaId, config.accessToken);
              } else {
                workerLog.info({ url: att.url }, "Downloading image attachment");
                imageData = await downloadImageAsBase64(att.url);
              }
              processedAttachments.push({
                type: "image",
                data: imageData.data,
                mimeType: imageData.mimeType
              });
            } catch (err) {
              workerLog.error({ url: att.url, err }, "Failed to download image");
              processedAttachments.push({
                type: "text_fallback",
                data: `[Görsel yüklenemedi: ${att.url}]`
              });
            }
          } else if (att.type === "share" && att.url) {
            processedAttachments.push({
              type: "share",
              data: att.url
            });
          }
        }

        let displayMessage = userMessage || "";
        if (attachments && attachments.length > 0) {
          const attachmentLabels = attachments.map((att: any) => `[${att.type === "image" ? "Görsel" : att.type === "share" ? "Gönderi" : "Ek"}: ${att.url}]`).join(" ");
          displayMessage = displayMessage ? `${displayMessage} ${attachmentLabels}` : attachmentLabels;
        }

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "USER",
            content: displayMessage,
          }
        });

        let aiQueryText = userMessage || "";
        for (const att of processedAttachments) {
          if (att.type === "text_fallback") {
            aiQueryText += `\n${att.data}`;
          } else if (att.type === "share") {
            aiQueryText += `\n[Paylaşılan Gönderi Linki: ${att.data}]`;
          }
        }

        const { context, sources, lowConfidence } = await performRAGSearch({
          chatbotId,
          query: aiQueryText || "görsel",
        });

        const history = await prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "asc" },
          take: 10
        });

        const formattedMessages = history.map(m => ({
          role: m.role.toLowerCase() as "user" | "assistant" | "system",
          content: m.content
        }));

        const aiResponse = await generateRAGResponse({
          messages: formattedMessages,
          model: (chatbot.model as any) || "gpt-4o",
          systemPrompt: chatbot.systemPrompt,
          context,
          chatbotId,
          conversationId: conversation.id,
          attachments: processedAttachments as any
        });

        let sendResult;
        if (["whatsapp", "instagram", "facebook"].includes(channel)) {
          const isBirdChannel = config.provider === "bird" || (!config.accessToken && channelConfig.phoneNumberId);
          if (isBirdChannel) {
            workerLog.info({ channel }, "Using Bird API");
            sendResult = await sendBirdMessage({
              recipientId,
              message: aiResponse.text,
              connectorId: channelConfig.phoneNumberId!,
              channel,
            });
          } else {
            sendResult = await sendMetaMessage({
              channel: channel as any,
              recipientId,
              message: aiResponse.text,
              accessToken: config.accessToken,
              phoneNumberId: channelConfig.phoneNumberId || undefined,
              configPageId: config.pageId || undefined,
              instagramId: config.instagramId || undefined
            });
          }
        } else if (channel === "telegram") {
          const botToken = config.botToken;
          if (!botToken) throw new Error("Telegram botToken missing in channel config");
          sendResult = await sendTelegramMessage({
            chatId: recipientId,
            message: aiResponse.text,
            botToken,
          });
        } else if (channel === "slack") {
          const botToken = config.botToken;
          if (!botToken) throw new Error("Slack botToken missing in channel config");
          sendResult = await sendSlackMessage({
            channel: recipientId,
            message: aiResponse.text,
            botToken,
          });
        }

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "ASSISTANT",
            content: aiResponse.text,
            sources: sources as any,
            promptTokens: aiResponse.usage.promptTokens,
            completionTokens: aiResponse.usage.completionTokens,
            tokensUsed: aiResponse.usage.totalTokens
          }
        });

        await logTokenUsage({
          userId: chatbot.userId,
          chatbotId: chatbot.id,
          conversationId: conversation.id,
          model: (chatbot.model as LLMModel) || "gpt-4o",
          promptTokens: aiResponse.usage.promptTokens,
          completionTokens: aiResponse.usage.completionTokens,
        });

        return { success: true, aiResponse: aiResponse.text };
      }

      // --- OUTBOUND MESSAGE PROCESSING (Existing) ---
      const channelConfig = await prisma.channel.findFirst({
        where: {
          chatbotId,
          type: channel.toUpperCase() as any,
          status: "CONNECTED",
        },
      });

      if (!channelConfig) {
        throw new Error(`Channel ${channel} not configured for chatbot ${chatbotId}`);
      }

      const config = channelConfig.config as any;
      let result;

      switch (channel) {
        case "whatsapp":
        case "instagram":
        case "facebook": {
          const isBirdChannel = config.provider === "bird" || (!config.accessToken && channelConfig.phoneNumberId);
          if (isBirdChannel) {
            result = await sendBirdMessage({
              recipientId,
              message: userMessage,
              connectorId: channelConfig.phoneNumberId!,
              channel,
            });
          } else {
            result = await sendMetaMessage({
              channel,
              recipientId,
              message: userMessage,
              accessToken: config.accessToken,
              phoneNumberId: channelConfig.phoneNumberId || undefined,
              configPageId: config.pageId || undefined,
              instagramId: config.instagramId || undefined
            });
          }
          break;
        }

        case "telegram":
          result = await sendTelegramMessage({
            chatId: recipientId,
            message: userMessage,
            botToken: config.botToken,
          });
          break;

        case "slack":
          result = await sendSlackMessage({
            channel: recipientId,
            message: userMessage,
            botToken: config.botToken,
          });
          break;

        case "email":
          result = await sendEmailMessage({
            to: recipientId,
            subject: "New Message",
            message: userMessage,
          });
          break;

        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      await prisma.message.create({
        data: {
          conversationId: existingConversationId,
          role: "ASSISTANT",
          content: userMessage,
        },
      });

      workerLog.info({ jobId: job.id }, "Job completed");
      return result;
    } catch (error) {
      Sentry.captureException(error, { extra: { jobId: job.id, channel, type } });
      workerLog.error({ jobId: job.id, err: error }, "Job failed");

      const errMsg = error instanceof Error ? error.message : String(error);

      const isTrueAuthError =
        !errMsg.includes("Object with ID 'undefined'") &&
        !errMsg.includes("Object with ID 'me'") &&
        (errMsg.includes("OAuthException") && (
          errMsg.includes("190") ||
          errMsg.includes("expired") ||
          errMsg.includes("revoked") ||
          errMsg.includes("invalid access token")
        ));

      if (isTrueAuthError) {
        workerLog.warn({ channel }, "Critical auth error — setting channel to ERROR status");
        await prisma.channel.updateMany({
          where: { chatbotId, type: channel.toUpperCase() as any },
          data: { status: "ERROR" },
        });

        const chatbot = await prisma.chatbot.findUnique({
          where: { id: chatbotId },
          select: { userId: true }
        });

        const ch = await prisma.channel.findFirst({
          where: { chatbotId, type: channel.toUpperCase() as any }
        });
        const channelName = ch?.name || channel;

        if (chatbot) {
          await prisma.notification.create({
            data: {
              userId: chatbot.userId,
              title: "Kanal Bağlantı Hatası",
              message: `${channelName} kanalında kritik bir hata oluştu. Lütfen entegrasyon ayarlarını kontrol edin.`,
              type: "ERROR",
              link: `/dashboard/chatbots/${chatbotId}/integrations`
            }
          });
        }
      } else {
        workerLog.info({ channel }, "Non-critical/transient error — leaving channel status as-is");
      }

      throw error;
    }
  },
  {
    connection: createBullMQConnection(),
    concurrency: 10,
  }
);

// Rate limit yönetimi için Meta API özel kuyruk
export const metaRateLimiter = {
  whatsapp: { limit: 80, window: 60000, current: 0, resetTime: Date.now() + 60000 },
  instagram: { limit: 100, window: 60000, current: 0, resetTime: Date.now() + 60000 },
  facebook: { limit: 100, window: 60000, current: 0, resetTime: Date.now() + 60000 },
};

channelWorker.on("completed", (job) => {
  workerLog.debug({ jobId: job.id }, "Job completed");
});

channelWorker.on("failed", (job, err) => {
  workerLog.error({ jobId: job?.id, err: err.message }, "Job failed");
});

workerLog.info("Started");
