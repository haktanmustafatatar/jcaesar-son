import { prisma } from "../lib/prisma";

async function main() {
  const bots = await prisma.chatbot.findMany();
  for (const b of bots) {
    console.log(`BOT_ID: ${b.id} - Name: ${b.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
