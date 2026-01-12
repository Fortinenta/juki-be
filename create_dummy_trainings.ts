import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creating Dummy Training Schedules for the next 7 days...');

  // Helper to add days
  const addDays = (date: Date, d: number) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + d);
    return newDate;
  };

  // Helper to set time
  const setTime = (date: Date, h: number, m: number) => {
    const newDate = new Date(date);
    newDate.setHours(h, m, 0, 0);
    return newDate;
  };

  // Clean up existing DUMMY-WEEK trainings to avoid clutter
  await prisma.training.deleteMany({
    where: {
      batch: {
        startsWith: 'WEEK-',
      },
    },
  });

  const today = new Date();
  const schedules = [];

  // Loop for today + 7 days
  for (let i = 0; i <= 7; i++) {
    const targetDate = addDays(today, i);
    const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Schedule 1: Morning (09:00 - 12:00)
    schedules.push({
      batch: `WEEK-${dateStr}-MORNING`,
      title: `Pelatihan Jurnalistik Pagi - ${dateStr}`,
      startAt: setTime(targetDate, 9, 0),
      endAt: setTime(targetDate, 12, 0),
      location: 'Zoom Meeting Room A',
      journalCode: 'JUKI-SCI',
      mentorName: 'Dr. Morning Expert',
      quota: 50,
    });

    // Schedule 2: Afternoon (13:30 - 16:30)
    schedules.push({
      batch: `WEEK-${dateStr}-AFTERNOON`,
      title: `Pelatihan Jurnalistik Siang - ${dateStr}`,
      startAt: setTime(targetDate, 13, 30),
      endAt: setTime(targetDate, 16, 30),
      location: 'Google Meet Room B',
      journalCode: 'JUKI-TECH',
      mentorName: 'Prof. Afternoon Master',
      quota: 50,
    });
  }

  // Insert all schedules
  for (const schedule of schedules) {
    await prisma.training.create({
      data: schedule,
    });
    console.log(`✅ Created: ${schedule.title}`);
  }

  console.log(`\n🎉 Successfully created ${schedules.length} training schedules!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
