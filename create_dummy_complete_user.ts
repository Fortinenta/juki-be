
import { PrismaClient, UserRole, AttachmentType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

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

async function createDummyFile(subDir: string, filename: string, content: string): Promise<string> {
  const dirPath = path.join(process.cwd(), 'uploads', subDir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  const filePath = path.join(dirPath, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

const addDays = (date: Date, d: number) => {
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + d);
  return newDate;
};

async function main() {
  console.log('🚀 SEEDING ENHANCED DUMMY USERS WITH FULL PROFILES...');

  const paymentPath = await createDummyFile('payments', 'mock-payment.jpg', 'IMAGE_DATA');
  const loaPath = await createDummyFile('loa', 'mock-loa.pdf', 'PDF_DATA');
  const ktmPath = await createDummyFile('ktm', 'mock-ktm.jpg', 'IMAGE_DATA');
  const articlePath = await createDummyFile('articles', 'mock-article.pdf', 'PDF_DATA');

  const today = new Date();
  await prisma.training.deleteMany({ where: { batch: { startsWith: 'DUMMY-' } } });

  const trainings = [
    { id: 'uuid-past', batch: 'DUMMY-PAST', title: 'Pelatihan Selesai', startAt: addDays(today, -5), endAt: addDays(today, -4), location: 'Zoom', journalCode: 'J1', mentorName: 'Mentor A', quota: 50 },
    { id: 'uuid-future', batch: 'DUMMY-FUTURE', title: 'Pelatihan Depan', startAt: addDays(today, 7), endAt: addDays(today, 8), location: 'Zoom', journalCode: 'J2', mentorName: 'Mentor B', quota: 50 },
    { id: 'uuid-active', batch: 'DUMMY-ACTIVE', title: 'Pelatihan Besok', startAt: addDays(today, 1), endAt: addDays(today, 2), location: 'Aula', journalCode: 'J3', mentorName: 'Mentor C', quota: 50 }
  ];

  for (const t of trainings) await prisma.training.create({ data: t });

  const statusList = Object.values(TRAINING_STATUS);
  const passwordHash = await bcrypt.hash('password123', 10);
  let counter = 1;

  for (const status of statusList) {
    console.log(`Processing status: ${status}`);
    for (let i = 1; i <= 3; i++) {
      const email = `full_${status.toLowerCase()}_${i}@juki.com`;
      const nim = `2024${counter.toString().padStart(4, '0')}`;
      
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) await prisma.user.delete({ where: { id: existing.id } });

      const user = await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role: UserRole.USER,
          status: 'ACTIVE',
          profile: {
            create: {
              fullName: `Peserta ${status} Lengkap ${i}`,
              nim: nim,
              phone: `0812${counter.toString().padStart(8, '0')}`,
              birthPlace: i % 2 === 0 ? 'Surabaya' : 'Jakarta',
              birthDate: new Date('2002-05-15'),
              gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
              faculty: 'Fakultas Teknik',
              major: 'Teknik Komputer',
              studyProgram: 'S1 Sistem Informasi',
              enrollmentYear: 2021,
              ktmPath: ktmPath
            }
          },
          trainingFlow: { create: { statusCode: status } }
        }
      });

      // Attachments for Payment
      if (status !== 'PAYMENT_REQUIRED') {
        await prisma.attachment.create({
          data: { userId: user.id, type: AttachmentType.PAYMENT, filePath: paymentPath, mimeType: 'image/jpeg', originalName: 'bayar.jpg' }
        });
      }

      // Training Selection
      if (['TRAINING_WAITING', 'TRAINING_VERIFIED', 'REVIEW_WAITING', 'REVIEW_VERIFIED', 'REVIEW_REVISION', 'LOA_WAITING', 'LOA_PUBLISHED'].includes(status)) {
        const tId = ['TRAINING_VERIFIED', 'REVIEW_WAITING', 'REVIEW_VERIFIED', 'LOA_WAITING', 'LOA_PUBLISHED'].includes(status) ? trainings[0].id : trainings[1].id;
        await prisma.userTrainingFlow.update({ where: { userId: user.id }, data: { trainingId: tId } });
      }

      // OJS & Articles
      if (status !== 'PAYMENT_REQUIRED' && status !== 'PAYMENT_WAITING' && status !== 'PAYMENT_VERIFIED' && status !== 'ADMINISTRATIVE_REQUIRED') {
        const ojs = await prisma.ojsAccount.create({ data: { username: `ojs_${nim}`, password: 'password', journalCode: 'JUKI_JOURNAL', journalLink: 'http://ojs.juki.com' } });
        await prisma.userTrainingFlow.update({ 
          where: { userId: user.id }, 
          data: { 
            ojsAccountId: ojs.id,
            articleTitle: `Penelitian Unggulan ${status} #${i}`,
            journalCode: 'JUKI_SCI'
          } 
        });
      }

      // LoA
      if (status === 'LOA_PUBLISHED') {
        await prisma.attachment.create({
          data: { userId: user.id, type: AttachmentType.LOA, filePath: loaPath, mimeType: 'application/pdf', originalName: 'LoA.pdf' }
        });
      }

      counter++;
    }
  }
  console.log(`✅ DONE! Created ${counter - 1} users with FULL profiles.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
