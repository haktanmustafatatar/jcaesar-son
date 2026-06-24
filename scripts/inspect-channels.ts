import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const channels = await prisma.channel.findMany({
    where: {
      type: {
        in: ['INSTAGRAM', 'FACEBOOK', 'WHATSAPP']
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });

  for (const c of channels) {
    console.log(`Channel ID: ${c.id}`);
    console.log(`Type: ${c.type}`);
    console.log(`Status: ${c.status}`);
    const config: any = c.config || {};
    console.log(`Config pages: ${config.pages ? JSON.stringify(config.pages, null, 2) : 'none'}`);
    console.log(`Config businesses: ${config.businesses ? JSON.stringify(config.businesses, null, 2) : 'none'}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
