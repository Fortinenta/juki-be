import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const status = await prisma.lookupStatus.findUnique({
    where: { code: 'ADMINISTRATIVE_REJECTED' },
  });
  console.log('Status ADMINISTRATIVE_REJECTED:', status ? 'FOUND' : 'NOT FOUND');

  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true, email: true, role: true },
  });
  console.log('Admin Users in DB:', adminUsers);

  const allStatus = await prisma.lookupStatus.findMany({
    select: { code: true }
  });
  console.log('All Status Codes:', allStatus.map(s => s.code));

  await prisma.$disconnect();
}

check();
