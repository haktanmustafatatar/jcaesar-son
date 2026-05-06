import { NeuralIndexer } from "../lib/crawler/indexer";
import { prisma } from "../lib/prisma";

async function testIndexing() {
  console.log("--- JCaesar Indexing Test ---");
  
  // 1. Create a dummy chatbot for testing
  const bot = await prisma.chatbot.create({
    data: {
      name: "Test Index Bot",
      slug: `test-index-${Date.now()}`,
      userId: "cmoeaw19i0000r2ykm1jyz0j9", 
      systemPrompt: "Test bot",
    }
  });

  console.log(`Created test bot: ${bot.id}`);

  // 2. Index some manual text
  const testContent = "The secret code for this test is 'APPLEPIE'. This information is stored in the neural index.";
  
  console.log("Indexing test content...");
  const count = await NeuralIndexer.indexContent({
    content: testContent,
    title: "Test Manual Index",
    chatbotId: bot.id,
    metadata: { test: true }
  });

  console.log(`Successfully indexed ${count} chunks.`);

  // 3. Verify in DB
  const doc = await prisma.document.findFirst({
    where: { 
      content: { contains: "APPLEPIE" }
    }
  });

  if (doc) {
    console.log("SUCCESS: Document found in DB!");
    // We can't easily check the vector value via Prisma findFirst because it's Unsupported,
    // but the fact that the row exists means the Raw SQL insertion worked.
  } else {
    console.log("FAILURE: Document not found in DB.");
  }

  // Cleanup if desired
  // await prisma.chatbot.delete({ where: { id: bot.id } });
}

testIndexing().catch(console.error);
