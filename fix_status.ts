import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const status = await prisma.lookupStatus.upsert({
    where: { code: 'ADMINISTRATIVE_REJECTED' },
    update: {},
    create: {
      code: 'ADMINISTRATIVE_REJECTED',
      label: 'Administrasi Ditolak',
      step: 2,
      description: 'Peserta harus memperbaiki data administrasi',
      isActive: true,
    },
  });
  console.log('Status added:', status);
  await prisma.$disconnect();
}
main();