import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== 🔍 DATABASE DEBUG INFO ===");
  
  const chatbots = await prisma.chatbot.findMany({
    include: { channels: true }
  });

  if (chatbots.length === 0) {
    console.log("No chatbots found in the database.");
    return;
  }

  for (const bot of chatbots) {
    console.log(`\n🤖 Chatbot Name: "${bot.name}" (ID: ${bot.id})`);
    console.log(`Slug: ${bot.slug}`);
    console.log("Connected Channels:");
    
    if (bot.channels.length === 0) {
      console.log("  No channels configured for this chatbot.");
    } else {
      for (const ch of bot.channels) {
        console.log(`  - Type: [${ch.type}]`);
        console.log(`    Channel ID: ${ch.id}`);
        console.log(`    Status: ${ch.status}`);
        console.log(`    Name: "${ch.name}"`);
        console.log(`    PhoneNumberId: "${ch.phoneNumberId}"`);
        console.log(`    Config: ${JSON.stringify(ch.config)}`);
        console.log("    -----------------------");
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
