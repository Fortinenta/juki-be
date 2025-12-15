import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

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
          firstName: 'Super',
          lastName: 'Admin',
          bio: 'System Administrator',
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
          firstName: 'Admin',
          lastName: 'User',
          bio: 'Administrator',
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
          firstName: 'Regular',
          lastName: 'User',
          bio: 'Just a regular user',
        },
      },
    },
  });

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
