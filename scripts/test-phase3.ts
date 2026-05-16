import { prisma } from "../lib/prisma";
import { checkPlanLimits, canAccessFeature } from "../lib/plan-guard";

async function runTests() {
  console.log("🔍 Starting Phase 3: SaaS Lifestyle Tests...");
  
  // 1. Find a test chatbot with an organization/plan
  const chatbot = await prisma.chatbot.findFirst({
    include: { organization: { include: { plan: true } } }
  });

  if (!chatbot || !chatbot.organization) {
    console.log("⚠️ No chatbot with organization found. Skipping limit tests.");
  } else {
    console.log(`🤖 Testing for Chatbot: ${chatbot.name} (Plan: ${chatbot.organization.plan.name})`);

    // 2. Test Plan Limits Logic
    const limitCheck = await checkPlanLimits(chatbot.id);
    console.log("✅ Plan Limits Check:", limitCheck);

    // 3. Test Feature Access Logic
    const whatsappAccess = await canAccessFeature(chatbot.id, "whatsapp");
    const brandingAccess = await canAccessFeature(chatbot.id, "branding");
    
    console.log(`✅ WhatsApp Access: ${whatsappAccess}`);
    console.log(`✅ Branding Access: ${brandingAccess}`);

    if (chatbot.organization.plan.slug === "starter") {
      if (!whatsappAccess) console.log("✔️ Correct: Starter plan cannot access WhatsApp.");
      else console.error("❌ Error: Starter plan should NOT access WhatsApp.");
    }
  }

  console.log("\n🚀 PHASE 3 VERIFICATION COMPLETE.");
}

runTests();
