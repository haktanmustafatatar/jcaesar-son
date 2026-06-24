import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== ⚙️ BACKFILLING PHONE NUMBER IDS FOR META CHANNELS ===");
  const channels = await prisma.channel.findMany({
    where: {
      type: {
        in: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"]
      }
    }
  });

  console.log(`Found ${channels.length} channels to inspect.`);

  for (const channel of channels) {
    const config = channel.config as any;
    if (!config) {
      console.log(`Channel ${channel.id} (${channel.type}) has no config. Skipping.`);
      continue;
    }

    let targetId = "";
    if (channel.type === "WHATSAPP") {
      targetId = config.phoneNumberId || "";
    } else if (channel.type === "FACEBOOK") {
      targetId = config.pageId || "";
    } else if (channel.type === "INSTAGRAM") {
      targetId = config.instagramId || "";
    }

    if (targetId) {
      if (channel.phoneNumberId === targetId) {
        console.log(`Channel ${channel.id} (${channel.type}) already has correct phoneNumberId (${targetId}).`);
      } else {
        await prisma.channel.update({
          where: { id: channel.id },
          data: { phoneNumberId: targetId }
        });
        console.log(`✅ Updated Channel ${channel.id} (${channel.type}): set phoneNumberId to ${targetId}`);
      }
    } else {
      console.log(`⚠️ Channel ${channel.id} (${channel.type}) config does not contain a valid ID.`);
    }
  }

  console.log("=== 🎉 Backfill Complete! ===");
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
