import { prisma } from "../lib/prisma";

async function main() {
  console.log("--- Searching Documents for FINACHI ---");
  const docs = await prisma.document.findMany({
    where: {
      OR: [
        { content: { contains: "FINACHI", mode: "insensitive" } },
        { content: { contains: "TRINITY", mode: "insensitive" } }
      ]
    }
  });

  console.log(`Found ${docs.length} documents:`);
  for (const d of docs) {
    console.log(`\n- Document ID: ${d.id}`);
    console.log(`  Title: ${d.title}`);
    console.log(`  URL: ${d.url}`);
    console.log(`  Content snippet:`);
    console.log(d.content.substring(0, 1000));
    console.log("-----------------------------------------");
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
