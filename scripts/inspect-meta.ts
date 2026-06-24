import { PrismaClient } from "@prisma/client";

// Load dotenv conditionally if available (local dev)
try {
  // @ts-ignore
  require("dotenv").config({ path: ".env" });
} catch (e) {
  // Relying on Docker container env variables
}

const prisma = new PrismaClient();

async function main() {
  console.log("=== 🔍 SYSTEM INTEGRATION INSPECTION ===");
  
  // 1. Check Meta credentials in environment variables
  console.log("\n🔑 Environment Variables Check:");
  console.log(`- META_APP_ID: ${process.env.META_APP_ID || "MISSING"}`);
  console.log(`- META_APP_SECRET: ${process.env.META_APP_SECRET ? "PRESENT (length: " + process.env.META_APP_SECRET.length + ")" : "MISSING"}`);
  console.log(`- INSTAGRAM_APP_ID: ${process.env.INSTAGRAM_APP_ID || "MISSING"}`);
  console.log(`- INSTAGRAM_APP_SECRET: ${process.env.INSTAGRAM_APP_SECRET ? "PRESENT" : "MISSING"}`);
  console.log(`- NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || "MISSING"}`);
  console.log(`- META_WEBHOOK_VERIFY_TOKEN: ${process.env.META_WEBHOOK_VERIFY_TOKEN || "MISSING"}`);

  // 2. Fetch all channels
  console.log("\n📡 Active Database Channels:");
  const channels = await prisma.channel.findMany({
    orderBy: { type: "asc" }
  });

  if (channels.length === 0) {
    console.log("No channels found in the database.");
  } else {
    for (const c of channels) {
      console.log(`\n- Channel ID: ${c.id}`);
      console.log(`  Name: ${c.name}`);
      console.log(`  Type: ${c.type}`);
      console.log(`  Status: ${c.status}`);
      console.log(`  PhoneNumber/Page/IG ID: ${c.phoneNumberId || "NONE"}`);
      console.log(`  Updated At: ${c.updatedAt}`);
      const config = c.config as any;
      if (config) {
        console.log(`  Config Details:`);
        console.log(`    - Has Access Token: ${config.accessToken ? "YES" : "NO"}`);
        console.log(`    - Page ID: ${config.pageId || "NONE"}`);
        console.log(`    - Instagram ID: ${config.instagramId || "NONE"}`);
        console.log(`    - Phone Number ID: ${config.phoneNumberId || "NONE"}`);
      }
    }
  }

  // 3. Fetch active conversations
  console.log("\n💬 Recent Active Conversations:");
  const conversations = await prisma.conversation.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        take: 3,
        orderBy: { createdAt: "desc" }
      },
      notes: {
        take: 2,
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (conversations.length === 0) {
    console.log("No active conversations found.");
  } else {
    for (const conv of conversations) {
      console.log(`\n- Conv ID: ${conv.id}`);
      console.log(`  Channel: ${conv.channel}`);
      console.log(`  User ID on Channel: ${conv.channelUserId || "NONE"}`);
      console.log(`  AI Chatbot Enabled: ${conv.aiEnabled}`);
      console.log(`  Status: ${conv.status}`);
      console.log(`  Sentiment: ${conv.sentiment || "NONE"}`);
      console.log(`  Recent Messages:`);
      for (const msg of [...conv.messages].reverse()) {
        console.log(`    [${msg.role}] ${msg.content.substring(0, 80)}${msg.content.length > 80 ? "..." : ""}`);
      }
      if (conv.notes.length > 0) {
        console.log(`  Notes:`);
        for (const note of conv.notes) {
          console.log(`    * ${note.content} (by: ${note.createdBy})`);
        }
      }
    }
  }

  console.log("\n=== 🎉 Inspection Complete ===");
}

main()
  .catch((e) => {
    console.error("Inspection failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
