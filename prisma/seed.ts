import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TRAINING_STATUS = {
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_WAITING: 'PAYMENT_WAITING',
  PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',

  ADMINISTRATIVE_REQUIRED: 'ADMINISTRATIVE_REQUIRED',
  WAITING_ADMINISTRATIVE: 'WAITING_ADMINISTRATIVE',

  ARTICLE_WAITING: 'ARTICLE_WAITING',
  ARTICLE_VERIFIED: 'ARTICLE_VERIFIED',

  TRAINING_WAITING: 'TRAINING_WAITING',
  TRAINING_VERIFIED: 'TRAINING_VERIFIED',
  TRAINING_RESCHEDULE: 'TRAINING_RESCHEDULE',

  REVIEW_WAITING: 'REVIEW_WAITING',
  REVIEW_VERIFIED: 'REVIEW_VERIFIED',
  REVIEW_REVISION: 'REVIEW_REVISION',

  LOA_WAITING: 'LOA_WAITING',
  LOA_PUBLISHED: 'LOA_PUBLISHED',
};

async function main() {
  console.log('🌱 Seeding database...');

  // Seed LookupStatus
  console.log('Populating LookupStatus...');
  const statuses = [
    { code: TRAINING_STATUS.PAYMENT_REQUIRED, label: 'Payment Required', step: 1 },
    { code: TRAINING_STATUS.PAYMENT_WAITING, label: 'Payment Waiting Verification', step: 1 },
    { code: TRAINING_STATUS.PAYMENT_VERIFIED, label: 'Payment Verified', step: 1 },
    { code: TRAINING_STATUS.ADMINISTRATIVE_REQUIRED, label: 'Administrative Data Required', step: 2 },
    { code: TRAINING_STATUS.WAITING_ADMINISTRATIVE, label: 'Waiting Administrative Verification', step: 2 },
    { code: TRAINING_STATUS.ARTICLE_WAITING, label: 'Article Upload Required', step: 3 },
    { code: TRAINING_STATUS.ARTICLE_VERIFIED, label: 'Article Verified', step: 3 },
    { code: TRAINING_STATUS.TRAINING_WAITING, label: 'Waiting for Training', step: 4 },
    { code: TRAINING_STATUS.TRAINING_VERIFIED, label: 'Training Completed', step: 4 },
    { code: TRAINING_STATUS.TRAINING_RESCHEDULE, label: 'Training Rescheduled', step: 4 },
    { code: TRAINING_STATUS.REVIEW_WAITING, label: 'Review Required', step: 5 },
    { code: TRAINING_STATUS.REVIEW_VERIFIED, label: 'Review Verified', step: 5 },
    { code: TRAINING_STATUS.REVIEW_REVISION, label: 'Revision Required', step: 5 },
    { code: TRAINING_STATUS.LOA_WAITING, label: 'Waiting for LoA', step: 6 },
    { code: TRAINING_STATUS.LOA_PUBLISHED, label: 'LoA Published', step: 6 },
  ];

  for (const status of statuses) {
    await prisma.lookupStatus.upsert({
      where: { code: status.code },
      update: {},
      create: {
        code: status.code,
        label: status.label,
        step: status.step,
      },
    });
  }
  console.log('✅ LookupStatus seeded');


  // Create Super Admin
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@juki.com' },
    update: {},
    create: {
      email: 'superadmin@juki.com',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      profile: {
        create: {
          fullName: 'Super Admin',
          nim: 'ADMIN000',
          phone: '08000000000',
          birthPlace: 'System',
          birthDate: new Date('2000-01-01'),
          gender: 'MALE',
        },
      },
    },
  });

  console.log('✅ Created Super Admin:', superAdmin.email);

  // Create Admin
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@juki.com' },
    update: {},
    create: {
      email: 'admin@juki.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      profile: {
        create: {
          fullName: 'Admin User',
          nim: 'ADMIN001',
          phone: '08111111111',
          birthPlace: 'Jakarta',
          birthDate: new Date('1990-01-01'),
          gender: 'FEMALE',
        },
      },
    },
  });

  console.log('✅ Created Admin:', admin.email);

  // Create Regular User
  const userPassword = await bcrypt.hash('User123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@juki.com' },
    update: {},
    create: {
      email: 'user@juki.com',
      password: userPassword,
      role: 'USER',
      status: 'ACTIVE',
      profile: {
        create: {
          fullName: 'Regular User',
          nim: 'USER001',
          phone: '08222222222',
          birthPlace: 'Bandung',
          birthDate: new Date('1995-05-05'),
          gender: 'MALE',
        },
      },
    },
  });

  // Create Flow for Regular User if not exists
  const existingFlow = await prisma.userTrainingFlow.findUnique({
    where: { userId: user.id },
  });

  if (!existingFlow) {
    await prisma.userTrainingFlow.create({
      data: {
        userId: user.id,
        statusCode: TRAINING_STATUS.PAYMENT_REQUIRED,
      },
    });
    console.log('✅ Created Flow for User');
  }

  console.log('✅ Created User:', user.email);

  console.log('\n Seeding completed successfully!');
  console.log('\n Default Accounts:');
  console.log('Super Admin: superadmin@juki.com / SuperAdmin123!');
  console.log('Admin: admin@juki.com / Admin123!');
  console.log('User: user@juki.com / User123!');
}

main()
  .catch((e) => {
    console.error(' Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });