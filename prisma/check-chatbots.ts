import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking chatbots in the database...");
  const chatbots = await prisma.chatbot.findMany({
    include: { channels: true }
  });
  
  if (chatbots.length === 0) {
    console.log("No chatbots found in the database.");
    return;
  }

  for (const bot of chatbots) {
    console.log(`\nChatbot ID: ${bot.id}`);
    console.log(`Name: ${bot.name}`);
    console.log(`Slug: ${bot.slug}`);
    console.log("Channels:");
    for (const ch of bot.channels) {
      console.log(`  - Type: ${ch.type}, Status: ${ch.status}, PhoneNumberId: ${ch.phoneNumberId}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
