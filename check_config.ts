import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const configCount = await prisma.systemConfig.count();
  
  console.log('User Count:', userCount);
  console.log('Config Count:', configCount);
  
  if (configCount > 0) {
      const configs = await prisma.systemConfig.findMany();
      console.log('Configs:', configs);
  }
}

main().finally(() => prisma.$disconnect());
