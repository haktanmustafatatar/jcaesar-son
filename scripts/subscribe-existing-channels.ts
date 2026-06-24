import { prisma } from "../lib/prisma";

async function main() {
  console.log("--- Fetching Connected Meta Channels to Subscribe ---");
  const channels = await prisma.channel.findMany({
    where: {
      status: "CONNECTED",
      type: { in: ["FACEBOOK", "INSTAGRAM", "WHATSAPP"] }
    }
  });

  console.log(`Found ${channels.length} connected channels:`);

  for (const c of channels) {
    const config = c.config as any || {};
    const channelName = c.name;
    const type = c.type;

    console.log(`\n- Channel ID: ${c.id} (${channelName}) [${type}]`);

    try {
      if (type === "FACEBOOK" || type === "INSTAGRAM") {
        const pageId = config.pageId;
        const accessToken = config.accessToken;

        if (!pageId || !accessToken) {
          console.warn(`⚠️ Skipping: missing pageId or accessToken in config!`);
          continue;
        }

        if (config.isDirectInstagram) {
          console.log(`Subscribing Direct Instagram Account ${config.instagramId} to App...`);
          const subscribeUrl = `https://graph.instagram.com/v22.0/${config.instagramId}/subscribed_apps?subscribed_fields=messages,comments&access_token=${accessToken}`;
          const res = await fetch(subscribeUrl, { method: "POST" });
          const data = await res.json();
          console.log(`Response:`, data);
        } else {
          console.log(`Subscribing Facebook Page ${pageId} to App...`);
          const subscribeUrl = `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads,message_deliveries&access_token=${accessToken}`;
          const res = await fetch(subscribeUrl, { method: "POST" });
          const data = await res.json();
          console.log(`Response:`, data);
        }
      } else if (type === "WHATSAPP") {
        const wabaId = config.wabaId;
        const accessToken = config.accessToken;

        if (!wabaId || !accessToken) {
          console.warn(`⚠️ Skipping: missing wabaId or accessToken in config!`);
          continue;
        }

        console.log(`Subscribing WhatsApp Business Account ${wabaId} to App...`);
        const subscribeUrl = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps?access_token=${accessToken}`;
        const res = await fetch(subscribeUrl, { method: "POST" });
        const data = await res.json();
        console.log(`Response:`, data);
      }
    } catch (err: any) {
      console.error(`❌ Error subscribing channel ${c.id}:`, err.message);
    }
  }

  console.log("\n--- Subscriptions Completed ---");
}

main()
  .catch((e) => {
    console.error("Fatal subscription error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
