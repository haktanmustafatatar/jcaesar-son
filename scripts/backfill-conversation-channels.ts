import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== 🔄 BACKFILLING CONVERSATION CHANNELS TO UPPERCASE ===");
  
  const instagramRes = await prisma.conversation.updateMany({
    where: { channel: "instagram" as any },
    data: { channel: "INSTAGRAM" as any }
  });
  console.log(`Updated ${instagramRes.count} Instagram conversations.`);

  const messengerRes = await prisma.conversation.updateMany({
    where: { channel: { in: ["messenger", "facebook"] } as any },
    data: { channel: "FACEBOOK" as any }
  });
  console.log(`Updated ${messengerRes.count} Facebook/Messenger conversations.`);

  const whatsappRes = await prisma.conversation.updateMany({
    where: { channel: "whatsapp" as any },
    data: { channel: "WHATSAPP" as any }
  });
  console.log(`Updated ${whatsappRes.count} WhatsApp conversations.`);

  console.log("=== 🎉 Conversation Backfill Complete! ===");
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
