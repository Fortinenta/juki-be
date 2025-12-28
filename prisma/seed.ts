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

  // --- 1. Lookup Status ---
  console.log('Populating LookupStatus...');
  const statuses = [
    { code: TRAINING_STATUS.PAYMENT_REQUIRED, label: 'Payment Required', step: 1 },
    { code: TRAINING_STATUS.PAYMENT_WAITING, label: 'Payment Waiting Verification', step: 1 },
    { code: TRAINING_STATUS.PAYMENT_VERIFIED, label: 'Payment Verified', step: 1 },
    {
      code: TRAINING_STATUS.ADMINISTRATIVE_REQUIRED,
      label: 'Administrative Data Required',
      step: 2,
    },
    {
      code: TRAINING_STATUS.WAITING_ADMINISTRATIVE,
      label: 'Waiting Administrative Verification',
      step: 2,
    },
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
      create: status,
    });
  }
  console.log('✅ LookupStatus seeded');

  // --- 2. Users ---
  // Create Admins
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 10);
  await prisma.user.upsert({
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

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
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

  // Create Dummy Users
  const userPassword = await bcrypt.hash('User123!', 10);
  const usersData = [
    {
      email: 'user@juki.com',
      name: 'Fresh User',
      nim: 'USER001',
      status: TRAINING_STATUS.PAYMENT_REQUIRED,
    },
    {
      email: 'user2@juki.com',
      name: 'User Juki 2',
      nim: 'USER002',
      status: TRAINING_STATUS.PAYMENT_REQUIRED,
    },
  ];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password: userPassword,
        role: 'USER',
        status: 'ACTIVE',
        profile: {
          create: {
            fullName: u.name,
            nim: u.nim,
            phone: `08${u.nim}`,
            birthPlace: 'Indonesia',
            birthDate: new Date('2000-01-01'),
            gender: 'MALE',
          },
        },
      },
    });

    // Ensure Flow Exists & Update Status
    const existingFlow = await prisma.userTrainingFlow.findUnique({ where: { userId: user.id } });
    if (!existingFlow) {
      await prisma.userTrainingFlow.create({
        data: { userId: user.id, statusCode: u.status },
      });
    } else {
      await prisma.userTrainingFlow.update({
        where: { userId: user.id },
        data: { statusCode: u.status, trainingId: null }, // Reset trainingId for testing
      });
    }
  }
  console.log('✅ Users seeded');

  // --- 3. Training Schedules (HARD RESET) ---
  console.log('Cleaning up old dummy trainings...');
  // Hapus training yang batch-nya dimulai dengan 'BATCH-' agar bersih
  await prisma.training.deleteMany({
    where: {
      batch: {
        startsWith: 'BATCH-',
      },
    },
  });

  console.log('Creating fresh Training Schedules...');
  const today = new Date();

  // Helper to add hours
  const addHours = (date: Date, h: number) => new Date(date.getTime() + h * 60 * 60 * 1000);
  const addDays = (date: Date, d: number) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + d);
    return newDate;
  };

  const trainings = [
    {
      batch: 'BATCH-PAST',
      title: 'Pelatihan Jurnal (Sudah Lewat)',
      startAt: addDays(today, -2), // 2 hari lalu
      endAt: addDays(today, -1),
      location: 'Zoom Meeting',
      journalCode: 'JUKI-VOL1',
      mentorName: 'Dr. Strange',
      quota: 100,
    },
    {
      batch: 'BATCH-TODAY-FUTURE',
      title: 'Pelatihan Jurnal (Hari Ini - Nanti Sore)',
      startAt: addHours(today, 5), // 5 jam dari sekarang (Pasti Future)
      endAt: addHours(today, 8),
      location: 'Google Meet',
      journalCode: 'JUKI-VOL1',
      mentorName: 'Prof. X',
      quota: 50,
    },
    {
      batch: 'BATCH-TOMORROW',
      title: 'Pelatihan Jurnal (Besok)',
      startAt: addDays(today, 1), // Besok
      endAt: addHours(addDays(today, 1), 3),
      location: 'Zoom Meeting',
      journalCode: 'JUKI-VOL2',
      mentorName: 'Tony Stark',
      quota: 50,
    },
    {
      batch: 'BATCH-NEXT-WEEK',
      title: 'Pelatihan Jurnal (Minggu Depan)',
      startAt: addDays(today, 7),
      endAt: addHours(addDays(today, 7), 4),
      location: 'Offline - Aula Utama',
      journalCode: 'JUKI-VOL2',
      mentorName: 'Bruce Banner',
      quota: 200,
    },
    {
      batch: 'BATCH-FULL-QUOTA',
      title: 'Pelatihan Jurnal (Penuh)',
      startAt: addDays(today, 2),
      endAt: addHours(addDays(today, 2), 2),
      location: 'Small Room',
      journalCode: 'JUKI-VOL3',
      mentorName: 'Full Man',
      quota: 0, // Kuota habis
    },
  ];

  for (const t of trainings) {
    await prisma.training.create({ data: t });
  }
  console.log(`✅ Created ${trainings.length} Fresh Training Schedules`);

  // --- 4. System Configs ---
  console.log('Seeding System Configs...');
  const configs = [
    { key: 'payment_bank_name', value: 'Bank BRI', description: 'Nama Bank Tujuan Pembayaran' },
    {
      key: 'payment_account_number',
      value: '1234-5678-9000-0000',
      description: 'Nomor Rekening Tujuan',
    },
    {
      key: 'payment_account_name',
      value: 'Yayasan Jurnal Kita',
      description: 'Nama Pemilik Rekening',
    },
    { key: 'payment_amount', value: '150000', description: 'Nominal Pembayaran Pelatihan' },
    {
      key: 'admin_form_link',
      value: 'https://forms.google.com/sample-form-link',
      description: 'Link Google Form Administratif',
    },
  ];

  for (const c of configs) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: {},
      create: c,
    });
  }
  console.log('✅ System Configs seeded');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
