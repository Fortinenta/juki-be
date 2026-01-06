
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const trainings = await prisma.training.findMany();
  console.log('Current Time (Server):', new Date().toISOString());
  console.log('Trainings in DB:');
  trainings.forEach(t => {
      console.log(`- Batch: ${t.batch}, Start: ${t.startAt.toISOString()}, Quota: ${t.quota}`);
  });
}

main().finally(() => prisma.$disconnect());
