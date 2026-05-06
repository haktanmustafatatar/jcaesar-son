import { crawlWebsite } from "../lib/crawler";
import { prisma } from "../lib/prisma";

async function testCrawl() {
  console.log("--- JCaesar Website Crawl Test ---");
  const targetUrl = "https://jcaesars.com";
  
  // 1. Get or create a test bot
  let bot = await prisma.chatbot.findFirst({
    where: { name: "Crawl Test Bot" }
  });

  if (!bot) {
    bot = await prisma.chatbot.create({
      data: {
        name: "Crawl Test Bot",
        slug: `crawl-test-${Date.now()}`,
        userId: "cmoeaw19i0000r2ykm1jyz0j9", // Existing test user
        systemPrompt: "You are an expert on JCaesar.",
      }
    });
  }

  console.log(`Using bot: ${bot.id} (${bot.name})`);

  // 2. Create a DataSource
  const dataSource = await prisma.dataSource.create({
    data: {
      chatbotId: bot.id,
      name: "JCaesar Website",
      type: "WEBSITE",
      url: targetUrl,
      status: "PENDING"
    }
  });

  console.log(`DataSource created: ${dataSource.id}. Starting crawl...`);

  // 3. Trigger Crawl
  try {
    const result = await crawlWebsite({
      url: targetUrl,
      maxDepth: 1, // Only 1 depth for testing
      limit: 5,    // Only 5 pages for testing
      chatbotId: bot.id,
      dataSourceId: dataSource.id
    });

    console.log("Crawl Result:", result);

    // 4. Verify in DB
    const docCount = await prisma.document.count({
      where: { dataSourceId: dataSource.id }
    });

    console.log(`SUCCESS: Found ${docCount} document chunks in DB for this crawl.`);
  } catch (err) {
    console.error("Crawl failed:", err);
  }
}

testCrawl().catch(console.error);
