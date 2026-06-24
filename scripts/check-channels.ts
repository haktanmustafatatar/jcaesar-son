import { prisma } from "../lib/prisma";

async function main() {
  console.log("--- Checking Channels ---");
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: "desc" }
  });
  console.log(`Found ${channels.length} channels:`);
  for (const c of channels) {
    console.log(`- ID: ${c.id}`);
    console.log(`  Type: ${c.type}`);
    console.log(`  Name: ${c.name}`);
    console.log(`  Status: ${c.status}`);
    console.log(`  PhoneNumberId: ${c.phoneNumberId}`);
    console.log(`  ChatbotId: ${c.chatbotId}`);
    console.log(`  Config keys: ${Object.keys(c.config as object || {})}`);
    console.log("--------------------------------------");
  }

  console.log("\n--- Checking Conversations ---");
  const conversations = await prisma.conversation.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        take: 5,
        orderBy: { createdAt: "desc" }
      }
    }
  });
  console.log(`Found ${conversations.length} recent conversations:`);
  for (const conv of conversations) {
    console.log(`- ID: ${conv.id}`);
    console.log(`  Channel: ${conv.channel}`);
    console.log(`  ChannelUserId: ${conv.channelUserId}`);
    console.log(`  Status: ${conv.status}`);
    console.log(`  AI Enabled: ${conv.aiEnabled}`);
    console.log(`  Messages (${conv.messages.length} loaded):`);
    for (const msg of conv.messages.reverse()) {
      console.log(`    [${msg.role}] ${msg.content.substring(0, 60)}`);
    }
    console.log("--------------------------------------");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
