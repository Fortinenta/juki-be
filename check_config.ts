
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.systemConfig.findMany();
  console.log('System Configs in DB:', configs);
}

main().finally(() => prisma.$disconnect());
