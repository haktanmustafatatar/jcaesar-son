import { prisma } from "../lib/prisma";
import { checkAndNotifyMissingKnowledge } from "../lib/ai";

async function runTests() {
  console.log("🔍 Starting Phase 2 & Smart Suggestion Tests...");
  
  // 1. Verify Notification Table
  try {
    const count = await prisma.notification.count();
    console.log(`✅ Database: Notification table is accessible. Current count: ${count}`);
  } catch (e) {
    console.error("❌ Database: Notification table check failed!", e);
    process.exit(1);
  }

  // 2. Test Smart Suggestion Logic
  try {
    console.log("🧪 Simulating a 'Missing Knowledge' response...");
    
    // Find a test chatbot
    const chatbot = await prisma.chatbot.findFirst();
    if (!chatbot) {
      console.log("⚠️ No chatbot found to test suggestions. Skipping logic test.");
    } else {
      const initialCount = await prisma.notification.count({ where: { userId: chatbot.userId } });
      
      await checkAndNotifyMissingKnowledge({
        conversationId: "test-conv-id",
        chatbotId: chatbot.id,
        aiResponse: "I'm sorry, I don't have enough information about that in the provided context."
      });

      const newCount = await prisma.notification.count({ where: { userId: chatbot.userId } });
      
      if (newCount > initialCount) {
        console.log("✅ Smart Suggestion: Notification successfully created upon knowledge gap.");
      } else {
        console.error("❌ Smart Suggestion: Notification was NOT created!");
      }
    }
  } catch (e) {
    console.error("❌ Smart Suggestion: Logic test failed!", e);
  }

  console.log("\n🚀 PHASE 2 VERIFICATION COMPLETE.");
}

runTests();
