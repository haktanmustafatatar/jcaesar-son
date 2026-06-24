import { prisma } from "../lib/prisma";

async function main() {
  console.log("--- DB Inspection ---");
  const chatbots = await prisma.chatbot.findMany();
  console.log(`Total Chatbots: ${chatbots.length}`);
  chatbots.forEach(c => console.log(`- Chatbot: ${c.name} (${c.id})`));

  const dataSources = await prisma.dataSource.findMany();
  console.log(`\nTotal DataSources: ${dataSources.length}`);
  dataSources.forEach(ds => console.log(`- DataSource: ${ds.name} (${ds.id}), type: ${ds.type}, status: ${ds.status}`));

  const docCount = await prisma.document.count();
  console.log(`\nTotal Documents: ${docCount}`);

  const sampleDocs = await prisma.document.findMany({ take: 10 });
  console.log("\nSample Documents:");
  sampleDocs.forEach(d => {
    console.log(`- Doc: ${d.title} (${d.url}) - Length: ${d.content?.length || 0}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
